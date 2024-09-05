// books.js

const moment = require('moment');
const db = require('../conn.js');
const uuid = require('uuid').v4;
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3Client = new S3Client({
    endpoint: 'https://nyc3.digitaloceanspaces.com',
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'DO0072TZJZ2ANWUK4J7H',
        secretAccessKey: 'PuNTcHfC0lOr5Jud3Cnq6t8LDEGxUVaGdiBQvQEwxy0'
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: 'cdlc-books',
        acl: 'public-read',
        key: function (request, file, cb) {
            cb(null, file.originalname);
        }
    })
});

const baseUrl = 'https://cdlc-books.nyc3.cdn.digitaloceanspaces.com/';

module.exports = {
    addNewBook: (req, res) => {
        upload.single('image')(req, res, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
            if (!req.file) {
                return res.status(400).send('No file uploaded.');
            }
            let filename = req.file.originalname;
            let q = "INSERT INTO books (id, name, author, description, image, status) VALUES (?, ?, ?, ?, ?, 'active')";
            db.query(q, [uuid(), req.body.title, req.body.auth, req.body.desc, filename], (err, result) => {
                if (err) throw err;
                let alert_query = "INSERT INTO alerts (id, title, content, updated_at, type, status) VALUES (?, 'New Book Added', 'A new book is now available for you.', ?, 'user', 'unread')";
                db.query(alert_query, [uuid(), moment().format("YYYY-MM-DD HH:mm:ss")], (err, result) => {
                    if (err) throw err;
                    res.sendStatus(200);
                });
            });
        });
    },
    getBooks_admin: (req, res) => {
        let q = "SELECT b.id, b.name, b.author, b.description, b.image, COALESCE(ROUND((SUM(w.rating)/COUNT(w.rating)),1),0) AS rating, COUNT(w.rating) AS reviews FROM books b LEFT JOIN book_reviews w ON w.bookid = b.id WHERE b.status = 'active' GROUP BY b.id ORDER BY updated_at DESC";
        db.query(q, (err, result) => {
            if (err) throw err;
            // Construct the full URL for each book image
            result.forEach(book => {
                book.image = baseUrl + book.image;
            });
            res.send(result);
        });
    },
    editBookSave: (req, res) => {
        let q = "UPDATE books SET name = ?, author = ?, description = ?, image = ? WHERE id = ?";
        db.query(q, [req.body.title, req.body.auth, req.body.desc, req.body.img, req.body.id], (err, result) => {
            if (err) throw err;
            res.sendStatus(200);
        });
    },
    deleteBook: (req, res) => {
        let q = "UPDATE books SET status = 'inactive' WHERE id = ?";
        db.query(q, [req.body.id], (err, result) => {
            if (err) throw err;
            res.sendStatus(200);
        });
    },
    getUnreadBooks: (req, res) => {
        let usr = req.body.userid;
        let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and (u.userid is null or u.userid = ?) group by b.id";
        db.query(q, [usr], (err, result) => {
            if (err) throw err;
            result.forEach(book => {
                book.image = baseUrl + book.image;
            });
            res.send(result);
        });
    },
    getusercompletedbooks: (req, res) => {
        let usr = req.body.userid;
        let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews,date_format(u.created,'%m/%d/%Y') as created from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and u.userid = ? and u.status = 'read' group by b.id";
        db.query(q, [usr], (err, result) => {
            if (err) throw err;
            result.forEach(book => {
                book.image = baseUrl + book.image;
            });
            res.send(result);
        });
    },
    getUnreadBooksById: (req, res) => {
        let id = req.body.id;
        let q = "select b.name,b.author,b.description,b.image,r.title as review_title,r.review as review_content,date_format(r.created,'%m/%d/%Y') as review_date,r.rating as review_rating,u.name as user_name from books b left join book_reviews r on r.bookid = b.id left join users u on u.email = r.userid where b.status = 'active' and b.id = ?";
        db.query(q, [id], (err, result) => {
            if (err) throw err;
            result.forEach(book => {
                book.image = baseUrl + book.image;
            });
            res.send(result);
        });
    },
    getIncompleteBooks: (req, res) => {
        let usr = req.body.userid;
        let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews,date_format(u.created,'%m/%d/%Y') as created from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and (u.userid is null or u.userid != ?) group by b.id";
        db.query(q, [usr], (err, result) => {
            if (err) throw err;
            result.forEach(book => {
                book.image = baseUrl + book.image;
            });
            res.send(result);
        });
    },
    unreadToRead: (req, res) => {
        let usr = req.body.userid;
        let id = req.body.bookid;
        let q = "insert into userbooks (userid,bookid,status,created) values (?,?,'read',?)";
        db.query(q, [usr, id, moment().format("YYYY-MM-DD HH:mm:ss")], (err, result) => {
            if (err) throw err;
            let alert_query = "insert into alerts (id,title,content,updated_at,type,status) values (?,?,?,?,?,'unread')";
            db.query(alert_query, [uuid(), 'Book Read', `User ${usr} has moved a book from unread to read.`, moment().format("YYYY-MM-DD HH:mm:ss"), 'admin'], (err, result) => {
                if (err) throw err;
                res.sendStatus(200);
            });
        });
    },
    readToUnread: (req, res) => {
        let usr = req.body.userid;
        let id = req.body.bookid;
        let q = "delete from userbooks where userid = ? and bookid = ?";
        db.query(q, [usr, id], (err, result) => {
            if (err) throw err;
            let alert_query = "insert into alerts (id,title,content,updated_at,type,status) values (?,?,?,?,?,'unread')";
            db.query(alert_query, [uuid(), 'Book Un-Read', `User ${usr} has moved a book from read to unread.`, moment().format("YYYY-MM-DD HH:mm:ss"), 'admin'], (err, result) => {
                if (err) throw err;
                res.sendStatus(200);
            });
        });
    },
    submitReview: (req, res) => {
        let usr = req.body.userid;
        let bookid = req.body.bookid;
        let rating = req.body.reviews;
        let review = req.body.content;
        let subject = req.body.subject;
        let q = "insert into book_reviews (id, bookid, rating, review, userid, created, title) values (?,?,?,?,?,?,?)";
        db.query(q, [uuid(), bookid, rating, review, usr, moment().format("YYYY-MM-DD HH:mm:ss"), subject], (err, result) => {
            if (err) throw err;
            let alert_query = "insert into alerts (id,title,content,updated_at,type,status) values (?,?,?,?,?,'unread')";
            db.query(alert_query, [uuid(), 'New Book Review', `User ${usr} has reviewed a book.`, moment().format("YYYY-MM-DD HH:mm:ss"), 'admin'], (err, result) => {
                if (err) throw err;
                let userbook_query = "insert into userbooks (userid,bookid,status,created) values (?,?,?,?)";
                db.query(userbook_query, [usr, bookid, 'read', moment().format("YYYY-MM-DD HH:mm:ss")], (err, result) => {
                    if (err) throw err;
                    res.sendStatus(200);
                });
            });
        });
    }
};
