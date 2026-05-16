const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Sesi tidak valid. Silakan login ulang.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (_err) {
    return res.status(401).json({ message: 'Sesi kedaluwarsa. Silakan login ulang.' });
  }
};
