const express = require('express');
const router = express.Router();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { promisify } = require('util');
const db = require("../model/databaseTable");
const query = promisify(db.query).bind(db);
const passport = require('../config/passport');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const stateData = require("../model/stateAndLGA");
const crypto = require('crypto');
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const appName = `Carnival Queen Pageant` 

      // Configure Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD
        }
      });



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

  try {
    const  {rows: contestantsQuery} = await query(`SELECT * FROM "contenders" ORDER BY id ASC`);

          // Calculate points for each contender and set status
          contestantsQuery.forEach(contender => {
            contender.points = contender.vote_count * 2; // 1 vote = 2 points
            // Set status based on points
            contender.status = contender.points < 200 ? 'evicted' : 'active';
          });
    
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
  res.render('contact',{
    pageTitle:`contact`,
    userActive,
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

        if ((role == "super")) {
         return res.redirect("/");
          // admins  ends here
        } else if(role == "user"){
         return res.redirect("/contestants");
        }

        req.flash("error_msg", `please log in to use our valuable resources`);
        return res.redirect('/login')


    }
 
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

router.get('/forget', forwardAuthenticated, (req, res) =>{
  let userActive= false
  if (req.user) {
    userActive = true
  }

  res.render('forget-password',{
  pageTitle:`enter recovery email for`,
  theme:req.session.theme,
  theme:req.session.theme,
  userActive
  })
});


  
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
  
  
  
  const {  type} = req.body;
  if (type == "vote") {
  const { email, amount,contestantId, voteNumber, type} = req.body;

  req.session.voteNumber = voteNumber;
  req.session.contestantId = contestantId;

    try {
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
          email,
          amount: amount * 100, // Paystack expects the amount in kobo
           callback_url: `${process.env.LIVE_DIRR || process.env.NGROK_URL || `http://localhost:${process.env.PORT}`}/verify`,
           metadata: {
            userId: req.user.id, // Include user ID from session
            contestantId: contestantId,
            voteNumber: voteNumber,
            type:type
          }
      }, {
          headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
          }
      });

     return res.json(response.data);
  } catch (error) {
    console.log(error);
      res.status(500).json({ message: error.message });
  }
  }else if(type == "ticket"){
    try {

      const { email, amount,ticketID, type,ticketType , firstName, lastName} = req.body;


      req.session.ticketID = ticketID;
      req.session.ticketType = ticketType;
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
          email,
          amount: amount * 100, // Paystack expects the amount in kobo
           callback_url: `${process.env.LIVE_DIRR || process.env.NGROK_URL || `http://localhost:${process.env.PORT}`}/verify`,
           metadata: {
            userId: req.user.id, 
            ticketID: ticketID,
            type:type,
            ticketType:ticketType,
            firstName,
            lastName
          }
      }, {
          headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
          }
      });

      return res.json(response.data);
  } catch (error) {
    console.log(error);
      res.status(500).json({ message: error.message });
  }
  }else{
    console.log("payment type not specified");
    res.status(500).json({ message: error.message });
  }

});







router.get('/verify', async (req, res) => {
  const reference = req.query.reference;

  if (!reference) {
    req.flash('error_msg', 'No reference provided');
    return res.redirect('/contestants');
  }

  try {
    // Verify transaction with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    if (response.data.status && response.data.data.status === 'success') {
      

    const type  = response.data.data.metadata.type

    if (type == "vote") {
        const contenderQuery = `SELECT * FROM "contenders" WHERE "id" = $1`;
        const { rows: result } = await query(contenderQuery, [req.session.contestantId]); 

      if (result.length > 0) {
            req.flash('success_msg', `Payment successful! ${req.session.voteNumber} vote(s) casted for ${result[0].fname} ${result[0].lname} `);
            return res.redirect('/contestants');
      }

          req.flash('success_msg', `Payment successful! ${req.session.voteNumber} vote(s) casted.`);
          return res.redirect('/contestants');
      }else{

        const ticketQuery = `SELECT * FROM "tickets" WHERE "id" = $1`;
        const { rows: result } = await query(ticketQuery, [req.session.ticketID]); 

      if (result.length > 0) {
            req.flash('success_msg', `Payment successful for ${result[0].name} ticket, check email for ticket code (check spam folder)`);
            return res.redirect('/tickets');
      }
            req.flash('success_msg', `Ticket payment Payment successful!`);
            return res.redirect('/tickets');
          }
    

    } else {
      // Handle failed verification from Paystack
      req.flash('error_msg', 'Payment verification failed.');
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    req.flash('error_msg', 'Server error');
    return res.redirect('/');
  }
});



router.post('/webhook', async (req, res) => {

  // Verify Paystack webhook signature
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
                     .update(JSON.stringify(req.body))
                     .digest('hex');

  // Check if the signature is valid
  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;

    try {
      // Handle successful payments
      if (event.event === 'charge.success') {
        
        const { 
          reference, 
          amount, 
          status, 
          customer: { email }, 
          paid_at, 
          metadata 
        } = event.data;

        const { type } = metadata;
        
        if (type == "vote") {
          const { voteNumber, contestantId, userId } = metadata;
       // Check if transaction already exists in the database to prevent duplication
       const existingTransactionQuery = `SELECT * FROM "transactions" WHERE "reference" = $1`;
       const { rows: existingTransaction } = await query(existingTransactionQuery, [reference]);

       if (existingTransaction.length === 0) {
         // Save transaction details to the database
         const transactionQuery = `INSERT INTO "transactions" 
           ("reference", "amount", "status", "email", "paid_at", "user_id", "contendant_id", "votes_casted") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
         
         await query(transactionQuery, [
           reference, 
           amount / 100,  // Convert kobo back to naira
           status, 
           email, 
           paid_at, 
           userId, 
           contestantId, 
           voteNumber
         ]);

         // Fetch current vote count of the contestant
         const contenderQuery = `SELECT * FROM "contenders" WHERE "id" = $1`;
         const { rows: contenderResults } = await query(contenderQuery, [contestantId]);

         if (contenderResults.length > 0) {
           const currentVoteCount = contenderResults[0].vote_count;

           // Calculate new vote total
           const newVote = parseInt(currentVoteCount, 10) + parseInt(voteNumber, 10);
           
           // Update vote count in "contenders" table
           const voteCountQuery = `UPDATE "contenders" SET "vote_count" = $1 WHERE "id" = $2`;
           await query(voteCountQuery, [newVote, contestantId]);


           //
           const getNewTransaction = `SELECT * FROM "transactions" WHERE "reference" = $1`;
           const { rows: transactionResult } = await query(getNewTransaction, [reference]);

           if (transactionResult.length > 0) {

             const updateTransaction = `UPDATE "transactions" SET "old_vote" = $1, "new_vote" = $2 WHERE "id" = $3`;
             await query(updateTransaction, [currentVoteCount,newVote, transactionResult[0].id]);
           return  console.log(`${voteNumber} vote(s) submitted for ${contenderResults[0].fname} ${contenderResults[0].lname}`);
           }
           
           const updateTransaction = `UPDATE "transactions" SET "old_vote" = $1, "new_vote" = $2 WHERE "id" = $3`;
           await query(updateTransaction, [currentVoteCount,newVote, transactionResult[0].id]);
           console.log(`${voteNumber} vote(s) submitted for ${contenderResults[0].fname} ${contenderResults[0].lname}`);
           console.log('transaction was updated outside');

           return 
           // 
         } else {
           console.log(`No contestant found with ID: ${contestantId}`);
         }

         // Send 200 OK after processing successfully
         return res.sendStatus(200);
        }else {
          console.log('Transaction already exists, no need to insert.');
           return res.sendStatus(200); // Acknowledge the webhook
        }
   
        }else{


          const { ticketID, userId,ticketType,firstName,lastName } = metadata;
          // Check if transaction already exists in the database to prevent duplication
          const existingTransactionQuery = `SELECT * FROM "ticket_transactions" WHERE "reference" = $1`;
          const { rows: existingTransaction } = await query(existingTransactionQuery, [reference]);

        if (existingTransaction.length === 0) {
          // Save transaction details to the database
          const generateTicketCode = () => {
            const uniqueCode = Math.random().toString(36).substr(2, 8).toUpperCase(); // Generate a random 8-character alphanumeric string
            return `STS-${uniqueCode}`;
          };

          const { rows: ticketPaidFor } = await query(`SELECT * FROM "tickets" WHERE "id" = $1`, [ticketID]);
          if (!ticketPaidFor.length) {
            throw new Error("Ticket not found");
          }
          const newLeft = ticketPaidFor[0].total - 1;

          
          await query(`UPDATE "tickets" SET "total" = $1 WHERE "id" = $2`, [newLeft, ticketID]);

          const ticketCode = generateTicketCode();
            // Save transaction details, including the ticket code, to the database
            const transactionQuery = `INSERT INTO "ticket_transactions" 
            ("reference", "amount", "status", "email", "paid_at", "user_id", "ticket_id", "ticket_code") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

            await query(transactionQuery, [
              reference, 
              amount / 100,  // Convert kobo back to naira
              status, 
              email, 
              paid_at, 
              userId, 
              ticketID,
              ticketCode
            ]);

                 // Insert into 'paid_tickets' table with generated ticket code
              const ticketInsertQuery = `INSERT INTO "paid_tickets" ("ticket_code", "ticket_type", "user_id", "ticket_id", "first_name", "last_name") VALUES ($1, $2, $3, $4, $5, $6)`;

            await query(ticketInsertQuery, [
              ticketCode,
              ticketType,
              userId,
              ticketID,
              firstName,
              lastName
            ]);
          // Send email with ticket details
          const sendEmail = (to, subject, message) => {
            // Email options
            const mailOptions = {
              from: appName,
              to:email,
              subject,
              html: message  // Use the HTML property instead of text
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log('Error sending email:', error);
              } 
            });
          };

          // Email content
          const emailSubject = 'Your Ticket Purchase Confirmation';
          const emailMessage = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <p>Thank you for your purchase! Here are your ticket details:</p>
              <p>Thank you  ${firstName}  ${lastName}</p>

                <p><strong>Ticket Code:</strong> ${ticketCode}</p>
                <p><strong>Ticket Amount:</strong> ₦${(amount / 100).toFixed(2)}</p>
                <p><strong>Date:</strong> ${paid_at}</p>

              <p>Please keep this ticket code safe, as it will be required for event entry.</p>
              <p>Best regards,<br>The Carnival Queen</p>
            </div>
          `;

          // Send the email
          sendEmail(email, emailSubject, emailMessage);


   // Send 200 OK after processing successfully
   return res.sendStatus(200);
  }else {
          console.log('Transaction already exists, no need to insert.');
          return res.sendStatus(200); // Acknowledge the webhook
        }
        }  // ticket logic ends
      } else {
        console.log(`Unhandled event type: ${event.event}`);
        return res.sendStatus(200); // Acknowledge unhandled events
      }
    } catch (error) {
      console.error('Error processing Paystack webhook:', error);
      return res.sendStatus(500); // Server error
    }
  } else {
    console.log('Invalid webhook signature');
    return res.sendStatus(400); // Invalid signature
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