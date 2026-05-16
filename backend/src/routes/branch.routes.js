const express = require('express');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const Branch = require('../models/Branch');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', auth, allowRoles('owner', 'executive', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const filter = { tenant: req.user.tenant_id, isActive: true };
  if (!['owner', 'executive'].includes(req.user.role)) {
    filter._id = req.user.branch_id;
  }

  const rows = await Branch.find(filter).sort({ name: 1 }).lean();
  return res.json(rows.map((branch) => ({
    id: String(branch._id),
    name: branch.name,
    city: branch.city,
    is_active: branch.isActive
  })));
}));

module.exports = router;
