const express = require('express');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');
const { cleanString, toNumber } = require('../utils/validators');

const router = express.Router();

function mapMenu(row) {
  return {
    id: String(row._id),
    tenant_id: String(row.tenant),
    name: row.name,
    category: row.category,
    price: row.price,
    cost_price: row.costPrice,
    description: row.description || '',
    image_url: row.imageUrl || '',
    is_active: row.isActive,
    created_at: row.createdAt
  };
}

router.get('/', auth, allowRoles('owner', 'executive', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const rows = await MenuItem.find({ tenant: req.user.tenant_id }).sort({ createdAt: -1 }).lean();
  return res.json(rows.map((row) => ({
    id: String(row._id),
    tenant_id: String(row.tenant),
    name: row.name,
    category: row.category,
    price: row.price,
    cost_price: row.costPrice,
    description: row.description || '',
    image_url: row.imageUrl || '',
    is_active: row.isActive,
    created_at: row.createdAt
  })));
}));

router.post('/', auth, allowRoles('owner', 'executive', 'manager'), asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, 140);
  const category = cleanString(req.body.category, 80);
  const price = toNumber(req.body.price, -1);
  const costPrice = toNumber(req.body.cost_price, 0);
  const description = cleanString(req.body.description, 240);
  const imageUrl = cleanString(req.body.image_url || req.body.imageUrl, 700);

  if (!name || !category || price < 0 || costPrice < 0) {
    return res.status(400).json({ message: 'Nama, kategori, harga, dan HPP wajib valid.' });
  }

  const item = await MenuItem.create({
    tenant: req.user.tenant_id,
    name,
    category,
    price,
    costPrice,
    description,
    imageUrl,
    isActive: true
  });

  return res.status(201).json({ message: 'Menu berhasil ditambahkan.', item: mapMenu(item) });
}));

router.patch('/:id/status', auth, allowRoles('owner', 'executive', 'manager'), asyncHandler(async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, tenant: req.user.tenant_id },
    { isActive: Boolean(req.body.is_active) },
    { new: true }
  );

  if (!item) {
    return res.status(404).json({ message: 'Menu tidak ditemukan.' });
  }

  return res.json({ message: 'Status menu berhasil diperbarui.', item: mapMenu(item) });
}));

module.exports = router;
