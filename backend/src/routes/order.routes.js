const express = require('express');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Branch = require('../models/Branch');
const asyncHandler = require('../utils/asyncHandler');
const { cleanString, toNumber, isObjectId } = require('../utils/validators');

const router = express.Router();

const editableStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

function scopeFilter(user) {
  const filter = { tenant: user.tenant_id };
  if (!['owner', 'executive'].includes(user.role)) {
    filter.branch = user.branch_id;
  }
  return filter;
}

function mapOrder(order) {
  return {
    id: String(order._id),
    order_code: order.orderCode,
    status: order.status,
    sales_channel: order.salesChannel || 'pos',
    fulfillment_method: order.fulfillmentMethod || 'pickup',
    total_amount: order.totalAmount,
    payment_method: order.paymentMethod,
    created_at: order.createdAt,
    branch_name: order.branch?.name || '-',
    customer_name: order.customerName || order.customer?.fullName || '-',
    customer_phone: order.customerPhone || order.customer?.phone || '-',
    customer_address: order.customerAddress || '-',
    notes: order.notes || '',
    items: order.items.map((item) => ({
      menu_id: String(item.menu),
      name: item.name,
      qty: item.qty,
      price: item.price
    }))
  };
}

router.get('/', auth, allowRoles('cashier', 'manager', 'owner', 'executive'), asyncHandler(async (req, res) => {
  const rows = await Order.find(scopeFilter(req.user))
    .populate('branch', 'name city')
    .populate('customer', 'fullName phone')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return res.json(rows.map(mapOrder));
}));

router.post('/', auth, allowRoles('cashier', 'manager', 'owner', 'executive'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const paymentMethod = cleanString(req.body.payment_method || 'cash', 30).toLowerCase();

  if (!items.length) {
    return res.status(400).json({ message: 'Minimal satu item order wajib dipilih.' });
  }

  const branchId = req.user.branch_id || req.body.branch_id;
  if (!branchId || !isObjectId(branchId)) {
    return res.status(400).json({ message: 'Branch tidak valid.' });
  }

  const branch = await Branch.findOne({ _id: branchId, tenant: req.user.tenant_id, isActive: true });
  if (!branch) {
    return res.status(404).json({ message: 'Branch tidak ditemukan atau tidak aktif.' });
  }

  const preparedItems = [];
  let totalAmount = 0;

  for (const raw of items) {
    const menuId = raw.menu_id;
    const qty = toNumber(raw.qty, 0);

    if (!isObjectId(menuId) || qty < 1 || qty > 99) {
      return res.status(400).json({ message: 'Item order tidak valid.' });
    }

    const menu = await MenuItem.findOne({ _id: menuId, tenant: req.user.tenant_id, isActive: true });
    if (!menu) {
      return res.status(404).json({ message: `Menu ${menuId} tidak ditemukan atau tidak aktif.` });
    }

    totalAmount += menu.price * qty;
    preparedItems.push({
      menu: menu._id,
      name: menu.name,
      qty,
      price: menu.price
    });
  }

  const order = await Order.create({
    tenant: req.user.tenant_id,
    branch: branch._id,
    orderCode: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: 'completed',
    salesChannel: 'pos',
    fulfillmentMethod: 'pickup',
    totalAmount,
    paymentMethod,
    items: preparedItems
  });

  return res.status(201).json({
    message: 'Order berhasil dibuat.',
    order_code: order.orderCode,
    total: order.totalAmount
  });
}));

router.patch('/:id/status', auth, allowRoles('cashier', 'manager', 'owner', 'executive'), asyncHandler(async (req, res) => {
  const status = cleanString(req.body.status, 20).toLowerCase();
  if (!editableStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status order tidak valid.' });
  }

  const filter = { _id: req.params.id, ...scopeFilter(req.user) };
  const order = await Order.findOneAndUpdate(filter, { status }, { new: true })
    .populate('branch', 'name city')
    .populate('customer', 'fullName phone');

  if (!order) {
    return res.status(404).json({ message: 'Order tidak ditemukan.' });
  }

  return res.json({ message: 'Status order berhasil diperbarui.', order: mapOrder(order) });
}));

module.exports = router;
