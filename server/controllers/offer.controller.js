const puppeteer = require('puppeteer');
let PUPPETEER_EXECUTABLE_PATH;

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  // If explicitly defined (via env or PM2), always prefer it
  PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;
} else if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  // For Render or other production hosts (uses bundled Chromium)
  PUPPETEER_EXECUTABLE_PATH = undefined;
} else if (process.env.IS_VPS || process.env.HOSTNAME?.includes('vps')) {
  // For your VPS
  PUPPETEER_EXECUTABLE_PATH = '/snap/bin/chromium';
} else {
  // Local PC fallback
  PUPPETEER_EXECUTABLE_PATH = undefined;
}

module.exports = { PUPPETEER_EXECUTABLE_PATH };

//REPLACED

// Prefer an env-provided executable path (set on your VPS). If not provided, leave undefined so Puppeteer uses its bundled Chromium.

// const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

const Offer = require('../models/Offer.model');
const Candidate = require('../models/Candidate.model');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const Handlebars = require('handlebars');
const nodemailer = require('nodemailer');

const OFFERS_DIR = path.join(__dirname, '..', 'public', 'offers');
console.log("OFFERS_DIR ->",OFFERS_DIR)
mkdirp.sync(OFFERS_DIR); // ensure folder exists

function offerFilename(offerId) {
  return `offer-${offerId}.pdf`;
}

function offerFilepathFromFilename(filename) {
  // sanitize filename to prevent path traversal
  const safe = path.basename(filename);
  return path.join(OFFERS_DIR, safe);
}

function offerFilepath(offerId) {
  return path.join(OFFERS_DIR, offerFilename(offerId));
}

function offerPublicUrl(req, offerIdOrFilename) {
  // If a filename (contains .pdf) is passed, use that; else treat as id and build filename.
  const filename = typeof offerIdOrFilename === 'string' && offerIdOrFilename.toLowerCase().endsWith('.pdf')
    ? path.basename(offerIdOrFilename)
    : offerFilename(offerIdOrFilename);
  return `${req.protocol}://${req.get('host')}/offers/${filename}`;
}

// Load and compile HTML template
const templatePath = path.join(__dirname, '..', 'templates', 'offerTemplate.html');
if (!fs.existsSync(templatePath)) {
  throw new Error('Offer template not found at ' + templatePath);
}
const templateHtml = fs.readFileSync(templatePath, 'utf-8');
const compileTemplate = Handlebars.compile(templateHtml);

async function generatePdfFromHtml(htmlContent, filepath) {
  // Ensure parent folder exists
  mkdirp.sync(path.dirname(filepath));

  // common launch options (we build the final object below)
  const baseLaunchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ],
    timeout: 60000
  };

  // If an executable path is provided, add it — otherwise let Puppeteer choose its bundled Chromium.
  // We'll attempt to launch with executablePath if provided, but if that fails with ENOENT we will retry without it.
  let browser;
  let triedWithExecutablePath = false;

  // Helper to actually launch
  const tryLaunch = async (useExecutablePath) => {
    const launchOptions = { ...baseLaunchOptions };
    if (useExecutablePath && PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = PUPPETEER_EXECUTABLE_PATH;
      triedWithExecutablePath = true;
    }
    console.log('Launching browser. options.executablePath =', launchOptions.executablePath || '(bundled)');
    return await puppeteer.launch(launchOptions);
  };

  try {
    try {
      browser = await tryLaunch(Boolean(PUPPETEER_EXECUTABLE_PATH));
    } catch (err) {
      // If the error looks like 'ENOENT' / missing binary, retry without executablePath.
      const msg = err && err.message ? err.message : String(err);
      console.warn('Initial puppeteer.launch failed:', msg);

      if (triedWithExecutablePath && (msg.includes('ENOENT') || msg.includes('executablePath') || msg.includes('No such file or directory'))) {
        console.warn('ExecutablePath appears invalid. Retrying launch without executablePath so Puppeteer can use its bundled Chromium.');
        // Retry without executablePath
        browser = await tryLaunch(false);
      } else {
        // Not a simple missing-binary error — rethrow for upstream handling.
        throw err;
      }
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Headless');

    // Wait for network idle and a small extra settle time
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForTimeout(300);

    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true,
      timeout: 120000
    });

    console.log('PDF successfully written to', filepath);
  } catch (err) {
    // Produce helpful hints for common issues
    const extra = [];
    const msg = err && err.message ? err.message : String(err);

    if (msg.includes('error while loading shared libraries') || msg.includes('cannot open shared object file')) {
      extra.push('Chromium failed due to missing shared libraries on the system.');
      extra.push('Run: ldd ' + (PUPPETEER_EXECUTABLE_PATH || '<chromium-path>') + ' | grep "not found"  to list missing .so files.');
      extra.push('On Ubuntu/Debian you typically need: libatk1.0-0, libgtk-3-0, libnss3, libx11-6, libxss1, libasound2, fonts-liberation, etc.');
    }
    if (msg.includes('executablePath') || msg.includes('No such file or directory') || msg.includes('ENOENT')) {
      extra.push('Ensure PUPPETEER_EXECUTABLE_PATH (if set) points to an existing chromium binary on the system.');
      extra.push('If you are deploying to Render, do not set PUPPETEER_EXECUTABLE_PATH unless Chromium is installed there; instead allow Puppeteer to use its bundled Chromium.');
    }

    console.error('Failed to generate PDF — puppeteer launch/pdf error:', err);
    if (extra.length) console.error('Hints:', extra.join(' '));
    throw err;
  } finally {
    try {
      if (browser) await browser.close();
    } catch (closeErr) {
      console.warn('Error while closing browser:', closeErr && closeErr.message ? closeErr.message : closeErr);
    }
  }
}


