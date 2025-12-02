// utils/sms.utils.js (Twilio)
const Twilio = require("twilio");
const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSms(to, body) {
  return client.messages.create({
    from: process.env.TWILIO_FROM,
    to,
    body
  });
}

module.exports = { sendSms };
