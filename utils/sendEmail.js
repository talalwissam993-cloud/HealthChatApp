import nodemailer from "nodemailer";

export const sendEmailVerification = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", 
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD, // Must be 16-digit App Password
    },
    // Add a longer timeout to help Render's slow network
    connectionTimeout: 20000, 
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const mailOptions = {
    from: `"HealthChat" <${process.env.SMTP_MAIL}>`,
    to: options.email,
    subject: options.subject,
    text: `Your HealthChat code is: ${options.code}`,
    html: `<p>Your HealthChat code is: <b>${options.code}</b></p>`,
  };

  return await transporter.sendMail(mailOptions);
};
