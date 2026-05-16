const { mongoose } = require('../config/db');

const branchSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

branchSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
