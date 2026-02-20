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
      html: `...your template...`,
    });

    if (error) {
      // This is usually where the "Mail server error" starts.
      // 403 error means you're sending to an unverified email address.
      console.error("RESEND API REJECTION:", {
        message: error.message,
        name: error.name,
        // In some versions, error details are in error.error
      });
      throw new Error(error.message);
    }

    console.log("✅ Resend Response Data:", data);
    return data;

  } catch (err) {
    // If it hits this, it's either a network issue or our custom throw above
    console.error("CRITICAL SMTP/API FAILURE:", err.stack);
    throw err;
  }
};