// ======================== CONTROLLERS ========================

// Generate offer
// const generateOffer = async (req, res) => {
//   try {
//     console.log('--- generateOffer called ---');
//     console.log("OFFERS_DIR ->",OFFERS_DIR)
//     const { id } = req.params;
//     const { designation, ctc, joiningDate, notes } = req.body;
//     const userId = req.user && req.user._id;

//     const candidate = await Candidate.findById(id);
//     if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

//     console.log('Candidate found:', candidate.firstName, candidate.lastName);

//     const offer = await Offer.create({
//       candidate: id,
//       createdBy: userId,
//       designation,
//       ctc,
//       joiningDate: joiningDate ? new Date(joiningDate) : undefined,
//       notes,
//       templateName: 'default'
//     });

//     console.log('Offer record created with ID:', offer._id);

//     const htmlContent = compileTemplate({
//       companyName: 'SLOG Solutions PVT. LTD.',
//       candidateName: `${candidate.firstName} ${candidate.lastName}`,
//       position: designation || candidate.Designation,
//       ctc,
//       joiningDate: joiningDate ? new Date(joiningDate).toLocaleDateString() : '',
//       probationMonths: 6,
//       candidate_mobile: candidate.mobile,
//       father_name: candidate.fatherName,
//       aadhaar_masked: candidate.aadhaarNumber
//         ? candidate.aadhaarNumber.slice(-4).padStart(candidate.aadhaarNumber.length, '*')
//         : '',
//       hrName: req.user?.name || 'HR Team',
//       notes,
//       currentYear: new Date().getFullYear()
//     });

//     console.log('Compiled HTML preview (first 500 chars):\n', htmlContent.slice(0, 500));

//     const filepath = offerFilepath(offer._id);
//     if (fs.existsSync(filepath)) {
//       console.log('Existing PDF found, deleting before regeneration:', filepath);
//       fs.unlinkSync(filepath);
//     }

//     await generatePdfFromHtml(htmlContent, filepath);
//     console.log('PDF generated at:', filepath);

//     offer.offerLetterUrl = `/offers/${offerFilename(offer._id)}`;
//     offer.status = 'generated';
//     await offer.save();

//     candidate.status = 'offered';
//     candidate.lastOffer = offer._id;
//     await candidate.save();

//     console.log('Offer and Candidate updated successfully');

//     res.json({ message: 'Offer generated', offer, url: offerPublicUrl(req, offer._id) });
//   } catch (err) {
//     console.error('generateOffer error', err);
//     res.status(500).json({ message: 'Offer generation failed', error: err.message });
//   }
// };
function buildFullAddress(candidate) {
  const permanent = candidate.address?.permanent || {};
  return [
    permanent.line1,
    permanent.line2,
    permanent.city,
    permanent.state,
    permanent.pincode,
  ].filter(Boolean).join(", ");
}

// Generate offer
// const generateOffer = async (req, res) => {
//   try {
//     console.log("--- generateOffer called ---");
//     const { id } = req.params;
//     const { designation, ctc, joiningDate, notes } = req.body;
//     const userId = req.user && req.user._id;

//     const candidate = await Candidate.findById(id);
//     if (!candidate) {
//       return res.status(404).json({ message: "Candidate not found" });
//     }

