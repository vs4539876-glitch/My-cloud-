const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Static files (HTML, CSS, JS) serve karne ke liye root folder ka path
app.use(express.static(__dirname));

// ⭐ Root URL par index.html file serve karne ka explicit route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory databases
let users = [
  {
    email: 'vs4539876@gmail.com',
    name: 'Vipin Singh',
    username: 'vipin_supreme',
    password: 'password123',
    role: 'Supreme Owner',
    storageUsed: 12.5,
    storageLimit: 999999,
    membershipType: 'Lifetime Supreme',
    expiryDate: '2099-12-31',
    status: 'Active',
    createdAt: new Date('2025-01-01')
  }
];

let otps = {};
let partnerRequests = [];

// Nodemailer Transporter Setup (Real 16-digit app password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vs4539876@gmail.com',
    pass: 'inpo kqlu iinc iycm'
  }
});

// Send OTP Route
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = otp;

  try {
    await transporter.sendMail({
      from: 'vs4539876@gmail.com',
      to: email,
      subject: 'MyCloud Verification Code',
      text: `Your MyCloud verification code is: ${otp}`
    });
    res.json({ success: true, message: 'OTP sent successfully to your email.' });
  } catch (error) {
    console.error('Mail Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check server configurations.' });
  }
});

// Verify OTP & Register
app.post('/api/verify-otp', (req, res) => {
  const { email, otp, name, username, password } = req.body;
  if (!otps[email] || otps[email] !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  delete otps[email];

  let user = users.find(u => u.email === email);
  if (!user) {
    user = {
      email,
      name: name || 'User',
      username: username || email.split('@')[0],
      password: password || '123456',
      role: 'User',
      storageUsed: 0,
      storageLimit: 5,
      membershipType: 'Free',
      expiryDate: null,
      status: 'Active',
      createdAt: new Date()
    };
    users.push(user);
  }

  res.json({ success: true, message: 'Authentication successful', user });
});

// Direct Login Route
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;
  const user = users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
  
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid credentials.' });
  }
  user.status = 'Active';
  res.json({ success: true, user });
});

// Logout Route
app.post('/api/logout', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (user) {
    user.status = 'Logged Out';
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Admin Stats & Users List
app.get('/api/admin/stats', (req, res) => {
  const now = new Date();
  let newMembersCount = 0;
  let oldMembersCount = 0;
  let loggedOutCount = 0;
  let adminCount = 0;

  users.forEach(u => {
    if (u.role === 'Admin' || u.role === 'Partner Owner') adminCount++;
    if (u.status === 'Logged Out') loggedOutCount++;

    const diffTime = Math.abs(now - new Date(u.createdAt));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      newMembersCount++;
    } else {
      oldMembersCount++;
    }
  });

  res.json({
    success: true,
    stats: {
      totalUsers: users.length,
      newMembers: newMembersCount,
      oldMembers: oldMembersCount,
      loggedOutMembers: loggedOutCount,
      totalAdmins: adminCount
    },
    users
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MyCloud Server running on port ${PORT}`));
