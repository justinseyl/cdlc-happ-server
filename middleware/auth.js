const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

const isOnboarded = (req, res, next) => {
  if (req.session.user && req.session.user.onboarding_completed) {
    next();
  } else {
    res.redirect('/auth/onboarding');
  }
};

module.exports = {
  isAuthenticated,
  isOnboarded,
};
