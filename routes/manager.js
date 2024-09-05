const express = require('express');
const router = express.Router();

// Import your manager-related functions
const {
  setManagerSchedule,
  getAllUsersMan,
  // add other functions here
} = require('../user');

// Define your routes
router.post('/setSchedule', setManagerSchedule);
router.post('/getAllUsers', getAllUsersMan);
// add other routes here

module.exports = router;
