const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const {
  cleanString,
  normalizeEmail,
  normalizePhone,
  isStrongPassword
} = require('../utils/validators');
const { jwtSecret, jwtExpiresIn, loginRateLimitMax, rateLimitWindowMs } = require('../config/env');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' }
});

function signUser(user) {
  const safeUser = user.toSafeJson();
  const token = jwt.sign(safeUser, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user: safeUser };
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.name === 'MongoServerError');
}

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }

  const user = await User.findOne({ username, isActive: true }).select('+passwordHash');

  if (!user) {
    return res.status(401).json({ message: 'Username atau password salah.' });
  }

  const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordIsValid) {
    return res.status(401).json({ message: 'Username atau password salah.' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  return res.json(signUser(user));
}));

router.post('/register', loginLimiter, asyncHandler(async (req, res) => {
  const fullName = cleanString(req.body.full_name, 120);
  const username = cleanString(req.body.username, 60).toLowerCase();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const defaultAddress = cleanString(req.body.address, 500);
  const password = String(req.body.password || '');

  if (!fullName || !username || !email || !phone || !password) {
    return res.status(400).json({ message: 'Nama, username, email, nomor HP, dan password wajib diisi dengan benar.' });
  }

  if (!/^[a-z0-9._-]{4,60}$/.test(username)) {
    return res.status(400).json({ message: 'Username hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau strip. Minimal 4 karakter.' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'Password minimal 10 karakter serta berisi huruf besar, huruf kecil, dan angka.' });
  }

  const tenant = await Tenant.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (!tenant) {
    return res.status(503).json({ message: 'Bisnis belum dikonfigurasi. Jalankan seed atau buat tenant terlebih dahulu.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      tenant: tenant._id,
      branch: null,
      role: 'customer',
      fullName,
      username,
      email,
      phone,
      defaultAddress,
      passwordHash,
      isActive: true,
      lastLoginAt: new Date()
    });

    return res.status(201).json({ message: 'Akun customer berhasil dibuat.', ...signUser(user) });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'Username atau email sudah digunakan.' });
    }
    throw err;
  }
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
}));

module.exports = router;
