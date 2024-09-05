const express = require('express');
const { v4: uuid } = require('uuid');
const moment = require('moment');
const { queryAsync } = require('../conn.js');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const router = express.Router();

// S3 client configuration
const s3Client = new S3Client({
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'DO0072TZJZ2ANWUK4J7H',  // Replace with actual credentials
    secretAccessKey: 'PuNTcHfC0lOr5Jud3Cnq6t8LDEGxUVaGdiBQvQEwxy0'  // Replace with actual credentials
  }
});

// Multer configuration for file uploads
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

// Fetch all active books with aggregated rating, review count, and read status for the current user
const getAllBooksWithReadStatus = async (userId) => {
  const query = `
    SELECT 
        b.id, 
        b.name, 
        b.author, 
        b.description, 
        CONCAT('${baseUrl}', b.image) AS image, 
        COALESCE(ROUND((SUM(w.rating) / COUNT(w.rating)), 1), 0) AS rating, 
        COUNT(w.rating) AS reviews,
        ub.status AS readStatus
    FROM 
        books b
    LEFT JOIN 
        book_reviews w ON w.bookid = b.id 
    LEFT JOIN 
        userbooks ub ON ub.bookid = b.id AND ub.userid = '${userId}'  -- Join to get the read status for the current user
    WHERE 
        b.status = 'active'
    GROUP BY 
        b.id, ub.status
  `;
  return await queryAsync(query);
};

// Render the books page with read status
const renderBooksPage = async (req, res) => {
  try {
    const userId = req.session.user.login;
    const books = await getAllBooksWithReadStatus(userId);
    console.log(books)
    res.render('user/books', {
      books,
      user: req.session.user,
      isAdmin: ['admin', 'superadmin'].includes(req.session.user.role),
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).send('An error occurred while fetching books.');
  }
};


// Route to get all books
router.get('/', isAuthenticated, renderBooksPage);

// Route to add a new book
router.post('/add', isAuthenticated, isAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { title, author, description } = req.body;
  const filename = req.file.originalname;

  const query = `
    INSERT INTO books (id, name, author, description, image, status) 
    VALUES ('${uuid()}', '${title}', '${author}', '${description}', '${filename}', 'active')
  `;
  try {
    await queryAsync(query);

    const alertQuery = `
      INSERT INTO alerts (id, title, content, updated_at, type, status) 
      VALUES ('${uuid()}', 'New Book Added', 'A new book is now available for you.', '${moment().format("YYYY-MM-DD HH:mm:ss")}', 'user', 'unread')
    `;
    await queryAsync(alertQuery);

    res.redirect('/books');
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).send('An error occurred while adding the book.');
  }
});

// Route to edit a book
router.post('/edit', isAuthenticated, isAdmin, async (req, res) => {
  const { bookId, title, author, description } = req.body;

  const query = `
    UPDATE books 
    SET name = '${title}', author = '${author}', description = '${description}' 
    WHERE id = '${bookId}'
  `;
  try {
    await queryAsync(query);
    res.redirect('/books');
  } catch (error) {
    console.error('Error editing book:', error);
    res.status(500).send('An error occurred while editing the book.');
  }
});

// Route to delete a book (soft delete by setting status to 'inactive')
router.post('/delete', isAuthenticated, isAdmin, async (req, res) => {
  const { bookId } = req.body;

  const query = `
    UPDATE books 
    SET status = 'inactive' 
    WHERE id = '${bookId}'
  `;
  try {
    await queryAsync(query);
    res.redirect('/books');
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).send('An error occurred while deleting the book.');
  }
});

router.post('/mark-read', isAuthenticated, async (req, res) => {
  const { bookid } = req.body;
  const userId = req.session.user.login;

  const query = `
    INSERT INTO userbooks (userid, bookid, status, created) 
    VALUES ('${userId}', '${bookid}', 'read', '${moment().format("YYYY-MM-DD HH:mm:ss")}')
  `;
  try {
    await queryAsync(query);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while marking the book as read.');
  }
});

router.post('/mark-unread', isAuthenticated, async (req, res) => {
  const { bookid } = req.body;
  const userId = req.session.user.login;

  const query = `
    DELETE FROM userbooks 
    WHERE userid = '${userId}' AND bookid = '${bookid}'
  `;
  try {
    await queryAsync(query);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while marking the book as unread.');
  }
});


// Route to review a book
router.post('/review', isAuthenticated, async (req, res) => {
  const { bookid, reviews, content, subject } = req.body;
  const userId = req.session.user.login;

  const query = `
    INSERT INTO book_reviews (id, bookid, rating, review, userid, created, title) 
    VALUES ('${uuid()}', '${bookid}', '${reviews}', '${content}', '${userId}', '${moment().format("YYYY-MM-DD HH:mm:ss")}', '${subject}')
  `;
  try {
    await queryAsync(query);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).send('An error occurred while submitting the review.');
  }
});

module.exports = router;
