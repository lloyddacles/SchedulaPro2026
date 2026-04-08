import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a generic stylized email
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
    const mailOptions = {
        from: `"SchedulaPro" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a stylized OTP email to the user
 */
export const sendOTPEmail = async (email: string, otp: string) => {
    return sendEmail(
        email, 
        'Your Password Recovery OTP', 
        `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 24px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #3b82f6; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SchedulaPro</h1>
                    <p style="color: #64748b; font-size: 14px; font-weight: 600;">Secure Identity Service</p>
                </div>
                <div style="background-color: #f8fafc; padding: 40px; border-radius: 20px; text-align: center;">
                    <p style="color: #475569; font-size: 16px; margin-bottom: 10px;">Your One-Time Password (OTP) for account recovery is:</p>
                    <h2 style="color: #1e293b; font-size: 40px; font-weight: 900; letter-spacing: 8px; margin: 0; padding: 10px 0;">${otp}</h2>
                    <p style="color: #ef4444; font-size: 12px; font-weight: 600; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">Expires in 15 minutes</p>
                </div>
                <div style="margin-top: 40px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.6;"> If you did not request this code, please ignore this email or contact your system administrator if you suspect unauthorized access.</p>
                    <div style="height: 1px; background-color: #f1f5f9; margin: 20px 0;"></div>
                    <p style="color: #cbd5e1; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SchedulaPro © 2026 · Institutional Node</p>
                </div>
            </div>
        `
    );
};

export default transporter;
