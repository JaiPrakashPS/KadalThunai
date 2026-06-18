const express = require('express');
const router = express.Router();
const { register, login, refreshToken, forgotPassword, resetPassword } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
