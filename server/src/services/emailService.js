const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const { renderEmailTemplate } = require("./emailTemplates");

const provider = process.env.EMAIL_PROVIDER || "smtp";
const fromAddress = process.env.EMAIL_FROM || "no-reply@marketplace.example.com";

if (provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const createSmtpTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing for email provider");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, templateName, variables = {} }) => {
  const html = renderEmailTemplate(templateName, variables);
  if (!to) throw new Error("Email recipient is required");

  if (provider === "sendgrid") {
    const msg = {
      to,
      from: fromAddress,
      subject,
      html,
    };
    const result = await sgMail.send(msg);
    return { provider: "sendgrid", response: result };
  }

  const transport = createSmtpTransport();
  const result = await transport.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
  });
  return { provider: "smtp", response: result };
};

module.exports = {
  sendEmail,
};
