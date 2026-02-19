import nodemailer from "nodemailer";

export const sendEmailVerification = async (options) => {
  // 1. Create reusable transporter
 const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465, // Use 465 directly
    secure: true, // Use true directly for 465
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  // 2. Define Email Content
  const mailOptions = {
    from: `"HealthChat System" <${process.env.SMTP_MAIL}>`,
    to: options.email,
    subject: options.subject || "HealthChat Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #271776; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; letter-spacing: 2px;">HealthChat</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #333;">Hello,</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You requested a verification code for the <strong>HealthChat System</strong>. 
            Please use the code below to complete your registration.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 30px; background-color: #f4f4f9; border: 2px dashed #271776; border-radius: 5px; font-size: 32px; font-weight: bold; color: #271776; letter-spacing: 5px;">
              ${options.code}
            </span>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            This code will expire in 10 minutes. If you did not request this, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #777; font-size: 12px; margin: 0;">&copy; 2026 HealthChat System | Amman, Jordan</p>
        </div>
      </div>
    `,
  };

  // 3. Send Email with Error Handling
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.email}: ${info.response}`);
    return info;
  } catch (error) {
    // Log the full error but throw a clean message for the client
    console.error("❌ NODEMAILER ERROR:", error.message);
    throw new Error("Email could not be sent. Please check your SMTP settings.");
  }
};
