const express = require("express");
const router = express.Router();
const superController = require('../controllers/superController')
const { isTeam } = require("../config/isTeam");
const { ensureAuthenticated } = require("../config/auth");



// form to activate entry
router.get("/", ensureAuthenticated,isTeam);

// submit form hhere
router.post("/", ensureAuthenticated,isTeam);


module.exports = router;
