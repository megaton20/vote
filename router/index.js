const express = require('express');
const router = express.Router();
const axios = require('axios');
const { promisify } = require('util');
const db = require("../model/databaseTable");
const query = promisify(db.query).bind(db);
const passport = require('../config/passport');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const stateData = require("../model/stateAndLGA");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const appName = `Carnival Queen Pageant` 




router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {

    try {
      // Parameterized query to prevent SQL injection
      const updateQuery = `
        UPDATE "Users"
        SET "previous_visit" = $1
        WHERE "id" = $2
      `;

      // Execute the query with parameters
      await query(updateQuery, [new Date(), req.user.id]);

      // Flash a success message and redirect
      req.flash("success_msg", `Welcome back ${req.user.First_name}!`);
      res.redirect('/handler');
    } catch (error) {
      console.error('Error during user update:', error);

      // Determine the type of error and respond accordingly
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      
      // Customize the error message based on the error type
      if (error.name === 'QueryFailedError') {
        errorMessage = 'Database error. Please contact support if this continues.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      return res.render('login', {
        error_msg: errorMessage,
        pageTitle: `Login To continue Using ${appName}`,
        appName: appName,
      });
    }
  }
);

// Welcome Page
router.get('/', async (req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }

  const  {rows: contestantsQuery} = await query(`SELECT * FROM "contenders" ORDER BY id ASC`);
  try {
    
      res.render('index',{
        pageTitle:`Welcome to ${appName}`,
        userActive,
        contestants:contestantsQuery,
        theme:req.session.theme
      });


  } catch (error) {
    console.error(`Error at index / ${error}`);
    req.flash('error_msg', 'An error occurred ');
    return res.redirect('/');
  }


}
)

// policy Page
router.get('/policy', async(req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  const { rows: allCategory } = await query('SELECT * FROM "Category"');
  res.render('policy',{
    pageTitle:` policy`,
    userActive,
    allCategory,
    theme:req.session.theme
  });
}
)

router.get('/faq', async(req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  const { rows: allCategory } = await query('SELECT * FROM "Category"');
  res.render('faq',{
    pageTitle:`faq`,
    userActive,
    allCategory,
    theme:req.session.theme
  });
}
)
router.get('/featured-services', async(req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  const { rows: allCategory } = await query('SELECT * FROM "Category"');
  res.render('featured-services',{
    pageTitle:` featured-services`,
    userActive,
    allCategory,
    theme:req.session.theme
  });
}
)
router.get('/contact', async (req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  const { rows: allCategory } = await query('SELECT * FROM "Category"');
  res.render('contact',{
    pageTitle:`contact`,
    userActive,
    allCategory,
    theme:req.session.theme
  });
}
)




// terms Page
router.get('/terms', async(req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  const { rows: allCategory } = await query('SELECT * FROM "Category"');
  res.render('terms',{
    pageTitle:` terms`,
    userActive,
    allCategory,
    theme:req.session.theme
  });
}
)

// terms Page
router.get('/abouts', async (req, res) => {
  let userActive= false
  if (req.user) {
    userActive = true
  }
  res.render('abouts',{
    pageTitle:` Abouts`,
    userActive,
    theme:req.session.theme
  });
}
)



router.get('/handler',ensureAuthenticated, (req, res)=>{
  

  if (req.isAuthenticated()) {

    const role = req.user.user_role

        if ((role == "admin")) {
         return res.redirect("/super");
          // admins  ends here
        } else if(role == "user"){
         return res.redirect("/contestants");
        // not authenticated
        }else {
        req.flash("error_msg", `please log in to use our valuable resources`);
        res.redirect('/login')
      }

    }

    res.redirect('/login')
 
})



router.get('/login', forwardAuthenticated, (req, res) =>{ 
  let userActive= false
  if (req.user) {
    userActive = true
  }
  res.render('login',{
  theme:req.session.theme,
  userActive
  }
);
})

router.get('/register', forwardAuthenticated, (req, res) =>{

  let userActive= false
if (req.user) {
  userActive = true
}
  const referrerCode = req.query.ref || null;

  if (referrerCode) {
    req.session.referrerCode = referrerCode
  }
  
  res.render('register',{
    pageTitle:`Create account with`,
    referralCode:referrerCode,
    stateData,
    theme:req.session.theme,
    userActive
  })
} 
);