//     console.log("Candidate found:", candidate.firstName, candidate.lastName);

//     const offer = await Offer.create({
//       candidate: id,
//       createdBy: userId,
//       designation,
//       ctc,
//       joiningDate: joiningDate ? new Date(joiningDate) : undefined,
//       notes,
//       templateName: "default",
//     });

//     console.log("Offer record created with ID:", offer._id);

//     const offerDateObj = new Date();
//     const offerDate = offerDateObj.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "long",
//       year: "numeric",
//     });

//     const joiningDateFormatted = joiningDate
//       ? new Date(joiningDate).toLocaleDateString("en-IN", {
//           day: "2-digit",
//           month: "long",
//           year: "numeric",
//         })
//       : "";

//     const candidate_full_address = buildFullAddress(candidate);

//     const referenceNo = `SLOG/OFF/${String(offer._id).slice(-4).toUpperCase()}`;

//     const htmlContent = compileTemplate({
//       companyName: "SLOG Solutions PVT. LTD.",
//       candidateName: `${candidate.firstName} ${candidate.lastName}`,
//       position: designation || candidate.Designation || "",
//       ctc,
//       joiningDate: joiningDateFormatted,
//       candidate_mobile: candidate.mobile,
//       father_name: candidate.fatherName,
//       candidate_full_address,
//       offerDate,
//       referenceNo,
//       hrName: req.user?.name || "HR Team",
//       notes,
//       currentYear: new Date().getFullYear(),
//     });

//     console.log("Compiled HTML preview (first 500 chars):\n", htmlContent.slice(0, 500));

//     const filepath = offerFilepath(offer._id);
//     if (fs.existsSync(filepath)) {
//       console.log("Existing PDF found, deleting before regeneration:", filepath);
//       fs.unlinkSync(filepath);
//     }

//     await generatePdfFromHtml(htmlContent, filepath);
//     console.log("PDF generated at:", filepath);

//     offer.offerLetterUrl = `/offers/${offerFilename(offer._id)}`;
//     offer.status = "generated";
//     await offer.save();

//     candidate.status = "offered";
//     candidate.lastOffer = offer._id;
//     await candidate.save();

//     console.log("Offer and Candidate updated successfully");

//     res.json({
//       message: "Offer generated",
//       offer,
//       url: offerPublicUrl(req, offer._id),
//     });
//   } catch (err) {
//     console.error("generateOffer error", err);
//     res.status(500).json({ message: "Offer generation failed", error: err.message });
//   }
// };

const generateOffer = async (req, res) => {
  try {
    console.log("--- generateOffer called ---");
    const { id } = req.params;
    const { designation, ctc, joiningDate, notes } = req.body;
    const userId = req.user && req.user._id;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    console.log("Candidate found:", candidate.firstName, candidate.lastName);

    const offer = await Offer.create({
      candidate: id,
      createdBy: userId,
      designation,
      ctc,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      notes,
      templateName: "default",
    });

    console.log("Offer record created with ID:", offer._id);

    const offerDateObj = new Date();
    const offerDate = offerDateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const joiningDateFormatted = joiningDate
      ? new Date(joiningDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";

    const candidate_full_address = buildFullAddress(candidate);

    const referenceNo = `SLOG/OFF/${String(offer._id).slice(-4).toUpperCase()}`;

    // --- NEW: build absolute origin and logo URL for Puppeteer ---
    const origin = `${req.protocol}://${req.get('host')}`; // e.g. http://localhost:5000
    const uploadedLogoUrl = `${origin}/static/template-images/slog-red-logo.jpg`;
    const baseUrl = origin; // optional: used by template to render <base href="...">

    // Compile template and pass uploadedLogoUrl + baseUrl
    let htmlContent = compileTemplate({
      baseUrl,
      uploadedLogoUrl,
      companyName: "SLOG Solutions PVT. LTD.",
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      position: designation || candidate.Designation || "",
      ctc,
      joiningDate: joiningDateFormatted,
      candidate_mobile: candidate.mobile,
      father_name: candidate.fatherName,
      candidate_full_address,
      offerDate,
      referenceNo,
      hrName: req.user?.name || "HR Team",
      notes,
      currentYear: new Date().getFullYear(),
    });

    // Safety: if template forgot to include a <base> tag, inject one so root-relative URLs resolve
    if (!/\<base\s+href=/i.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        /<head(\s*[^>]*)>/i,
        `<head$1>\n<base href="${origin}">`
      );
    }

    console.log("Compiled HTML preview (first 500 chars):\n", htmlContent.slice(0, 500));

    const filepath = offerFilepath(offer._id);
    if (fs.existsSync(filepath)) {
      console.log("Existing PDF found, deleting before regeneration:", filepath);
      fs.unlinkSync(filepath);
    }

    await generatePdfFromHtml(htmlContent, filepath);
    console.log("PDF generated at:", filepath);

    offer.offerLetterUrl = `/offers/${offerFilename(offer._id)}`;
    offer.status = "generated";
    await offer.save();

    candidate.status = "offered";
    candidate.lastOffer = offer._id;
    await candidate.save();

    console.log("Offer and Candidate updated successfully");

    res.json({
      message: "Offer generated",
      offer,
      url: offerPublicUrl(req, offer._id),
    });
  } catch (err) {
    console.error("generateOffer error", err);
    res.status(500).json({ message: "Offer generation failed", error: err.message });
  }
};


