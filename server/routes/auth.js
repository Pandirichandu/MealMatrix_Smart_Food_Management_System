const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// @route   POST api/auth/login
// @desc    Authenticate user & set token in cookie
// @access  Public
// @route   POST api/auth/login
// @desc    Authenticate user & set token in cookie
// @access  Public
// @desc    Authenticate user & set token in cookie
// @access  Public
const AuditLog = require('../models/AuditLog'); // Import AuditLog

// --- FORGOT PASSWORD ROUTES ---

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Security: Return success even if user not found
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (15 minutes)
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Create reset URL
        // NOTE: In production, use process.env.CLIENT_URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        // Note: req.protocol + host might point to API server (5003). 
        // We likely want the Frontend URL (3000). 
        // Assuming localhost:3000 for local dev or env var.
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const link = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `
            You requested a password reset. 
            Please make a PUT request to: \n\n ${link}
        `;

        // LOG FOR DEV (Since SMTP might be missing)
        console.log("------------------------------------------");
        console.log("PASSWORD RESET LINK GENERATED:");
        console.log(link);
        console.log("------------------------------------------");

        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                await transporter.sendMail({
                    from: '"MealMatrix Support" <noreply@mealmatrix.com>',
                    to: user.email,
                    subject: 'Password Reset Token',
                    text: message
                });

                res.json({ success: true, message: 'Email sent' });
            } catch (err) {
                console.error("Email send failed:", err);
                user.resetPasswordToken = undefined;
                user.resetPasswordExpire = undefined;
                await user.save();
                return res.status(500).json({ msg: 'Email could not be sent' });
            }
        } else {
            // If no SMTP, just return success (dev mode log above)
            res.json({ success: true, message: 'Reset link generated (Check Server Console)' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        user.isFirstLogin = false; // Optional: Treat reset as "setup complete"

        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & set token in cookie
// @access  Public
router.post('/login', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get('User-Agent');

    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email }).lean();

        if (!user) {
            // Log Failure (Unknown User) - We don't have an ID, maybe log as generic or skip to avoid spam
            // Ideally we'd log "Attempted Login: <email>" but without a User ID it breaks the schema "performedBy" if required.
            // Requirement said "performedBy required". So we either relax that or create a System System user.
            // For now, let's skip logging invalid emails to avoid DB attacks, OR log as null if schema allows.
            // Schema has `performedBy: { required: true }`. So we can't log without a user.
            // FIX: We will fail silently on log but return error to user.
            // Or we check if encryption mismatch (valid email, wrong pass) -> Log that.
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Log Failed Attempt
            await AuditLog.create({
                action: 'LOGIN_FAILED',
                performedBy: user._id,
                details: { reason: 'Incorrect Password' },
                ipAddress: ip,
                userAgent: ua
            });
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Log Success
        await AuditLog.create({
            action: 'LOGIN_SUCCESS',
            performedBy: user._id,
            details: { role: user.role },
            ipAddress: ip,
            userAgent: ua
        });

        const payload = {
            user: {
                id: user._id,
                role: user.role,
                hostelId: user.hostelId
            }
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Return user info WITHOUT token
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                hostelId: user.hostelId,
                isFirstLogin: user.isFirstLogin
            }
        });

    } catch (err) {
        console.error('[CRITICAL LOGIN ERROR]', err);
        res.status(500).json({ msg: 'Server error', error: err.toString() });
    }
});

// @route   POST api/auth/logout
// @desc    Clear cookie
// @access  Public
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });
    res.json({ msg: 'Logged out successfully' });
});

// @route   GET api/auth/me
// @desc    Get current logged in user (from cookie)
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error('Auth /me error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/change-password
// @desc    Change user password (Secure)
// @access  Private
router.post('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: 'Please provide both current and new passwords' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ msg: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 1. Verify Current Password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect current password' });
        }

        // 2. Update Password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.isFirstLogin = false;
        await user.save();

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/update-profile
// @desc    Update user profile details (Name only for now)
// @access  Private
router.put('/update-profile', auth, async (req, res) => {
    const { name } = req.body;

    try {
        if (!name) {
            return res.status(400).json({ msg: 'Name is required' });
        }

        // Note: We are NOT allowing email updates here to avoid re-verification complexity
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { name } },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
