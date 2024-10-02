const express = require("express");
const router = express.Router();
const superController = require('../controllers/superController')
const upload = require('../config/multerConfig'); // Import the Multer config
const { isSuper } = require("../config/isSuper");
const { ensureAuthenticated } = require("../config/auth");

// udating image of inventory
// router.post('/add-image/:id',ensureAuthenticated,isSuper,upload.single('image'),superController.updateImage)
// Welcome Page
router.get("/", ensureAuthenticated,isSuper, superController.AdminPage);
router.get("/transactions", ensureAuthenticated,isSuper, superController.transactions);

// all table Page
// router.get("/all-contestants", ensureAuthenticated,isSuper, superController.getAllCustomers);

module.exports = router;
