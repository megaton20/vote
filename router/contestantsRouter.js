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
    const  {rows: contestantsQuery} = await query(`SELECT * FROM "contenders"`);

        // Calculate points for each contender and set status
        contestantsQuery.forEach(contender => {
          contender.points = contender.vote_count * 2; // 1 vote = 2 points
          // Set status based on points
          contender.status = contender.points < 200 ? 'evicted' : 'active';
        });

    res.render('contestants', {
      contestants:contestantsQuery,
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

router.get('/standings', async (req, res) => {
  let userActive = false;
  if (req.user) {
    userActive = true;
  }
  try {
    const { rows: contestantsQuery } = await query(`SELECT * FROM "contenders" ORDER BY "vote_count" DESC`);

    // Calculate points for each contender and set status
    contestantsQuery.forEach(contender => {
      contender.points = contender.vote_count * 2; // 1 vote = 2 points
      // Set status based on points
      contender.status = contender.points < 200 ? 'eviction' : 'active';
    });

    res.render('standing', {
      standings: contestantsQuery,
      theme: req.session.theme,
      userActive,
    });
  } catch (error) {
    console.log(error);
    req.flash('error_msg', `Failed to get data`);
    res.redirect('/');
  }
});


// Define route for uploading images
router.post('/upload-images', upload.array('images', 5), checkMinImages, async (req, res) => {
  try {
    const imagePaths = req.files.map(file => file.path);
    const userId = req.user.id; // Assume req.user is populated from middleware

    await db.query('UPDATE users SET images = $1 WHERE id = $2', [imagePaths, userId]);
    res.json({ message: 'Images uploaded successfully', images: imagePaths });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading images', error });
  }
});



module.exports = router;