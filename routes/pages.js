const express = require('express');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.get('/forgot', (req, res) => {
  res.render('forgot');
});

router.get('/tos', (req, res) => {
  res.render('tos');
});

router.get('/privacy', (req, res) => {
  res.render('privacy');
});

module.exports = router;
