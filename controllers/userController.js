const crypto = require('crypto');
const bcrypt = require('bcrypt');
const axios = require('axios');
const nodemailer = require('nodemailer');
const db = require("../model/databaseTable");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);
const stateData = require("../model/stateAndLGA");

const systemCalander = new Date().toLocaleDateString();
const yearModel = require("../model/getYear");
let presentYear = yearModel(systemCalander, "/");

const monthNameModel = require("../model/findCurrentMonth");
let monthName = monthNameModel(systemCalander, "/");

const dayModel = require("../model/dayOfWeek");
let dayName = dayModel(systemCalander, "/");

const monthModel = require("../model/getMonth");
let presentMonth = monthModel(systemCalander, "/");

const getDay = require("../model/getDay");
let presentDay = getDay(systemCalander, "/");

let sqlDate = presentYear + "-" + presentMonth + "-" + presentDay;





const appName = `General Mart`  













exports.changePasswordPage = async (req, res) => {
  // Render the profile page

   const { rows: [result] } = await query('SELECT COUNT(*) AS totalunread FROM "notifications" WHERE "user_id" = $1 AND "is_read" = $2',[req.user.id, false]);
    
    let totalUnreadNotification = parseInt(result.totalunread, 10);
    const { rows: allCategory } = await query('SELECT * FROM "Category"');
  return res.render('./user/change-password', {
    pageTitle: 'Change Password',
    appName: appName,
    totalUnreadNotification,allCategory
  });
  

};

exports.newPassword = async(req, res) => {

  const userId =  req.user.id

  const { oldPassword, newPasswordA,newPasswordB } = req.body;

  if (!(oldPassword && newPasswordA && newPasswordB)) {
    req.flash('error_msg', 'Enter all Fields');
    return res.redirect(`back`);
  }

      if (newPasswordA !== newPasswordB) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect(`back`);
    }

  try {
          // Fetch user data
          const userDataQuery = `SELECT * FROM "Users" WHERE "id" = $1`;
          const {rows: userDataResult} = await query(userDataQuery, [userId]);
          const userData = userDataResult[0];
      
          const isMatch = await bcrypt.compare(oldPassword, userData.Password);
      
      
          if (!isMatch) {
            req.flash('error_msg', 'Old Password is not correct');
            return res.redirect('back')
          }
  } catch (error) {
    console.log(error);
    req.flash('success_msg', `errorr form server`);
    return  res.redirect('/');
  }

  const hashedPassword = bcrypt.hashSync(newPasswordA, 10);



        try {
          await query('INSERT INTO "notifications" ("user_id", "message", "type", "is_read") VALUES ($1, $2, $3, $4)',[req.user.id, `Your Password was changed.`, 'security', false]);

          await query('UPDATE "Users" SET "Password" = $1 WHERE email = $2', [hashedPassword, req.user.email])
              req.flash('success_msg', 'Password changed successfully');
            return  res.redirect('/user/profile');
          
        } catch (error) {
          console.log(error);
          req.flash('success_msg', `errorr form server: ${error.message}`);
          return  res.redirect('/login');
        }
};
