const twilio = require('twilio');
const nodemailer = require('nodemailer');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendSMS(to, body) {
  try {
    await client.messages.create({
      body: body,
      from: twilioPhone,
      to: to
    });
    console.log(`SMS enviado a ${to}`);
  } catch (err) {
    console.error('Error enviando SMS:', err);
    throw err;
  }
}

async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text
    });
    console.log(`Email enviado a ${to}`);
  } catch (err) {
    console.error('Error enviando email:', err);
    throw err;
  }
}

module.exports = { sendSMS, sendEmail };