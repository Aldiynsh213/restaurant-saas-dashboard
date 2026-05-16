const express = require('express');
const auth = require('../middleware/auth');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { cleanString, toNumber, isObjectId } = require('../utils/validators');

const router = express.Router();

function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Checkout hanya dapat dilakukan dengan akun customer.' });
  }
  return next();
}


async function getSalesTenant() {
  const tenant = await Tenant.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (!tenant) {
    const err = new Error('Bisnis belum dikonfigurasi.');
    err.statusCode = 503;
    throw err;
  }
  return tenant;
}

function mapBranch(branch) {
  return {
    id: String(branch._id),
    name: branch.name,
    city: branch.city
  };
}

function mapMenu(item) {
  return {
    id: String(item._id),
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description || '',
    image_url: item.imageUrl || '',
    is_active: item.isActive
  };
}

function mapOrder(order) {
  return {
    id: String(order._id),
    order_code: order.orderCode,
    status: order.status,
    sales_channel: order.salesChannel,
    fulfillment_method: order.fulfillmentMethod,
    total_amount: order.totalAmount,
    payment_method: order.paymentMethod,
    branch_name: order.branch?.name || '-',
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_address: order.customerAddress,
    notes: order.notes,
    created_at: order.createdAt,
    items: order.items.map((item) => ({
      menu_id: String(item.menu),
      name: item.name,
      qty: item.qty,
      price: item.price
    }))
  };
}

router.get('/branches', asyncHandler(async (_req, res) => {
  const tenant = await getSalesTenant();
  const rows = await Branch.find({ tenant: tenant._id, isActive: true }).sort({ name: 1 }).lean();
  return res.json(rows.map(mapBranch));
}));

router.get('/menu', asyncHandler(async (_req, res) => {
  const tenant = await getSalesTenant();
  const rows = await MenuItem.find({ tenant: tenant._id, isActive: true }).sort({ category: 1, name: 1 }).lean();
  return res.json(rows.map(mapMenu));
}));

router.get('/my-orders', auth, requireCustomer, asyncHandler(async (req, res) => {
  const rows = await Order.find({ tenant: req.user.tenant_id, customer: req.user.id })
    .populate('branch', 'name city')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json(rows.map(mapOrder));
}));

router.post('/orders', auth, requireCustomer, asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const branchId = req.body.branch_id;
  const paymentMethod = cleanString(req.body.payment_method || 'cash', 30).toLowerCase();
  const fulfillmentMethod = cleanString(req.body.fulfillment_method || 'pickup', 20).toLowerCase();
  const notes = cleanString(req.body.notes, 500);
  const address = cleanString(req.body.address, 500);

  if (!items.length) {
    return res.status(400).json({ message: 'Keranjang masih kosong.' });
  }

  if (!isObjectId(branchId)) {
    return res.status(400).json({ message: 'Cabang wajib dipilih.' });
  }

  if (!['pickup', 'delivery'].includes(fulfillmentMethod)) {
    return res.status(400).json({ message: 'Metode pemenuhan pesanan tidak valid.' });
  }

  if (!['cash', 'qris', 'transfer', 'debit'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Metode pembayaran tidak valid.' });
  }

  if (fulfillmentMethod === 'delivery' && !address) {
    return res.status(400).json({ message: 'Alamat wajib diisi untuk pesanan delivery.' });
  }

  const customer = await User.findOne({ _id: req.user.id, tenant: req.user.tenant_id, role: 'customer', isActive: true });
  if (!customer) {
    return res.status(403).json({ message: 'Akun customer tidak aktif.' });
  }

  const branch = await Branch.findOne({ _id: branchId, tenant: customer.tenant, isActive: true });
  if (!branch) {
    return res.status(404).json({ message: 'Cabang tidak ditemukan atau tidak aktif.' });
  }

  const preparedItems = [];
  let totalAmount = 0;

  for (const raw of items) {
    const menuId = raw.menu_id;
    const qty = toNumber(raw.qty, 0);

    if (!isObjectId(menuId) || qty < 1 || qty > 99) {
      return res.status(400).json({ message: 'Item pesanan tidak valid.' });
    }

    const menu = await MenuItem.findOne({ _id: menuId, tenant: customer.tenant, isActive: true });
    if (!menu) {
      return res.status(404).json({ message: 'Salah satu menu tidak tersedia.' });
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
    tenant: customer.tenant,
    branch: branch._id,
    customer: customer._id,
    orderCode: `ONL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: 'pending',
    salesChannel: 'online',
    fulfillmentMethod,
    totalAmount,
    paymentMethod,
    customerName: customer.fullName,
    customerPhone: customer.phone,
    customerAddress: fulfillmentMethod === 'delivery' ? address : null,
    notes,
    items: preparedItems
  });

  return res.status(201).json({
    message: 'Pesanan berhasil dibuat dan menunggu konfirmasi outlet.',
    order: mapOrder({ ...order.toObject(), branch })
  });
}));

module.exports = router;
