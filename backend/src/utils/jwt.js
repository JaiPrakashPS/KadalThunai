const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

/**
 * Generate access + refresh token pair
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };
