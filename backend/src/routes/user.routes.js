const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const User = require('../models/User');
const Branch = require('../models/Branch');
const asyncHandler = require('../utils/asyncHandler');
const { cleanString, isObjectId, isStrongPassword } = require('../utils/validators');

const router = express.Router();

function canCreateRole(actorRole, newRole) {
  return actorRole === 'owner' && ['manager', 'cashier', 'executive'].includes(newRole);
}

function mapUser(user) {
  return {
    id: String(user._id),
    full_name: user.fullName,
    username: user.username,
    role: user.role,
    branch_id: user.branch ? String(user.branch._id || user.branch) : null,
    branch_name: user.branch?.name || '-',
    is_active: user.isActive,
    last_login_at: user.lastLoginAt,
    created_at: user.createdAt
  };
}

router.get('/', auth, allowRoles('owner'), asyncHandler(async (req, res) => {
  const filter = { tenant: req.user.tenant_id, role: { $ne: 'customer' } };
  if (req.user.role === 'manager') {
    filter.branch = req.user.branch_id;
    filter.role = 'cashier';
  }

  const rows = await User.find(filter).populate('branch', 'name city').sort({ createdAt: -1 }).lean();
  return res.json(rows.map(mapUser));
}));

router.post('/', auth, allowRoles('owner'), asyncHandler(async (req, res) => {
  const fullName = cleanString(req.body.full_name, 120);
  const username = cleanString(req.body.username, 60).toLowerCase();
  const password = String(req.body.password || '');
  const role = cleanString(req.body.role, 30).toLowerCase();
  const branchId = req.user.role === 'manager' ? req.user.branch_id : req.body.branch_id;

  if (!fullName || !username || !password || !role) {
    return res.status(400).json({ message: 'Nama, username, role, dan password wajib diisi.' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'Password minimal 10 karakter serta berisi huruf besar, huruf kecil, dan angka.' });
  }

  if (!canCreateRole(req.user.role, role)) {
    return res.status(403).json({ message: 'Role tersebut tidak boleh dibuat oleh akun ini.' });
  }

  let branch = null;
  if (['manager', 'cashier'].includes(role)) {
    if (!isObjectId(branchId)) {
      return res.status(400).json({ message: 'Branch wajib dipilih untuk manager dan cashier.' });
    }

    branch = await Branch.findOne({ _id: branchId, tenant: req.user.tenant_id, isActive: true });
    if (!branch) {
      return res.status(404).json({ message: 'Branch tidak ditemukan.' });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    tenant: req.user.tenant_id,
    branch: branch?._id || null,
    role,
    fullName,
    username,
    passwordHash,
    isActive: true
  });

  return res.status(201).json({ message: 'User berhasil dibuat.', user: mapUser(user) });
}));

router.patch('/:id/status', auth, allowRoles('owner'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, tenant: req.user.tenant_id };
  if (req.user.role === 'manager') {
    filter.branch = req.user.branch_id;
    filter.role = 'cashier';
  }

  const user = await User.findOneAndUpdate(filter, { isActive: Boolean(req.body.is_active) }, { new: true });
  if (!user) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }

  return res.json({ message: 'Status user berhasil diperbarui.', user: mapUser(user) });
}));

module.exports = router;
