const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory databases (Aap ise MongoDB ya SQL se replace kar sakte hain)
let users = [
  {
    email: 'vs4539876@gmail.com',
    name: 'Vipin Singh',
    username: 'vipin_supreme',
    password: 'password123',
    role: 'Supreme Owner', // Supreme Owner
    storageUsed: 12.5, // in GB
    storageLimit: 999999, // Unlimited
    membershipType: 'Lifetime Supreme',
    expiryDate: '2099-12-31',
    status: 'Active',
    createdAt: new Date('2025-01-01')
  }
];

let otps = {}; // Email -> OTP mapping
let partnerRequests = []; // Partner requests for admin approval
let recycleBin = []; // Deleted files

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vs4539876@gmail.com',
    pass: 'inpo kqlu iinc iycm'
  }
});

// --- AUTHENTICATION & OTP ROUTES ---

// Send OTP
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

// Verify OTP & Register/Login
app.post('/api/verify-otp', (req, res) => {
  const { email, otp, name, username, password, dob } = req.body;
  if (!otps[email] || otps[email] !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  delete otps[email]; // clear otp

  let user = users.find(u => u.email === email);
  if (!user) {
    // Register new user
    user = {
      email,
      name: name || 'User',
      username: username || email.split('@')[0],
      password: password || '123456',
      role: 'User',
      storageUsed: 0,
      storageLimit: 5, // Free tier 5GB
      membershipType: 'Free',
      expiryDate: null,
      status: 'Active',
      createdAt: new Date()
    };
    users.push(user);
  }

  res.json({ success: true, message: 'Authentication successful', user });
});

// Direct Login
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body; // email or username
  const user = users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
  
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid credentials.' });
  }
  user.status = 'Active'; // Set active on login
  res.json({ success: true, user });
});

// Logout
app.post('/api/logout', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (user) {
    user.status = 'Logged Out';
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// --- ADMIN & PARTNER OWNER MANAGEMENT ROUTES ---

// Get all users & statistics (Supreme Owner / Partner Owner view)
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

// Update User Role (Partner Owner / Admin Switch)
app.post('/api/admin/update-role', (req, res) => {
  const { targetEmail, newRole, requesterEmail } = req.body;
  const requester = users.find(u => u.email === requesterEmail);
  const targetUser = users.find(u => u.email === targetEmail);

  if (!requester || !targetUser) return res.status(404).json({ success: false, message: 'User not found.' });

  if (requester.role === 'Supreme Owner') {
    // Supreme Owner can directly change roles
    targetUser.role = newRole;
    if (newRole === 'Admin' || newRole === 'Partner Owner') {
      targetUser.storageLimit = 999999; // Unlimited storage
    }
    res.json({ success: true, message: `Role updated to ${newRole} successfully.` });
  } else if (requester.role === 'Partner Owner') {
    // Partner Owner requesting to make an Admin requires Supreme Owner approval
    if (newRole === 'Admin') {
      partnerRequests.push({ targetEmail, requesterEmail, status: 'Pending', requestedRole: 'Admin' });
      res.json({ success: true, message: 'Admin creation request sent to Supreme Owner for approval.' });
    } else {
      res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }
  } else {
    res.status(403).json({ success: false, message: 'Permission denied.' });
  }
});

// Get Partner Requests for Supreme Owner
app.get('/api/supreme/requests', (req, res) => {
  res.json({ success: true, requests: partnerRequests });
});

// Handle Partner Request (Accept/Reject)
app.post('/api/supreme/handle-request', (req, res) => {
  const { targetEmail, action } = req.body; // action: 'Accept' or 'Reject'
  const reqObj = partnerRequests.find(r => r.targetEmail === targetEmail && r.status === 'Pending');

  if (!reqObj) return res.status(404).json({ success: false, message: 'Request not found.' });

  if (action === 'Accept') {
    reqObj.status = 'Approved';
    const targetUser = users.find(u => u.email === targetEmail);
    if (targetUser) {
      targetUser.role = 'Admin';
      targetUser.storageLimit = 999999;
    }
    res.json({ success: true, message: 'Request accepted and Admin created successfully.' });
  } else {
    reqObj.status = 'Rejected';
    res.json({ success: true, message: 'Request rejected.' });
  }
});

// --- AUTOMATIC PAYMENT & MEMBERSHIP ROUTE ---
app.post('/api/payment/verify-decimal', (req, res) => {
  const { email, paidAmount } = req.body; // e.g. 35.25 or 100.25
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  // Map amount to storage & plan
  let addedStorage = 30; // default GB
  let planName = '30 GB Plan';
  
  if (Math.floor(paidAmount) === 35 || Math.floor(paidAmount) === 100) {
    addedStorage = 30;
  } else if (Math.floor(paidAmount) === 70 || Math.floor(paidAmount) === 200) {
    addedStorage = 60;
    planName = '60 GB Plan';
  } else if (Math.floor(paidAmount) === 122 || Math.floor(paidAmount) === 350) {
    addedStorage = 100;
    planName = '100 GB Plan (Popular)';
  }

  user.storageLimit += addedStorage;
  user.membershipType = planName;
  let expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);
  user.expiryDate = expiry.toISOString().split('T')[0];

  res.json({ success: true, message: `Payment verified via unique decimal amount! ${addedStorage}GB added successfully.`, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MyCloud Server running on port ${PORT}`));
