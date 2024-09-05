const { queryAsync } = require('../conn.js');
const moment = require('moment-timezone');

const fetchCurrentTimeLog = async (req, res, next) => {
  res.locals.currentTimeLog = null;
  res.locals.isOnBreak = false;

  if (req.session && req.session.user) {
    try {
      const userId = req.session.user.login;

      // Fetch current time log using stored procedure
      const timeLogResult = await queryAsync(`CALL GetCurrentTimeLog('${userId}')`);

      let currentTimeLog = timeLogResult[0][0] || null;
      
      if (currentTimeLog) {
        // Check if the user is currently on a break using stored procedure
        const breakResult = await queryAsync(`CALL GetCurrentBreak('${currentTimeLog.id}')`);

        if (breakResult[0].length > 0) {
          res.locals.isOnBreak = true;
          currentTimeLog.break_start = breakResult[0][0].break_start;
        }

        // Combine the date and time information into a single datetime field
        const clock_in = moment.utc(currentTimeLog.clock_in).format();

        // Assign datetime to currentTimeLog
        currentTimeLog.clock_in = clock_in;

        res.locals.currentTimeLog = currentTimeLog;
      }
    } catch (error) {
      console.error('Error fetching current time log:', error);
    }
  }

  next();
};

module.exports = fetchCurrentTimeLog;