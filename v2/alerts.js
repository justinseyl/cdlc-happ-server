// alerts.js

const db = require('../conn.js');

module.exports = {
    getalerts: (req, res) => {

      let q = "select title,content,datediff(Now(),updated_at) as diff from alerts where type = 'user' order by diff asc";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    getalerts_admin: (req, res) => {

      let q = "select title,content,datediff(Now(),updated_at) as diff from alerts where type = 'admin' order by diff asc";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
};