const { mongoose } = require('../config/db');

const roles = ['owner', 'executive', 'manager', 'cashier', 'customer'];

const userSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    role: { type: String, enum: roles, required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    username: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 60 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: null },
    phone: { type: String, trim: true, maxlength: 32, default: null },
    defaultAddress: { type: String, trim: true, maxlength: 500, default: null },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.index({ tenant: 1, role: 1 });
userSchema.index({ tenant: 1, branch: 1 });
userSchema.index(
  { tenant: 1, email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $type: 'string' } } }
);

userSchema.methods.toSafeJson = function toSafeJson() {
  return {
    id: String(this._id),
    tenant_id: String(this.tenant),
    branch_id: this.branch ? String(this.branch) : null,
    role: this.role,
    username: this.username,
    full_name: this.fullName,
    email: this.email || null,
    phone: this.phone || null,
    default_address: this.defaultAddress || null
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.roles = roles;