// Preview offer PDF
const previewOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log('Preview request for offer ID:', offerId);

    // Try to resolve both DB-based offerId and filename cases
    let filepath = offerFilepath(offerId);
    if (!fs.existsSync(filepath)) {
      // maybe offerId is a filename
      filepath = offerFilepathFromFilename(offerId);
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Offer file missing' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filepath)}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (err) {
    console.error('previewOffer error', err);
    res.status(500).json({ message: 'Preview failed' });
  }
};

// Download offer PDF
const downloadOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log('Download request for offer ID:', offerId);

    let filepath = offerFilepath(offerId);
    if (!fs.existsSync(filepath)) {
      filepath = offerFilepathFromFilename(offerId);
    }

    if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'File not found' });
    res.download(filepath, path.basename(filepath));
  } catch (err) {
    console.error('downloadOffer error', err);
    res.status(500).json({ message: 'Download failed' });
  }
};

// Send offer email - supports single email or array of emails
const sendOfferEmail = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { to, toArray, candidateIds, customEmails, subject, message } = req.body;

    console.log('🔹 Send email request for offer ID:', offerId);
    console.log('🔹 Request body:', req.body);

    // Fetch offer from DB
    let offer = null;
    try {
      offer = await Offer.findById(offerId).populate('candidate');
      console.log('🔹 Offer fetched from DB:', offer ? offer._id : 'Not found');
    } catch (dbErr) {
      console.warn('⚠️ Error fetching offer from DB:', dbErr.message);
    }

    // Determine PDF file path
    let filepath = offer ? offerFilepath(offer._id) : offerFilepathFromFilename(offerId);
    console.log('🔹 Initial file path:', filepath);

    if (!fs.existsSync(filepath)) {
      // Try adding .pdf if missing
      if (!filepath.toLowerCase().endsWith('.pdf')) filepath = `${filepath}.pdf`;
      console.log('🔹 Checked file path with .pdf:', filepath);

      if (!fs.existsSync(filepath)) {
        console.error('❌ Offer file missing at path:', filepath);
        return res.status(404).json({ message: 'Offer file missing', filepath });
      }
    }

    // Resolve recipient emails
    let recipientEmails = [];
    const Candidate = require('../models/Candidate.model');

    // Handle different input formats
    if (toArray && Array.isArray(toArray)) {
      // Direct array of emails
      recipientEmails = toArray.filter(email => email && email.includes('@'));
    } else if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      // Resolve candidate IDs to emails
      const candidates = await Candidate.find({ _id: { $in: candidateIds } }).select('email firstName lastName').lean();
      recipientEmails = candidates
        .filter(c => c.email)
        .map(c => c.email);
      console.log(`🔹 Resolved ${candidateIds.length} candidates to ${recipientEmails.length} emails`);
    } else if (customEmails && Array.isArray(customEmails)) {
      // Custom email addresses
      recipientEmails = customEmails.filter(email => email && email.includes('@'));
    } else if (to) {
      // Single email (backward compatibility)
      recipientEmails = [to];
    } else if (offer && offer.candidate && offer.candidate.email) {
      // Fallback to candidate email
      recipientEmails = [offer.candidate.email];
    }

    if (recipientEmails.length === 0) {
      return res.status(400).json({ message: 'No valid recipient emails found' });
    }

    console.log(`🔹 Sending to ${recipientEmails.length} recipient(s):`, recipientEmails);

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // Verify SMTP connection
    transporter.verify((err, success) => {
      if (err) {
        console.error('❌ SMTP verification failed:', err);
      } else {
        console.log('✅ SMTP verified:', success);
      }
    });

    // Read PDF file once
    const pdfAttachment = {
      filename: path.basename(filepath),
      path: filepath,
      contentType: 'application/pdf'
    };

    // Send emails to all recipients
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const email of recipientEmails) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_FROM || 'hr@example.com',
          to: email,
          subject: subject || 'Offer Letter from SLOG Solutions',
          text: message || `Hello,\n\nPlease find attached your offer letter.\n\nRegards,\nHR Team\nSLOG Solutions`,
          attachments: [pdfAttachment],
        };

        const info = await transporter.sendMail(mailOptions);
        successCount++;
        results.push({ email, success: true, messageId: info.messageId });
        console.log(`✅ Email sent successfully to: ${email}`);
      } catch (err) {
        failureCount++;
        results.push({ email, success: false, error: err.message });
        console.error(`❌ Failed to send email to ${email}:`, err.message);
      }
    }

    // Update offer status in DB if at least one email was sent
    if (offer && successCount > 0) {
      offer.status = 'sent';
      await offer.save();
      console.log('🔹 Offer status updated to "sent" in DB');
    }

    res.json({ 
      message: `Email sent to ${successCount} recipient(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      successCount,
      failureCount,
      total: recipientEmails.length,
      results
    });
  } catch (err) {
    console.error('❌ sendOfferEmail error:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};

// ======================= NEW CONTROLLERS =======================

// List all generated offer PDF files from /public/offers
const listOffers = async (req, res) => {
  try {
    console.log("OFFERS_DIR ->",OFFERS_DIR)
    console.log('List all generated PDF offers from /public/offers');

    // Ensure directory exists
    if (!fs.existsSync(OFFERS_DIR)) {
      return res.json({ offers: [] });
    }

    const files = fs.readdirSync(OFFERS_DIR)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(filename => {
        const safe = path.basename(filename);
        const filepath = path.join(OFFERS_DIR, safe);
        let stats;
        try {
          stats = fs.statSync(filepath);
        } catch (e) {
          stats = null;
        }

        return {
          filename: safe,
          url: `${req.protocol}://${req.get('host')}/offers/${safe}`,
          sizeKB: stats ? (stats.size / 1024).toFixed(2) : null,
          createdAt: stats ? stats.birthtime : null,
          modifiedAt: stats ? stats.mtime : null
        };
      })
      .sort((a, b) => {
        // sort by createdAt (newest first), fallback to filename
        if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
        return b.filename.localeCompare(a.filename);
      });

    res.json({ offers: files });
  } catch (err) {
    console.error('listOffers error', err);
    res.status(500).json({ message: 'Failed to list offer PDFs', error: err.message });
  }
};

