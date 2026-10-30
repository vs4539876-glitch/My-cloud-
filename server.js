const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Nodemailer Configuration using your Supreme Owner email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vs4539876@gmail.com',
        pass: 'Aapka_Gmail_App_Password' // Yahan apna Gmail App Password daalein
    }
});

let otpStorage = {};

// Send Branded Email OTP
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStorage[email] = otp;

    const mailOptions = {
        from: '"MyCloud Security" <vs4539876@gmail.com>',
        to: email,
        subject: '🔐 Your MyCloud Password Reset OTP',
        html: `
            <div style="background-color: #000000; color: #ffffff; padding: 30px; font-family: sans-serif; border-radius: 20px; max-width: 400px; margin: auto; border: 1px solid #27272a;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #eab308, #ec4899, #9333ea); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">☁️</div>
                    <h2 style="color: #ffffff; margin-top: 10px; font-size: 20px; letter-spacing: 1px;">MyCloud</h2>
                </div>
                <p style="font-size: 13px; color: #a1a1aa; text-align: center;">You asked to reset your MyCloud password. Use the verification code below:</p>
                <div style="background: #18181b; padding: 15px; border-radius: 12px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; margin: 20px 0; border: 1px solid #27272a;">
                    ${otp}
                </div>
                <p style="font-size: 11px; color: #71717a; text-align: center;">This code is valid for 1.5 minutes (90 seconds). If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ success: false, message: error.toString() });
        }
        res.status(200).json({ success: true, message: 'OTP sent successfully!' });
    });
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpStorage[email] && otpStorage[email] == otp) {
        delete otpStorage[email];
        res.status(200).json({ success: true, message: 'OTP verified!' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP!' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MyCloud Backend running on port ${PORT}`);
});
