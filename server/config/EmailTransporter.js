const nodemailer = require("nodemailer");

let transporter = null;

function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const emailTransporter = getEmailTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!emailTransporter || !from) {
    console.log("Email skipped: SMTP is not configured", { to, subject });
    return { skipped: true };
  }

  return emailTransporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}

module.exports = {
  getEmailTransporter,
  sendEmail,
};
