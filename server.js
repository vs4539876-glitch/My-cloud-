const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let users = [
  {
    email: 'vs4539876@gmail.com',
    name: 'Sanjeev Thakur',
    username: 'sanjeev_supreme',
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
let paymentRequests = [];

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
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
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
      storageLimit: 50,
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
  if (user) user.status = 'Logged Out';
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Submit Payment Screenshot & Request
app.post('/api/submit-payment-request', async (req, res) => {
  const { username, email, planName, storageGB, screenshotData } = req.body;

  paymentRequests.push({
    id: Date.now(),
    username,
    email,
    planName,
    storageGB,
    status: 'Pending'
  });

  try {
    await transporter.sendMail({
      from: 'vs4539876@gmail.com',
      to: 'vs4539876@gmail.com',
      subject: `New Payment Screenshot from @${username}`,
      text: `User @${username} (${email}) has submitted a payment screenshot for plan: ${planName} (${storageGB}GB). Please check your Supreme Owner panel to accept.`,
      attachments: screenshotData ? [{ path: screenshotData }] : []
    });
    res.json({ success: true, message: 'Payment screenshot submitted successfully to Sanjeev Thakur!' });
  } catch (error) {
    console.error('Email error:', error);
    res.json({ success: true, message: 'Request submitted successfully!' });
  }
});

// Get Pending Payment Requests
app.get('/api/admin/payment-requests', (req, res) => {
  res.json({ success: true, requests: paymentRequests });
});

// Accept Payment Request & Start Membership
app.post('/api/admin/accept-payment', (req, res) => {
  const { requestId } = req.body;
  const reqObj = paymentRequests.find(r => r.id === requestId);

  if (!reqObj) return res.status(404).json({ success: false, message: 'Request nahi mili.' });

  const targetUser = users.find(u => u.email === reqObj.email || u.username === reqObj.username);
  if (targetUser) {
    let newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    targetUser.membershipType = reqObj.planName;
    targetUser.storageLimit = reqObj.storageGB;
    targetUser.expiryDate = newExpiry.toISOString();
    targetUser.status = 'Active';
  }

  reqObj.status = 'Accepted';
  res.json({ success: true, message: 'Membership successfully activated for the user!' });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const now = new Date();
  let newMembersCount = 0, oldMembersCount = 0, loggedOutCount = 0, adminCount = 0;

  users.forEach(u => {
    if (u.role === 'Admin' || u.role === 'Partner Owner') adminCount++;
    if (u.status === 'Logged Out') loggedOutCount++;

    const diffDays = Math.ceil(Math.abs(now - new Date(u.createdAt)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) newMembersCount++;
    else oldMembersCount++;
  });

  res.json({
    success: true,
    stats: { totalUsers: users.length, newMembers: newMembersCount, oldMembers: oldMembersCount, loggedOutMembers: loggedOutCount, totalAdmins: adminCount },
    users
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
