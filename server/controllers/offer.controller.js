const puppeteer = require('puppeteer');

// Preferred Puppeteer executable path: set via env var in PM2 ecosystem or /etc/environment.
// Example: PUPPETEER_EXECUTABLE_PATH="/snap/bin/chromium"
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/snap/bin/chromium';


// const Offer = require('../models/Offer.model');
// const Candidate = require('../models/Candidate.model');
// const path = require('path');
// const fs = require('fs');
// const mkdirp = require('mkdirp');
// const puppeteer = require('puppeteer');
// const Handlebars = require('handlebars');
// const nodemailer = require('nodemailer');

// const OFFERS_DIR = path.join(__dirname, '..', 'public', 'offers');
// mkdirp.sync(OFFERS_DIR); // ensure folder exists

// function offerFilename(offerId) {
//   return `offer-${offerId}.pdf`;
// }

// function offerFilepath(offerId) {
//   return path.join(OFFERS_DIR, offerFilename(offerId));
// }

// function offerPublicUrl(req, offerId) {
//   return `${req.protocol}://${req.get('host')}/offers/${offerFilename(offerId)}`;
// }

// // Load and compile HTML template
// const templatePath = path.join(__dirname, '..', 'templates', 'offerTemplate.html');
// if (!fs.existsSync(templatePath)) {
//   throw new Error('Offer template not found at ' + templatePath);
// }
// const templateHtml = fs.readFileSync(templatePath, 'utf-8');
// const compileTemplate = Handlebars.compile(templateHtml);

// // Generate PDF using Puppeteer
// async function generatePdfFromHtml(htmlContent, filepath) {
//   const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//   const page = await browser.newPage();
//   await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
//   await page.pdf({ path: filepath, format: 'A4', printBackground: true });
//   await browser.close();
// }

// // ======================== CONTROLLERS ========================

// // Generate offer
// const generateOffer = async (req, res) => {
//   try {
//     console.log('--- generateOffer called ---');
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

// // Preview offer PDF
// const previewOffer = async (req, res) => {
//   try {
//     const { offerId } = req.params;
//     console.log('Preview request for offer ID:', offerId);

//     const offer = await Offer.findById(offerId).populate('candidate');
//     if (!offer) return res.status(404).json({ message: 'Offer not found' });

//     const filepath = offerFilepath(offer._id);
//     if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'Offer file missing' });

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `inline; filename="${offerFilename(offer._id)}"`);
//     fs.createReadStream(filepath).pipe(res);
//   } catch (err) {
//     console.error('previewOffer error', err);
//     res.status(500).json({ message: 'Preview failed' });
//   }
// };

// // Download offer PDF
// const downloadOffer = async (req, res) => {
//   try {
//     const { offerId } = req.params;
//     console.log('Download request for offer ID:', offerId);

//     const filepath = offerFilepath(offerId);
//     if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'File not found' });
//     res.download(filepath, offerFilename(offerId));
//   } catch (err) {
//     console.error('downloadOffer error', err);
//     res.status(500).json({ message: 'Download failed' });
//   }
// };

// // Send offer email
// const sendOfferEmail = async (req, res) => {
//   try {
//     const { offerId } = req.params;
//     const { to, subject, message } = req.body;

//     console.log('Send email request for offer ID:', offerId);

//     const offer = await Offer.findById(offerId).populate('candidate');
//     if (!offer) return res.status(404).json({ message: 'Offer not found' });

//     const filepath = offerFilepath(offer._id);
//     if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'Offer file missing' });

//     const transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
//       secure: process.env.SMTP_SECURE === 'true',
//       auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_FROM || 'hr@example.com',
//       to: to || offer.candidate.email,
//       subject: subject || `Offer Letter from Company`,
//       text: message || `Please find attached your offer letter.`,
//       attachments: [{ filename: offerFilename(offer._id), path: filepath, contentType: 'application/pdf' }]
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log('Email sent info:', info);

//     offer.status = 'sent';
//     await offer.save();

//     res.json({ message: 'Email sent', info });
//   } catch (err) {
//     console.error('sendOfferEmail error', err);
//     res.status(500).json({ message: 'Failed to send email', error: err.message });
//   }
// };

// // ======================= NEW CONTROLLERS =======================

