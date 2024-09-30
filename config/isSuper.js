module.exports = {
    isSuper: function(req, res, next){
  
      const userRole = req.user.user_role;
  
      if (userRole === "super") {
        return next();
        
      }
      
        req.flash('warning_msg', 'not availaible');
        return res.redirect('/');

    }
      
  }