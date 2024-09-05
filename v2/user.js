const db = require('../conn.js');

module.exports = {
    getuser: (req, res) => {
        try {
            let usr = req.body.userid;
            if (!usr) {
                return res.status(400).send('Invalid parameters');
            }

            let q = `
        select email, division, created_at, firstname, lastname, name, phone, dob, work, home, spouse, anniv, firstchild, secondchild, drink, food, rest, store, team, candy, starbucks, college, admin, role 
        from users 
        where email = ?
      `;

            db.query(q, [usr], (err, result) => {
                if (err) {
                    console.error('Database query error:', err);
                    return res.status(500).send('Internal Server Error');
                }

                if (result.length === 0) {
                    return res.status(404).send('User not found');
                }

                Object.keys(result[0]).forEach(function(key) {
                    if (result[0][key] === null) {
                        result[0][key] = '';
                    }
                });
                res.send(result[0]);
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    updateuser: (req, res) => {
        try {
            let usr = req.body.userid;
            if (!usr) {
                return res.status(400).send('Invalid parameters');
            }

            let q = `
        UPDATE users SET 
          firstname = ?, 
          lastname = ?, 
          name = ?, 
          division = ?, 
          phone = ?, 
          work = ?, 
          dob = ?, 
          role = ?
        WHERE email = ?`;

            let values = [
                req.body.first,
                req.body.last,
                req.body.name,
                req.body.department,
                req.body.phone,
                req.body.work,
                req.body.dob,
                req.body.role,
                usr
            ];

            db.query(q, values, (err, result) => {
                if (err) {
                    console.error('Database query error:', err);
                    return res.status(500).send('Internal Server Error');
                }

                res.sendStatus(200);
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    getEmployees_admin: (req, res) => {
        try {
            let user = req.body.user;

            if (!user) {
                return res.status(400).send('Invalid parameters');
            }

            let userQuery = `
        select role, division 
        from users 
        where email = ?
      `;

            db.query(userQuery, [user], (err, userResult) => {
                if (err) {
                    console.error('Database query error:', err);
                    return res.status(500).send('Internal Server Error');
                }

                if (userResult.length === 0) {
                    return res.status(404).send('User not found');
                }

                let userRole = userResult[0].role;
                let userDivision = userResult[0].division;
                let q;

                switch (userRole) {
                    case 'superadmin':
                        q = `
              select email, name, division,
              (select date_format(max(updated_at), '%m/%d/%Y') from survey where userid = email) as lastsurvey,
              (select sum(answer) from survey where userid = email) as comp,
              (select (count(*) * 5) from survey where userid = email) as tot 
              from users 
              where status = 'active' and email != 'justin@cdlconsultants.com' and role IN ('admin', 'manager', 'user')
            `;
                        break;
                    case 'admin':
                        q = `
              select email, name, division,
              (select date_format(max(updated_at), '%m/%d/%Y') from survey where userid = email) as lastsurvey,
              (select sum(answer) from survey where userid = email) as comp,
              (select (count(*) * 5) from survey where userid = email) as tot 
              from users 
              where status = 'active' and email != 'justin@cdlconsultants.com' and role IN ('manager', 'user')
            `;
                        break;
                    case 'manager':
                        q = `
              select email, name, division,
              (select date_format(max(updated_at), '%m/%d/%Y') from survey where userid = email) as lastsurvey,
              (select sum(answer) from survey where userid = email) as comp,
              (select (count(*) * 5) from survey where userid = email) as tot 
              from users 
              where status = 'active' and email != 'justin@cdlconsultants.com' and role = 'user' and division = ?
            `;
                        break;
                    default:
                        return res.status(400).send('Invalid role type');
                }

                db.query(q, [userDivision], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return res.status(500).send('Internal Server Error');
                    }

                    res.send(result);
                });
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            res.status(500).send('Internal Server Error');
        }
    },
};