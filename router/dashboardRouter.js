
const express = require('express');
const router = express.Router();

const { promisify } = require('util');
const db = require("../model/databaseTable");
const query = promisify(db.query).bind(db);



// change password
router.get('/', async (req, res)=>{

    const { rows: allVoteCasted } = await query(`SELECT * FROM "votes" WHERE "user_id" = $1`, [req.user.id]);
    const { rows: tickets } = await query(`SELECT * FROM "paid_tickets" WHERE "user_id" = $1`, [req.user.id]);
    res.render('dash',{
        allVoteCasted :allVoteCasted.length,
        allTicketGotten: tickets.length,
        tickets
    })
});


module.exports = router;