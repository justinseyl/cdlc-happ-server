const isAdmin = (req, res, next) => {
  if (req.session.user && ['admin', 'superadmin'].includes(req.session.user.role)) {
    next();
  } else {
    res.redirect('/');
  }
};

const isManager = (req, res, next) => {
  if (req.session.user && ['manager', 'admin', 'superadmin'].includes(req.session.user.role)) {
    next();
  } else {
    res.redirect('/');
  }
};

module.exports = {
  isAdmin,
  isManager,
};
