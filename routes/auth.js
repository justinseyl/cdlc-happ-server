const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const generator = require('generate-password');
const db = require('../conn.js');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();
const upload = multer();

const transporter = nodemailer.createTransport({
    host: 'p3plzcpnl505688.prod.phx3.secureserver.net',
    port: 465,
    secure: true,
    auth: {
        user: 'automated@cdlchappiness.com',
        pass: '38{jr7E{4NJ{'
    }
});

const login = (req, res) => {
    const { username: usr_email, password: usr_pass } = req.body;
    const staySignedIn = req.body.staySignedIn;

    const query_find = `SELECT * FROM users WHERE status = 'active' AND email = ? AND password = ?`;

    db.query(query_find, [usr_email, usr_pass], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server error');
            return;
        }

        if (result.length > 0) {
            req.session.user = {
                login: usr_email,
                admin: result[0].admin,
                role: result[0].role,
                division: result[0].division,
                onboarding_completed: result[0].onboarding_completed, 
            };

            if (staySignedIn) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
            } else {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
            }

            if (!result[0].onboarding_completed) {
                res.redirect('/auth/onboarding');
            } else {
                res.redirect('/');
            }
        } else {
            res.render('login', { error: 'Invalid username or password' });
        }
    });
};


const getTempPass = (email) => {
    return new Promise((resolve, reject) => {
        const password = generator.generate({
            length: 10,
            numbers: true
        });

        const query_update = "UPDATE users SET temp = ? WHERE email = ? LIMIT 1";
        
        db.query(query_update, [password, email], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(password);
            }
        });
    });
};

const forgotPass = async (req, res) => {
    const usr_email = req.body.email;
    res.redirect('/login');

    try {
        const results = await getTempPass(usr_email);
        const host = req.get('host');
        const recoveryUrl = `http://${host}/auth/recovery`;

        const mailOptionsRecover = {
            from: 'automated@cdlchappiness.com',
            to: usr_email,
            subject: 'Your CDLC Happiness Password Recovery',
            text: `Your Temporary Password is: ${results}\n${recoveryUrl}`
        };

        transporter.sendMail(mailOptionsRecover, (error, info) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Email sent: ${info.response}`);
            }
        });
    } catch (error) {
        console.error(error);
    }
};

const signup = (req, res) => {
    const { email: usr_email, password: usr_pass, confirm_password, division: usr_div } = req.body;
    const usr_created = moment().format();

    if (usr_pass !== confirm_password) {
        return res.render('register', { error: 'Passwords do not match' });
    }

    const query_find = "SELECT * FROM users WHERE email = ?";

    db.query(query_find, [usr_email], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server error');
            return;
        }

        if (result.length > 0) {
            res.render('register', { error: 'Username already exists' });
        } else {
            const query_insert = "INSERT INTO users (email, password, division, created_at, status, onboarding_completed) VALUES (?, ?, ?, ?, 'active', 0)";
            db.query(query_insert, [usr_email, usr_pass, usr_div, usr_created], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Server error');
                    return;
                }

                const alert_query = "INSERT INTO alerts (id, title, content, updated_at, type, status) VALUES (?, 'New User Sign Up', ?, ?, 'admin', 'unread')";
                db.query(alert_query, [uuidv4(), `User with email ${usr_email} has signed up`, moment().format("YYYY-MM-DD HH:mm:ss")], (err, result) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send('Server error');
                        return;
                    }

                    res.redirect('/login');
                });
            });
        }
    });
};


const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Server error');
      return;
    }
    res.redirect('/login');
  });
};

router.get('/onboarding', isAuthenticated, (req, res) => {
  res.render('onboarding', { user: req.session.user });
});

router.post('/onboarding', isAuthenticated, (req, res) => {
    const userId = req.session.user.login;
    const {
        first_name,
        last_name,
        personal_email,
        phone_number,
        date_of_birth,
        home_address,
        city,
        state,
        zip,
        marital_status,
        work_email,
        department,
        emergency_first_name,
        emergency_last_name,
        emergency_relationship,
        emergency_email,
        emergency_phone_number
    } = req.body;

    const query_update_user = `UPDATE users SET firstname = ?, lastname = ?, personalemail = ?, onboarding_completed = 1 WHERE email = ?`;
    db.query(query_update_user, [first_name, last_name, personal_email, userId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server error');
            return;
        }

        const query_insert_details = `
            INSERT INTO user_details (
                email, personal_email, phone_number, date_of_birth, home_address, city, state, zip, marital_status, work_email, department, 
                emergency_first_name, emergency_last_name, emergency_relationship, emergency_email, emergency_phone_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                personal_email = VALUES(personal_email),
                phone_number = VALUES(phone_number),
                date_of_birth = VALUES(date_of_birth),
                home_address = VALUES(home_address),
                city = VALUES(city),
                state = VALUES(state),
                zip = VALUES(zip),
                marital_status = VALUES(marital_status),
                work_email = VALUES(work_email),
                department = VALUES(department),
                emergency_first_name = VALUES(emergency_first_name),
                emergency_last_name = VALUES(emergency_last_name),
                emergency_relationship = VALUES(emergency_relationship),
                emergency_email = VALUES(emergency_email),
                emergency_phone_number = VALUES(emergency_phone_number);
        `;

        db.query(query_insert_details, [
            userId, personal_email, phone_number, date_of_birth, home_address, city, state, zip, marital_status, work_email, department,
            emergency_first_name, emergency_last_name, emergency_relationship, emergency_email, emergency_phone_number
        ], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Server error');
                return;
            }

            req.session.user.onboarding_completed = true;
            res.redirect('/');
        });
    });
});

router.post('/recovery/submit', (req, res) => {
    const { email, temppassword, password } = req.body;

    const query_find_user = "SELECT * FROM users WHERE email = ? AND temp = ?";
    db.query(query_find_user, [email, temppassword], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        if (result.length > 0) {
            const query_update_password = "UPDATE users SET password = ?, temp = NULL WHERE email = ? AND temp = ?";
            db.query(query_update_password, [password, email, temppassword], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }

                res.redirect('/login');
            });
        } else {
            res.send('Invalid temporary password or email.');
        }
    });
});


router.post('/login', login);
router.post('/signup', upload.fields([
    { name: 'authorization_form', maxCount: 1 },
    { name: 'drivers_license', maxCount: 1 },
    { name: 'w4_form', maxCount: 1 }
]), signup);
router.post('/forgot', forgotPass);
router.get('/logout', logout);

router.get('/companies', (req, res) => {
  res.render('companies');
});
router.get('/recovery', (req, res) => {
  res.render('recovery');
});

module.exports = router;