// Delete offer file from /public/offers (and DB record if found)
// Accepts either a filename (offer-xxx.pdf) or an offerId (UUID/ObjectId) as :offerId
// const deleteOffer = async (req, res) => {
//   try {
//     const { offerId } = req.params;
//     console.log('Delete offer request for identifier:', offerId);

//     // Determine if parameter is a filename (contains .pdf)
//     let isFilename = typeof offerId === 'string' && offerId.toLowerCase().endsWith('.pdf');
//     let filepath;
//     let deletedFile = false;
//     let deletedDb = false;

//     if (isFilename) {
//       // sanitize and build filepath
//       filepath = offerFilepathFromFilename(offerId);
//       if (!fs.existsSync(filepath)) {
//         return res.status(404).json({ message: 'File not found' });
//       }
//       fs.unlinkSync(filepath);
//       console.log('Deleted PDF file (by filename):', filepath);
//       deletedFile = true;

//       // Attempt to find and remove DB record referencing this file (if any)
//       // We look for Offer.offerLetterUrl ending with filename
//       const filename = path.basename(offerId);
//       const offerRecord = await Offer.findOne({ offerLetterUrl: new RegExp(filename + '$') });
//       if (offerRecord) {
//         await offerRecord.remove();
//         console.log('Associated Offer DB record removed for file:', filename);
//         deletedDb = true;
//       }

//       return res.json({ message: 'File deleted', filename: path.basename(filepath), dbRecordDeleted: deletedDb });
//     } else {
//       // treat as offerId (likely DB _id)
//       // build expected filename
//       const expectedFilename = offerFilename(offerId);
//       filepath = offerFilepathFromFilename(expectedFilename);

//       // delete file if exists
//       if (fs.existsSync(filepath)) {
//         fs.unlinkSync(filepath);
//         console.log('Deleted PDF file (by offerId -> filename):', filepath);
//         deletedFile = true;
//       } else {
//         console.log('No PDF file found for offerId at path:', filepath);
//       }

