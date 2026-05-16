const { mongoose } = require('../config/db');

const supportMessageSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 32, default: null },
    source: { type: String, trim: true, maxlength: 50, default: 'sales_web' },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'replied', 'closed'], default: 'open', index: true },
    reply: { type: String, trim: true, maxlength: 1000, default: '' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

supportMessageSchema.index({ tenant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
