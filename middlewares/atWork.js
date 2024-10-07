

module.exports = {
  stopActions: function(req, res, next) {

    console.log('stopAction implimented');
    req.flash("error_msg", "Contact developer")
    res.render('no-entry')
    return
  },

  mentainanceAction: function(req, res, next) {
    
    console.log('mentainanceAction implimented');
    req.flash("error_msg", "Contact developer")
    res.render('no-entry')
    return
  }
};


