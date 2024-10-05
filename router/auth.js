const express = require("express");
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { promisify } = require('util');
const db = require("../model/databaseTable");
const query = promisify(db.query).bind(db);
const passport = require('../config/passport');

const { ensureAuthenticated,forwardAuthenticated } = require("../config/auth");
const { generateResetToken, verifyResetToken } = require('../config/jsonWebToken');







router.get('/google', (req, res, next) => {
    // If a referral code is present, include it in the state parameter
    const referralCode = req.session.referrerCode ? req.session.referrerCode : '';
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: referralCode 
    })(req, res, next);
  });



router.post('/register',forwardAuthenticated,  async (req, res) => {
  let errors = [];

const { email, password, passwordB } = req.body;

if (!(email && password && passwordB )) {
  errors.push({ msg: 'Enter all details' });
}

if (password !== passwordB) {
  errors.push({ msg: 'Passwords do not match' });
}
let userActive= false
if (req.user) {
  userActive = true
}
if (errors.length > 0) {
    return res.render('register', {
      errors,
      email,
      password,
      userActive
    });
  }


  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const results = await query('SELECT * FROM "users" WHERE email = $1', [email]);

    if (results.rows.length > 0) {
      errors.push({ msg: `User with this email: ${email} already exists.` });
      return res.render('register', {
        errors,
        email,
        password,
        userActive
      });
    }

 await query(`INSERT INTO "users" ( "email", "password", "user_role") 
      VALUES ($1, $2, $3) RETURNING id`,
      [
        email,
        hashedPassword,
        "user"
      ]
    );


    req.flash('success_msg', `"${email}" Registration successful`);
    return res.redirect('/login');

  } catch (error) {
    req.flash('error_msg', `Error from server: ${error.message}`);
    return res.redirect('/register');
  }
}
)


router.post('/login',forwardAuthenticated, async (req, res, next) => {

  let userActive= false
  if (req.user) {
    userActive = true
  }

    passport.authenticate('local', async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.render('login', {
          error_msg: info.message,
          theme:req.session.theme,
          userActive
        });
      }

        req.login(user, err => {
          if (err) {
            next(err);
            req.flash('error_msg', `Try again`);
            return res.redirect('/');
          }
  
          req.flash('success_msg', `Welcome ${user.fname}`);
          return res.redirect('/handler');
        });

    })(req, res, next);
  })

router.post('/recover-request',forwardAuthenticated, async (req, res) => {

      const { email } = req.body;
    
      if (!email) {
          req.flash('error_msg', `Error: Enter a valid email address`);
          return res.redirect('back');
      }
    
      // Check the database for the email presence
      try {
        
        const results = await query(`SELECT * FROM "users" WHERE email = $1`, [email])
    
    
          if (results.rows.length <= 0) {
              req.flash('error_msg', `Error: No user found with this email`);
              return res.redirect('back');
          }
    
          const userEmail = results.rows[0].email;
          const token = generateResetToken(userEmail);
          const resetLink = `${process.env.LIVE_DIRR || `http://localhost:${process.env.PORT || 4000}`}/auth/reset-password/${token}`;
    
          
              // Send verification email
              const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  host: 'smtp.gmail.com',
                  secure: false,
                  auth: {
                      user: process.env.EMAIL,
                      pass: process.env.EMAIL_PASSWORD,
                  },
              });
    
              

              const mailOptions = {
                  from: {
                      name: "the carnival queen",
                      address: process.env.EMAIL,
                  },
                  to: userEmail,
                  subject: 'Password Reset Link',
                  html: `
                      <p>Reset your password by clicking the button below:</p>
                      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #41afa5; text-decoration: none; border-radius: 5px;">Reset Password</a>
                      <p>If you did not request this, please ignore this email.</p>
                  `,
              };
    
              transporter.sendMail(mailOptions, (err, info) => {
                  if (err) {
                      if (err.code === "EDNS") {
                          req.flash('warning_msg', `Check your network connection!`);
                          return res.redirect('back');
                      }
                      req.flash('error_msg', `Error from our server... could not send link`);
                      return res.redirect('back');
                  }
    
                  req.flash('success_msg', `Check your inbox or spam in ${userEmail} to reset your password`);
                  return res.redirect('back'); // Redirect to a waiting page
              });
          } catch (error) {
              req.flash('error_msg', `Error while sending message`);
              res.redirect('back');
          }
  })

router.get('/reset-password/:token',forwardAuthenticated, async (req, res)=>{

  let userActive= false
  if (req.user) {
    userActive = true
  }

    const { token } = req.params;
    const decoded = verifyResetToken(token);
    if (!decoded) {
      req.flash('error_msg', `invalid token`)
     return res.redirect('/')
    }

    return res.render('change-password',{
      token,
      pageTitle:"enter new password",
      userActive
      })
  })


// new password save
router.post('/reset-password/:token',forwardAuthenticated, async (req, res)=>{
  const { token } = req.params;
  const { password, confirm } = req.body;
  const decoded = verifyResetToken(token);

  console.log("hhi");
  if (!decoded) {
      req.flash('error_msg', 'Invalid or expired token');
      return res.redirect('/');
  }

  if (password !== confirm) {
      req.flash('error_msg', 'Passwords do not match');
      return res.redirect(`back`);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
try {
  await query('UPDATE "users" SET "password" = $1 WHERE email = $2', [hashedPassword, decoded.email])
      req.flash('success_msg', 'Password changed successfully');
      return  res.redirect('/login');
  
} catch (error) {
  console.log(error);
  req.flash('success_msg', `errorr form server: ${error.message}`);
  return  res.redirect('/login');
}
});



// router.post('/delete-account',ensureAuthenticated, authController.deleteAccount)


module.exports = router;
