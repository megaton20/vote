
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const methodOverride = require('method-override');
const ejsLayouts = require('express-ejs-layouts');

const cors = require('cors');

const appName = "G.Mart"
require('dotenv').config();



const openRoutes = require('./router/index');
const authRouter = require('./router/auth');
const userRouter = require('./router/userRouter');
const contestantsRouter = require('./router/contestantsRouter');
const ticketsRouter = require('./router/ticketsRouter');
const adminRouter = require('./router/adminRouter');
const dashboardRouter = require('./router/dashboardRouter');
const teamRouter = require('./router/teamRouter');
const {stopActions,mentainanceAction} = require('./middlewares/atWork');
const { ensureAuthenticated } = require('./config/auth');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(cors());

app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.use(express.static(path.join(__dirname, './', 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET, 
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(methodOverride((req, res) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        let method = req.body._method;
        delete req.body._method;
        return method;
    }
}));


app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.warning_msg = req.flash('warning_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});


app.use((req, res, next) => {
    // If no session theme is set, default to 'day'
    if (!req.session.theme) {
      req.session.theme = 'day';
    }
    next();
  });
  
app.post('/toggle-theme', (req, res) => {
    // Toggle between 'day' and 'night' mode
    req.session.theme = req.session.theme === 'day' ? 'night' : 'day';
    res.redirect('back');
  });

app.use('/',stopActions, openRoutes);
app.use('/auth',stopActions, authRouter);
app.use('/user',stopActions, userRouter);
app.use('/contestants',stopActions, contestantsRouter);
app.use('/tickets',stopActions, ticketsRouter);
app.use('/admin',stopActions, adminRouter);
app.use('/dashboard',stopActions, ensureAuthenticated, dashboardRouter);
app.use('/team',stopActions, ensureAuthenticated, teamRouter);


  // 404 Error handler for undefined routes
  app.use((req, res) => {
    let userActive= false
    if (req.user) {
      userActive = true
    }

    res.render('404',{
      pageTitle:` ${appName} 404`,
      appName,
      userActive,
      theme:req.session.theme
    });
  });
  
  // General error handling middleware
  app.use((err, req, res, next) => {
    console.log(err);
        let userActive= false
    if (req.user) {
      userActive = true
    }
    
    res.render('blank',{
      pageTitle:` ${appName} unexected error`,
      appName,
      userActive,
      theme:req.session.theme
    });
  });

const PORT =  process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});







