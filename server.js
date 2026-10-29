const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- CONFIGURATIONS & SECRETS ---
const SUPREME_OWNER_EMAIL = "vs4539876@gmail.com";
const UPI_ID = "8865919649@ptsbi";
const UPI_NAME = "Vipin Singh";
const DISCORD_CHANNEL_ID = "1565403174494408788";

// --- MONGODB DATABASE SCHEMA ---
// Users Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['supreme_owner', 'partner_owner', 'admin', 'user'], default: 'user' },
    storageUsed: { type: Number, default: 0 }, // in bytes
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB default for users, -1 for unlimited
    isLocked: { type: Boolean, default: false },
    expiryDate: { type: Date }
});

const User = mongoose.model('User', userSchema);

// Transactions / Payments Schema
const transactionSchema = new mongoose.Schema({
    email: String,
    planName: String,
    amount: Number,
    referenceCode: String,
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// --- API ROUTES ---

// 1. REGISTER / LOGIN ROUTE
app.post('/api/auth', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        let user = await User.findOne({ email });

        // Check if Supreme Owner login/signup
        let assignedRole = 'user';
        if (email === SUPREME_OWNER_EMAIL) {
            assignedRole = 'supreme_owner';
        }

        if (!user) {
            user = new User({
                email,
                password,
                name: name || 'User',
                role: assignedRole,
                storageLimit: (assignedRole === 'supreme_owner' || assignedRole === 'admin') ? -1 : 5 * 1024 * 1024 * 1024
            });
            await user.save();
        } else {
            // Ensure Supreme Owner role is always retained for the master email
            if (email === SUPREME_OWNER_EMAIL && user.role !== 'supreme_owner') {
                user.role = 'supreme_owner';
                user.storageLimit = -1;
                await user.save();
            }
        }

        res.json({ success: true, message: "Authentication successful", user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. GENERATE DYNAMIC UPI PAYMENT INTENT (Auto Amount & Reference Code)
app.post('/api/payment/generate', async (req, res) => {
    try {
        const { email, planType } = req.body; // e.g., '2GB_MONTHLY', '5GB_YEARLY'
        
        let baseAmount = 100;
        if (planType === '4GB_MONTHLY') baseAmount = 200;
        if (planType === '5GB_MONTHLY') baseAmount = 250;
        if (planType === '2GB_YEARLY') baseAmount = 1000;
        if (planType === '4GB_YEARLY') baseAmount = 2250;
        if (planType === '5GB_YEARLY') baseAmount = 2700;

        // Add unique fractional amount decimal to avoid collision (e.g. .45 paisa)
        const randomFraction = (Math.floor(Math.random() * 89) + 10) / 100; // e.g. 0.45
        const finalAmount = (baseAmount + randomFraction).toFixed(2);
        
        // Generate unique reference code
        const refCode = 'CLOUD' + Math.floor(1000 + Math.random() * 9000);

        // Save pending transaction
        await Transaction.create({
            email,
            planName: planType,
            amount: parseFloat(finalAmount),
            referenceCode: refCode
        });

        // UPI Intent Deep Link URL format for auto-filling apps
        const upiIntentUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${finalAmount}&tn=${refCode}&cu=INR`;

        res.json({
            success: true,
            upiId: UPI_ID,
            amount: finalAmount,
            referenceCode: refCode,
            upiIntentUrl,
            qrCodeApi: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiIntentUrl)}`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. ADMIN ROLE MANAGEMENT (Supreme Owner Only)
app.post('/api/admin/set-role', async (req, res) => {
    try {
        const { requesterEmail, targetEmail, newRole } = req.body;
        const requester = await User.findOne({ email: requesterEmail });

        if (!requester || requester.role !== 'supreme_owner') {
            return res.status(403).json({ success: false, message: "Unauthorized! Only Supreme Owner can change roles." });
        }

        const targetUser = await User.findOne({ email: targetEmail });
        if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

        targetUser.role = newRole;
        if (newRole === 'supreme_owner' || newRole === 'admin' || newRole === 'partner_owner') {
            targetUser.storageLimit = -1; // Unlimited storage for privileged roles
        }
        await targetUser.save();

        res.json({ success: true, message: `Successfully updated ${targetEmail} to ${newRole}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Server listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MyCloud Production Server running on port ${PORT}`));
