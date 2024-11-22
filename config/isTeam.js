module.exports = {
    isTeam: function(req, res, next){
  
      const userRole = req.user.user_role;
  
      if (userRole === "team") {
        return next();
        
      }
      
        req.flash('warning_msg', 'not availaible');
        return res.redirect('/');

    }
      
  }