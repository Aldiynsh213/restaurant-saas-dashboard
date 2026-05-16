const { mongoose } = require('../config/db');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    planName: { type: String, default: 'business', trim: true, maxlength: 60 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

tenantSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Tenant', tenantSchema);
