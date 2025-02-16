const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendNotification(recipient, subject, message) {
  const info = await transporter.sendMail({
    from: 'reliefappemail@gmail.com',
    to: recipient,
    subject,
    html: message
  });
  if(info.accepted.length)return true
  return false
}

module.exports = sendNotification;