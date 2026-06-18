const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getMyProfile, updateMyProfile, getProfileById } = require('../controllers/profile.controller');

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.get('/:id', authorize('officer', 'admin'), getProfileById);

module.exports = router;