//       // delete DB record if present
//       const offerRecord = await Offer.findById(offerId);
//       if (offerRecord) {
//         await offerRecord.remove();
//         deletedDb = true;
//         console.log('Offer DB record deleted for id:', offerId);
//       }

//       if (!deletedFile && !deletedDb) {
//         return res.status(404).json({ message: 'No file or DB record found for provided identifier' });
//       }

//       return res.json({ message: 'Offer deletion completed', fileDeleted: deletedFile, dbRecordDeleted: deletedDb });
//     }
//   } catch (err) {
//     console.error('deleteOffer error', err);
//     res.status(500).json({ message: 'Failed to delete offer', error: err.message });
//   }
// };


function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const deleteOffer = async (req, res) => {
  try {
    let { offerId } = req.params;
    console.log('Delete offer request raw identifier:', offerId);

    // Decode URI component if encoded by client
    try {
      offerId = decodeURIComponent(offerId);
    } catch (e) {
      // ignore decode errors and fallback to raw
      console.warn('Warning: failed to decode offerId, using raw value');
    }

    // Remove any query string or fragment (e.g. '?v=1' or '#..')
    offerId = (offerId || "").split('?')[0].split('#')[0].trim();

    // If a full URL was accidentally passed, extract the last path segment
    // e.g. https://host/path/offers/offer-abc.pdf -> offer-abc.pdf
    offerId = path.basename(offerId);

    console.log('Normalized offer identifier:', offerId);

    // Determine if parameter is a filename (contains .pdf)
    const lower = String(offerId || "").toLowerCase();
    const isFilename = lower.endsWith('.pdf');

    let filepath;
    let deletedFile = false;
    let deletedDb = false;

    if (isFilename) {
      // sanitize and build filepath
      filepath = offerFilepathFromFilename(offerId); // offerFilepathFromFilename already uses path.basename
      console.log('Resolved filepath for filename:', filepath);

      if (!fs.existsSync(filepath)) {
        console.warn('File not found at path:', filepath);
        return res.status(404).json({ message: 'File not found', filepath });
      }

      // Delete file
      fs.unlinkSync(filepath);
      console.log('Deleted PDF file (by filename):', filepath);
      deletedFile = true;

      // Attempt to find and remove DB record referencing this file (if any)
      const filename = path.basename(offerId);
      // Use escaped regex to avoid injection if filename contains regex chars
      const regex = new RegExp(escapeRegExp(filename) + '$');
      const offerRecord = await Offer.findOne({ offerLetterUrl: regex });

      if (offerRecord) {
        // prefer document.deleteOne() if available; fallback to model.deleteOne()
        if (typeof offerRecord.deleteOne === 'function') {
          await offerRecord.deleteOne();
        } else {
          await Offer.deleteOne({ _id: offerRecord._id });
        }
        console.log('Associated Offer DB record removed for file:', filename);
        deletedDb = true;
      }

      return res.json({ message: 'File deleted', filename: path.basename(filepath), dbRecordDeleted: deletedDb });
    } else {
      // treat as offerId (likely DB _id)
      const expectedFilename = offerFilename(offerId);
      filepath = offerFilepathFromFilename(expectedFilename);

      console.log('Resolved filepath for offerId -> expectedFilename:', expectedFilename, filepath);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('Deleted PDF file (by offerId -> filename):', filepath);
        deletedFile = true;
      } else {
        console.log('No PDF file found for offerId at path:', filepath);
      }

      // delete DB record if present
      const offerRecord = await Offer.findById(offerId);
      if (offerRecord) {
        if (typeof offerRecord.deleteOne === 'function') {
          await offerRecord.deleteOne();
        } else {
          await Offer.deleteOne({ _id: offerRecord._id });
        }
        deletedDb = true;
        console.log('Offer DB record deleted for id:', offerId);
      }

      if (!deletedFile && !deletedDb) {
        return res.status(404).json({ message: 'No file or DB record found for provided identifier' });
      }

      return res.json({ message: 'Offer deletion completed', fileDeleted: deletedFile, dbRecordDeleted: deletedDb });
    }
  } catch (err) {
    console.error('deleteOffer error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Failed to delete offer', error: err?.message || String(err) });
  }
};




module.exports = {
  generateOffer,
  previewOffer,
  downloadOffer,
  sendOfferEmail,
  listOffers,
  deleteOffer
}