// // List all generated offers with candidate details
// const listOffers = async (req, res) => {
//   try {
//     console.log('List all offers request');
//     const offers = await Offer.find().populate('candidate').sort({ createdAt: -1 });

//     const formatted = offers.map(o => ({
//       offerId: o._id,
//       candidateName: o.candidate ? `${o.candidate.firstName} ${o.candidate.lastName}` : 'N/A',
//       designation: o.designation,
//       ctc: o.ctc,
//       joiningDate: o.joiningDate,
//       status: o.status,
//       offerLetterUrl: o.offerLetterUrl,
//       createdAt: o.createdAt
//     }));

//     res.json({ offers: formatted });
//   } catch (err) {
//     console.error('listOffers error', err);
//     res.status(500).json({ message: 'Failed to list offers' });
//   }
// };

// // Delete offer (PDF + DB record)
// const deleteOffer = async (req, res) => {
//   try {
//     const { offerId } = req.params;
//     console.log('Delete offer request for ID:', offerId);

//     const offer = await Offer.findById(offerId);
//     if (!offer) return res.status(404).json({ message: 'Offer not found' });

//     const filepath = offerFilepath(offer._id);
//     if (fs.existsSync(filepath)) {
//       fs.unlinkSync(filepath);
//       console.log('PDF file deleted:', filepath);
//     }

//     await offer.remove();
//     console.log('Offer record deleted:', offerId);

//     res.json({ message: 'Offer deleted successfully' });
//   } catch (err) {
//     console.error('deleteOffer error', err);
//     res.status(500).json({ message: 'Failed to delete offer' });
//   }
// };

// module.exports = {
//   generateOffer,
//   previewOffer,
//   downloadOffer,
//   sendOfferEmail,
//   listOffers,
//   deleteOffer
// };


const Offer = require('../models/Offer.model');
const Candidate = require('../models/Candidate.model');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const Handlebars = require('handlebars');
const nodemailer = require('nodemailer');

