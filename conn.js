const mysql = require('mysql');
const config = require('./config.js');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: config.hostname,
  user: config.username,
  password: config.pass,
  database: config.db
});

const queryAsync = (sql) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = pool;
module.exports.queryAsync = queryAsync;

