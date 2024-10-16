// routes/userRoutes.js
const express = require('express');
const { upload, checkMinImages } = require('../middlewares/uploadMiddleware');
const { ensureAuthenticated } = require("../config/auth");
const router = express.Router();


const { promisify } = require('util');
const db = require("../model/databaseTable");
const query = promisify(db.query).bind(db);




// all contestants
router.get('/',ensureAuthenticated, async (req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  try {
    // const matches = await getUsers(req);
    const  {rows: ticketssQuery} = await query(`SELECT * FROM "tickets"`);

    res.render('tickets', {
      tickets:ticketssQuery,
       theme: req.session.theme,
       userActive,
       user:req.user
    });
  } catch (error) {
    console.log(error);
    req.flash('error_msg',`fialed to get data`)
    res.redirect('/')
  }
});






module.exports = router;