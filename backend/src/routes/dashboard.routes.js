const express = require('express');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Branch = require('../models/Branch');
const asyncHandler = require('../utils/asyncHandler');
const { mongoose } = require('../config/db');

const router = express.Router();

function objectId(value) {
  return new mongoose.Types.ObjectId(String(value));
}

function scopeFilter(user) {
  const filter = { tenant: objectId(user.tenant_id) };
  if (!['owner', 'executive'].includes(user.role)) {
    filter.branch = objectId(user.branch_id);
  }
  return filter;
}

router.get('/summary', auth, allowRoles('owner', 'executive', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const orderScope = scopeFilter(req.user);
  const tenantFilter = { tenant: objectId(req.user.tenant_id) };
  const completedFilter = { ...orderScope, status: 'completed' };

  const [sales] = await Order.aggregate([
    { $match: completedFilter },
    {
      $group: {
        _id: null,
        total_orders: { $sum: 1 },
        total_revenue: { $sum: '$totalAmount' },
        avg_order_value: { $avg: '$totalAmount' }
      }
    }
  ]);

  const [kpi] = await Order.aggregate([
    { $match: orderScope },
    {
      $group: {
        _id: null,
        omzet: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } },
        completedTotal: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pending_orders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        omzet: 1,
        transaksi_selesai: '$completedTotal',
        pending_orders: 1,
        aov: { $cond: [{ $gt: ['$completedTotal', 0] }, { $divide: ['$omzet', '$completedTotal'] }, 0] }
      }
    }
  ]);

  const dailyRevenue = await Order.aggregate([
    { $match: completedFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 7 },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', revenue: 1 } }
  ]);

  const [totalMenu, totalBranches] = await Promise.all([
    MenuItem.countDocuments({ ...tenantFilter, isActive: true }),
    Branch.countDocuments({ ...tenantFilter, isActive: true })
  ]);

  return res.json({
    sales: {
      total_orders: sales?.total_orders || 0,
      total_revenue: sales?.total_revenue || 0,
      avg_order_value: sales?.avg_order_value || 0
    },
    menu: { total_menu: totalMenu },
    branches: { total_branches: totalBranches },
    dailyRevenue,
    kpi: {
      omzet: kpi?.omzet || 0,
      aov: kpi?.aov || 0,
      transaksi_selesai: kpi?.transaksi_selesai || 0,
      pending_orders: kpi?.pending_orders || 0
    }
  });
}));

router.get('/branch-performance', auth, allowRoles('owner', 'executive', 'manager'), asyncHandler(async (req, res) => {
  const branchFilter = { tenant: objectId(req.user.tenant_id), isActive: true };
  if (!['owner', 'executive'].includes(req.user.role)) {
    branchFilter._id = objectId(req.user.branch_id);
  }

  const branches = await Branch.find(branchFilter).sort({ name: 1 }).lean();
  const rows = await Promise.all(branches.map(async (branch) => {
    const [stats] = await Order.aggregate([
      { $match: { tenant: branch.tenant, branch: branch._id } },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } }
        }
      }
    ]);

    return {
      id: String(branch._id),
      name: branch.name,
      city: branch.city,
      total_orders: stats?.total_orders || 0,
      revenue: stats?.revenue || 0
    };
  }));

  rows.sort((a, b) => b.revenue - a.revenue);
  return res.json(rows);
}));

module.exports = router;
