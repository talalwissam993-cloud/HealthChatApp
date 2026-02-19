import nodemailer from "nodemailer";

export const sendEmailVerification = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Using 'service' is more reliable for Gmail than manual host/port
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD, // Must be 16-digit App Password
    },
    pool: true, // Keeps connection open
    maxConnections: 1,
    maxMessages: Infinity,
  });

  const mailOptions = {
    from: `"HealthChat System" <${process.env.SMTP_MAIL}>`,
    to: options.email,
    subject: options.subject || "HealthChat Verification Code",
    text: `Your code is: ${options.code}`, // Plain text fallback
    html: `
      <div style="font-family: Arial; padding: 20px; text-align: center;">
        <h2 style="color: #2D5AFE;">HealthChat Verification</h2>
        <p>Use the code below to activate your account:</p>
        <h1 style="letter-spacing: 5px; color: #1A1C1E;">${options.code}</h1>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email Sent Successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ NODEMAILER DETAILED ERROR:", error);
    throw error;
  }
};
