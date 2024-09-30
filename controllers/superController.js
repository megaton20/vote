const db = require("../model/databaseTable");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);
const stateData = require("../model/stateAndLGA");
const fs = require('fs'); // Use fs.promises for file operations
const path = require('path');




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


exports.AdminPage = async (req, res) => {
  const fname = req.user.fname;
  const lname = req.user.lname;

  try {
    // Fetch canceled orders
    const {rows:allUsersResult} = await query(`SELECT * FROM "users"`);


    // Fetch shipping fees from resolved sales
    const {rows:succesfulTransactionAmountResult} = await query(`SELECT "amount" FROM "transactions" WHERE "status" = 'success'`);
    
    const succesfulTransactionAmount = succesfulTransactionAmountResult.reduce(
      (acc, transaction) => acc + parseFloat(transaction.amount),
      0
      );
      const formatedsuccesfulTransactionAmount = succesfulTransactionAmount.toLocaleString("en-US");
      
      const {rows:failedTransactionTotalResult} = await query(`SELECT * FROM "transactions" WHERE "status" = 'failed'`);
      const {rows:failedTransactionAmountResult} = await query(`SELECT * FROM "transactions" WHERE "status" = 'failed'`);
      
      const failedTransactionAmount = failedTransactionAmountResult.reduce(
        (acc, transaction) => acc + parseFloat(transaction.amount),
        0
        );
        const formatedfailedTransactionAmount = failedTransactionAmount.toLocaleString("en-US");
        
      
        const { rows: allContendersResult } = await query(`SELECT * FROM "contenders"`);

        // Calculate points for each contender
        allContendersResult.forEach(contender => {
          contender.points = contender.vote_count * 2; // 1 vote = 2 points
        });
        
        
      const {rows:allVotesResult} = await query(`SELECT "vote_count" FROM "contenders"`);
      const allVotesAmount = allVotesResult.reduce(
        (acc, votes) => acc + parseFloat(votes.vote_count),
        0
        );
        const formatedallVotesAmount = allVotesAmount.toLocaleString("en-US");

    res.render("admin", {
      name: `${fname} ${lname}`,
      month: monthName,
      day: dayName,
      date: presentDay,
      year: presentYear,
      userActive: true,
      allUsersResult,
      formatedsuccesfulTransactionAmount,
      allContendersResult,
      failedTransactionTotalResult,
      formatedfailedTransactionAmount,
      formatedallVotesAmount
    });

  } catch (error) {
    console.log(error);
    req.flash("error_msg", `Server Error`);
    return res.redirect("/");
  }
};




