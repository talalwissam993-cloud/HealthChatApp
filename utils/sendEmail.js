import { Resend } from 'resend';

// Use your key directly or via process.env.RESEND_API_KEY (recommended for Render)
const resend = new Resend('re_ZYqodTCE_MbtyneFu4pHPhJPKFbZwUyZY');

export const sendEmailVerification = async (options) => {
  try {
    console.log(`Attempting to send OTP to: ${options.email}...`);

    const { data, error } = await resend.emails.send({
      from: 'HealthChat <onboarding@resend.dev>',
      to: [options.email.toLowerCase().trim()], // Clean the email string
      subject: options.subject || "Your HealthChat Verification Code",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                    <h2 style="color: #2D5AFE; text-align: center;">Health Chat Verification</h2>
                    <p style="font-size: 16px; color: #333;">Welcome to Health Chat. Please use the code below to verify your identity and activate your account:</p>
                    <div style="background: #f8fafc; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1A1C1E;">
                            ${options.code}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #64748B;">This code is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94A3B8; text-align: center;">© 2026 Health Chat Jordan. All rights reserved.</p>
                </div>
            `,
    });

    if (error) {
      console.error("RESEND API REJECTION:", {
        message: error.message,
        name: error.name,
      });
      throw new Error(error.message);
    }

    console.log("✅ OTP Email successfully sent to:", options.email);
    return data;

  } catch (err) {
    console.error("CRITICAL SMTP/API FAILURE:", err.stack);
    throw new Error("Could not send verification email.");
  }
};
