const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const Tenant = require('../models/Tenant');
const SupportMessage = require('../models/SupportMessage');
const asyncHandler = require('../utils/asyncHandler');
const { cleanString, normalizePhone, isObjectId } = require('../utils/validators');
const { jwtSecret } = require('../config/env');

const router = express.Router();

async function getDefaultTenant() {
  const tenant = await Tenant.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (!tenant) {
    const err = new Error('Bisnis belum dikonfigurasi.');
    err.statusCode = 503;
    throw err;
  }
  return tenant;
}

function optionalUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], jwtSecret);
  } catch (_err) {
    return null;
  }
}

function mapMessage(row) {
  return {
    id: String(row._id),
    name: row.name,
    phone: row.phone || '',
    source: row.source,
    message: row.message,
    status: row.status,
    reply: row.reply || '',
    handled_by: row.handledBy?.fullName || row.handledBy?.username || null,
    handled_at: row.handledAt,
    created_at: row.createdAt
  };
}

router.post('/messages', asyncHandler(async (req, res) => {
  const loggedUser = optionalUser(req);
  const defaultTenant = await getDefaultTenant();
  const tenantId = loggedUser?.tenant_id || String(defaultTenant._id);
  const name = cleanString(req.body.name || loggedUser?.full_name || loggedUser?.username, 120);
  const phone = normalizePhone(req.body.phone || loggedUser?.phone || '');
  const message = cleanString(req.body.message, 1000);
  const source = cleanString(req.body.source || 'sales_web', 50);

  if (!name || !message) {
    return res.status(400).json({ message: 'Nama dan pesan wajib diisi.' });
  }

  const row = await SupportMessage.create({
    tenant: tenantId,
    customer: loggedUser?.role === 'customer' && isObjectId(loggedUser.id) ? loggedUser.id : null,
    name,
    phone,
    source,
    message,
    status: 'open'
  });

  return res.status(201).json({ message: 'Pesan customer service berhasil dikirim.', data: mapMessage(row) });
}));

router.get('/messages', auth, allowRoles('owner', 'executive', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const rows = await SupportMessage.find({ tenant: req.user.tenant_id })
    .populate('handledBy', 'fullName username')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return res.json(rows.map(mapMessage));
}));

router.patch('/messages/:id', auth, allowRoles('owner', 'executive', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const status = cleanString(req.body.status || 'replied', 20).toLowerCase();
  const reply = cleanString(req.body.reply, 1000);
  if (!['open', 'replied', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'Status customer service tidak valid.' });
  }

  const update = {
    status,
    reply,
    handledBy: req.user.id,
    handledAt: new Date()
  };

  const row = await SupportMessage.findOneAndUpdate(
    { _id: req.params.id, tenant: req.user.tenant_id },
    update,
    { new: true }
  ).populate('handledBy', 'fullName username');

  if (!row) {
    return res.status(404).json({ message: 'Pesan customer service tidak ditemukan.' });
  }

  return res.json({ message: 'Pesan customer service diperbarui.', data: mapMessage(row) });
}));

module.exports = router;
