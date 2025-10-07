// stub - replace with Twilio/MSG91 integration
async function sendSmsPlain(mobile, text) {
  console.log(`SMS to ${mobile}: ${text}`);
  return true;
}

module.exports = { sendSmsPlain };
