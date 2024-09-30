
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const userController = require('../controllers/userController');



// change password
router.get('/reset', ensureAuthenticated, userController.changePasswordPage);
router.post('/reset-password', ensureAuthenticated, userController.newPassword);

module.exports = router;