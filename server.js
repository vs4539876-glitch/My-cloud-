const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Static files (HTML, CSS, JS) serve karne ke liye
app.use(express.static(path.join(__dirname)));

// In-memory OTP storage (Temporary storage for verification)
const otpStorage = {};

// Transporter for Real Branded Email OTP (Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vs4539876@gmail.com',
        pass: 'yahan_apna_gmail_app_password_dalein' // Apna Gmail App Password yahan rakhein
    }
});

// Root Route - Jo Vercel par khulne par seedha index.html dikhayega
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API: Send OTP
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStorage[email] = otp;

    const mailOptions = {
        from: '"MyCloud Security" <vs4539876@gmail.com>',
        to: email,
        subject: 'MyCloud Security - Password Reset OTP',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 10px;">
                <h2 style="color: #3b82f6;">MyCloud Security Verification</h2>
                <p>Your 4-digit password reset OTP code is:</p>
                <h1 style="background: #18181b; padding: 10px 20px; display: inline-block; letter-spacing: 5px; color: #10b981; border-radius: 8px;">${otp}</h1>
                <p style="font-size: 12px; color: #a1a1aa;">This code is valid for 90 seconds. Do not share it with anyone.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Email send error:", error);
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

// API: Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpStorage[email] && otpStorage[email] === otp) {
        delete otpStorage[email]; // OTP verify hone ke baad delete kar do
        res.json({ success: true, message: "OTP verified successfully" });
    } else {
        res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
