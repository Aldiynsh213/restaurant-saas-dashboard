const { mongoose } = require('../config/db');

const orderItemSchema = new mongoose.Schema(
  {
    menu: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    orderCode: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    salesChannel: { type: String, enum: ['pos', 'online'], default: 'pos', index: true },
    fulfillmentMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'cash', trim: true, maxlength: 30 },
    customerName: { type: String, trim: true, maxlength: 120, default: null },
    customerPhone: { type: String, trim: true, maxlength: 32, default: null },
    customerAddress: { type: String, trim: true, maxlength: 500, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: null },
    items: { type: [orderItemSchema], default: [] }
  },
  { timestamps: true }
);

orderSchema.index({ tenant: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, branch: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, customer: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, salesChannel: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
