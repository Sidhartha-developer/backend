import transporter from "../config/mailer.js";

export const sendResetEmail = async (to, token) => {
  // this link goes to the React frontend, not the backend
  const link = `${process.env.CLIENT_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from:    `"Scrap Collection" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Password - Scrap Collection",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #1a6b3c;">Password Reset Request</h2>
        <p style="color: #444;">We received a request to reset your password. Click the button below to set a new one.</p>
        <a href="${link}" style="display: inline-block; margin: 20px 0; padding: 12px 28px; background: #1a6b3c; color: white; text-decoration: none; border-radius: 6px; font-size: 15px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

export const sendVendorApprovalEmail = async (to, status) => {
  const isApproved = status === "approved";

  await transporter.sendMail({
    from:    `"Scrap Collection" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Vendor Application ${isApproved ? "Approved ✅" : "Rejected ❌"} - Scrap Collection`,
    html: isApproved
      ? `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #1a6b3c;">You're Approved! 🎉</h2>
          <p style="color: #444;">Your vendor account has been approved. You can now log in and start accepting scrap pickup requests.</p>
          <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; margin: 20px 0; padding: 12px 28px; background: #1a6b3c; color: white; text-decoration: none; border-radius: 6px;">
            Login Now
          </a>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #c0392b;">Application Not Approved</h2>
          <p style="color: #444;">Unfortunately your vendor application was not approved at this time. Please contact support for more details.</p>
        </div>
      `,
  });
};