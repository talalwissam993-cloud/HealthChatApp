import nodemailer from "nodemailer";
import { Resend } from 'resend';

export const sendEmailVerification = async (options) => {
  try {
    const data = await resend.emails.send({
      from: 'HealthChat <onboarding@resend.dev>', // Default for testing
      to: options.email,
      subject: options.subject,
      html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2D5AFE;">Health Chat Verification</h2>
                    <p>Hello,</p>
                    <p>Your 6-digit verification code is:</p>
                    <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">
                        ${options.code}
                    </h1>
                    <p>This code will expire in 15 minutes.</p>
                    <hr />
                    <small>If you didn't request this, please ignore this email.</small>
                </div>
            `,
    });

    console.log("Email Sent Successfully:", data);
    return data;
  } catch (error) {
    console.error("Resend API Error:", error);
    throw new Error("Failed to send verification email.");
  }
};
