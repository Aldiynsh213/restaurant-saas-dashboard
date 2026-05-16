const { mongoose } = require('../config/db');

const menuItemSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, maxlength: 240, default: '' },
    imageUrl: { type: String, trim: true, maxlength: 700, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

menuItemSchema.index({ tenant: 1, name: 1 });
menuItemSchema.index({ tenant: 1, isActive: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
