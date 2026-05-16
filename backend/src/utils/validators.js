const { mongoose } = require('../config/db');

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanString(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

function normalizeEmail(value) {
  const email = cleanString(value, 160).toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizePhone(value) {
  return cleanString(value, 32).replace(/[^0-9+]/g, '');
}

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 10
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password);
}

module.exports = {
  isObjectId,
  toNumber,
  cleanString,
  normalizeEmail,
  normalizePhone,
  isStrongPassword
};
