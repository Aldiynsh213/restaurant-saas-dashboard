const { nodeEnv } = require('../config/env');

module.exports = function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;

  if (nodeEnv !== 'test') {
    console.error(err);
  }

  return res.status(status).json({
    message: status === 500 ? 'Terjadi kesalahan server.' : err.message,
    ...(nodeEnv === 'development' ? { detail: err.message } : {})
  });
};
