const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderOfferPdf(templateName, data) {
  const tplPath = path.join(process.cwd(), 'templates', 'offerTemplate.html');
  let html = fs.readFileSync(tplPath, 'utf8');
  Object.keys(data).forEach(k => {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
    html = html.replace(re, data[k] || '');
  });

  const launchOptions = { args: ['--no-sandbox','--disable-setuid-sandbox'] };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm' } });
  await browser.close();
  return pdfBuffer;
}

module.exports = { renderOfferPdf };