router.get('/forget', forwardAuthenticated, (req, res) => res.render('forget-password',{
  pageTitle:`enter recovery email for`,
  theme:req.session.theme
  }));


  
  // Route to fetch LGAs for a selected state
router.get("/getlgas/:state", (req, res) => {

  const { state } = req.params;
  const selectedState = stateData.find((s) => s.state === state);


  if (selectedState) {
    res.json(selectedState.lgas);
  } else {
    res.status(404).json({ error: "State not found" });
  }
});





// paystack
router.post('/pay',ensureAuthenticated, async (req, res) => {
  const { email, amount,contestantId, voteNumber} = req.body;
  
  req.session.voteNumber = voteNumber;
  req.session.contestantId = contestantId;

  try {
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
          email,
          amount: amount * 100, // Paystack expects the amount in kobo
           callback_url: `${process.env.LIVE_DIRR || `http://localhost:${process.env.PORT}`}/verify`
      }, {
          headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
          }
      });

      res.json(response.data);
  } catch (error) {
    console.log(error);
      res.status(500).json({ message: error.message });
  }
});




router.get('/verify', async (req, res) => {
  const reference = req.query.reference;

  if (!reference) {
    req.flash('error_msg', 'No reference provided');
    return res.redirect('/');
  }

  try {
    // Verify transaction with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    if (response.data.status && response.data.data.status === 'success') {
      // Extract transaction details
      const { id, reference, amount, status, customer: { email }, paid_at } = response.data.data;

      // Save transaction details to the database
      const d = `INSERT INTO "transactions" ("reference", "amount", "status", "email", "paid_at", "user_id", "contendant_id", "votes_casted") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

      await query(d, [ reference, amount / 100, status, email, paid_at, req.user.id, req.session.contestantId,req.session.voteNumber]);

      
      // Fetch the user's current cashback using req.session.id
      const  contenderQuery = `SELECT * FROM "contenders" WHERE "id" = $1`;
      const {rows:contenderResults} = await db.query(contenderQuery, [req.session.contestantId]);
      const currentVoteCount = contenderResults[0].vote_count;

      const newVote = currentVoteCount + req.session.voteNumber

        // Update user's cashback
      const voteCountQuery = `UPDATE "contenders" SET "vote_count" = $1 WHERE "id" = $2`;
      await db.query(voteCountQuery, [newVote, req.session.contestantId]);


      // No error, redirect to order page
      req.flash("success_msg",`${req.session.voteNumber} vote has been submited for ${contenderResults[0].fname} ${contenderResults[0].lname}`)
      return res.redirect(`/contestants`);
    } else {
      // Handle failed verification
      console.log('Payment verification failed:', response.data.data);
      req.flash('error_msg', 'Payment unsuccessful');
      return res.redirect('/');
    }
  } catch (error) {
    console.log(error);

    try {

      const getItemQuery = `SELECT * FROM "transactions" WHERE "reference" = $1 AND "email" = $2 `;
      const { rows: results } = await query(getItemQuery, [reference, req.user.email]);
  
      if(results.length > 0) {

        const updateCashbackQuery = `UPDATE "transactions" SET "status" = $1 WHERE "reference" = $2`;
        await db.query(updateCashbackQuery, ["failed", results.reference]);
        
        console.error('system Error verifying flaging payment succesful:', error);
        req.flash('error_msg', 'Server error, flaging payment succesful');
        return res.redirect('/');
      }

    } catch (error) {

      console.error('system Error verifying and flaging payment unsuccesful:', error);
      req.flash('error_msg', 'Server error, flaging payment unsuccesful');
      return res.redirect('/');

    }
  }
});



// webhook
router.post('/webhook', (req, res) => {
  const hash = crypto.createHmac('sha512', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  if (hash === req.headers['x-paystack-signature']) {
      const event = req.body;
      switch (event.event) {
          case 'charge.success':
              console.log('Payment successful:', event.data);
              break;
          // Add more event types as needed
      }

      res.sendStatus(200);
  } else {
      res.sendStatus(400);
  }
});


// Logout route
router.get('/logout',ensureAuthenticated, (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    req.flash('success_msg', 'You have logged out successfully.');
    res.redirect('/login');
  });
});






  module.exports = router;