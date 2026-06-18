const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getSchemes, getSchemeById, createScheme, updateScheme, deleteScheme } = require('../controllers/scheme.controller');

router.use(authenticate);
router.get('/', getSchemes);
router.get('/:id', getSchemeById);
router.post('/', authorize('officer', 'admin'), createScheme);
router.put('/:id', authorize('officer', 'admin'), updateScheme);
router.delete('/:id', authorize('admin'), deleteScheme);

module.exports = router;