const OFFERS_DIR = path.join(__dirname, '..', 'public', 'offers');
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

  // Build launch options
  const launchOptions = {
    executablePath: PUPPETEER_EXECUTABLE_PATH, // must exist on system or Puppeteer will attempt bundled chromium
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
    // Give Puppeteer more time to start on loaded servers
    timeout: 60000
  };

  let browser;
  try {
    console.log('Launching browser with executablePath:', launchOptions.executablePath);
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Optional: set a viewport and user agent (helps with some templates)
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Headless');

    // Wait for network idle and a small extra settle time
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForTimeout(300); // small buffer

    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true,
      timeout: 120000
    });

    console.log('PDF successfully written to', filepath);
  } catch (err) {
    // Produce a helpful error message for debugging missing libs or permission issues
    const extra = [];

    // If known common error message parts exist, add hints
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('error while loading shared libraries') || msg.includes('cannot open shared object file')) {
      extra.push('Chromium failed due to missing shared libraries on the system.');
      extra.push('Run: ldd ' + (PUPPETEER_EXECUTABLE_PATH || '<chromium-path>') + ' | grep "not found"  to list missing .so files.');
      extra.push('On Ubuntu/Debian you typically install libraries like libatk1.0-0, libgtk-3-0, libnss3, libx11-6, libxss1, libasound2 etc.');
    }
    if (msg.includes('executablePath') || msg.includes('No such file or directory')) {
      extra.push('Ensure PUPPETEER_EXECUTABLE_PATH points to an existing chromium binary (e.g. /snap/bin/chromium).');
    }

    console.error('Failed to generate PDF — puppeteer launch error:', err);
    if (extra.length) console.error('Hints:', extra.join(' '));

    // throw the original error so upstream handler reports it
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
const generateOffer = async (req, res) => {
  try {
    console.log('--- generateOffer called ---');
    const { id } = req.params;
    const { designation, ctc, joiningDate, notes } = req.body;
    const userId = req.user && req.user._id;

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    console.log('Candidate found:', candidate.firstName, candidate.lastName);

    const offer = await Offer.create({
      candidate: id,
      createdBy: userId,
      designation,
      ctc,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      notes,
      templateName: 'default'
    });

    console.log('Offer record created with ID:', offer._id);

    const htmlContent = compileTemplate({
      companyName: 'SLOG Solutions PVT. LTD.',
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      position: designation || candidate.Designation,
      ctc,
      joiningDate: joiningDate ? new Date(joiningDate).toLocaleDateString() : '',
      probationMonths: 6,
      candidate_mobile: candidate.mobile,
      father_name: candidate.fatherName,
      aadhaar_masked: candidate.aadhaarNumber
        ? candidate.aadhaarNumber.slice(-4).padStart(candidate.aadhaarNumber.length, '*')
        : '',
      hrName: req.user?.name || 'HR Team',
      notes,
      currentYear: new Date().getFullYear()
    });

    console.log('Compiled HTML preview (first 500 chars):\n', htmlContent.slice(0, 500));

    const filepath = offerFilepath(offer._id);
    if (fs.existsSync(filepath)) {
      console.log('Existing PDF found, deleting before regeneration:', filepath);
      fs.unlinkSync(filepath);
    }

    await generatePdfFromHtml(htmlContent, filepath);
    console.log('PDF generated at:', filepath);

    offer.offerLetterUrl = `/offers/${offerFilename(offer._id)}`;
    offer.status = 'generated';
    await offer.save();

    candidate.status = 'offered';
    candidate.lastOffer = offer._id;
    await candidate.save();

    console.log('Offer and Candidate updated successfully');

    res.json({ message: 'Offer generated', offer, url: offerPublicUrl(req, offer._id) });
  } catch (err) {
    console.error('generateOffer error', err);
    res.status(500).json({ message: 'Offer generation failed', error: err.message });
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

// Send offer email
const sendOfferEmail = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { to, subject, message } = req.body;

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

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'hr@example.com',
      to: to || (offer && offer.candidate && offer.candidate.email),
      subject: subject || 'Offer Letter from Company',
      text: message || 'Please find attached your offer letter.',
      attachments: [{ filename: path.basename(filepath), path: filepath, contentType: 'application/pdf' }],
    };

    console.log('🔹 Mail options prepared:', mailOptions);

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info);

    // Update offer status in DB
    if (offer) {
      offer.status = 'sent';
      await offer.save();
      console.log('🔹 Offer status updated to "sent" in DB');
    }

    res.json({ message: 'Email sent successfully', info });
  } catch (err) {
    console.error('❌ sendOfferEmail error:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};

// ======================= NEW CONTROLLERS =======================

// List all generated offer PDF files from /public/offers
const listOffers = async (req, res) => {
  try {
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
const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log('Delete offer request for identifier:', offerId);

    // Determine if parameter is a filename (contains .pdf)
    let isFilename = typeof offerId === 'string' && offerId.toLowerCase().endsWith('.pdf');
    let filepath;
    let deletedFile = false;
    let deletedDb = false;

    if (isFilename) {
      // sanitize and build filepath
      filepath = offerFilepathFromFilename(offerId);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      fs.unlinkSync(filepath);
      console.log('Deleted PDF file (by filename):', filepath);
      deletedFile = true;

      // Attempt to find and remove DB record referencing this file (if any)
      // We look for Offer.offerLetterUrl ending with filename
      const filename = path.basename(offerId);
      const offerRecord = await Offer.findOne({ offerLetterUrl: new RegExp(filename + '$') });
      if (offerRecord) {
        await offerRecord.remove();
        console.log('Associated Offer DB record removed for file:', filename);
        deletedDb = true;
      }

      return res.json({ message: 'File deleted', filename: path.basename(filepath), dbRecordDeleted: deletedDb });
    } else {
      // treat as offerId (likely DB _id)
      // build expected filename
      const expectedFilename = offerFilename(offerId);
      filepath = offerFilepathFromFilename(expectedFilename);

      // delete file if exists
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
        await offerRecord.remove();
        deletedDb = true;
        console.log('Offer DB record deleted for id:', offerId);
      }

      if (!deletedFile && !deletedDb) {
        return res.status(404).json({ message: 'No file or DB record found for provided identifier' });
      }

      return res.json({ message: 'Offer deletion completed', fileDeleted: deletedFile, dbRecordDeleted: deletedDb });
    }
  } catch (err) {
    console.error('deleteOffer error', err);
    res.status(500).json({ message: 'Failed to delete offer', error: err.message });
  }
};

module.exports = {
  generateOffer,
  previewOffer,
  downloadOffer,
  sendOfferEmail,
  listOffers,
  deleteOffer
};
