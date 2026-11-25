const express = require('express');
const path = require('path');
const pool = require('./db');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin Login Check
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, token: process.env.ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, message: 'Galat password!' });
});

// Get All Websites (Public Home)
app.get('/api/websites', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, website_name, website_link, description, contact, created_at FROM websites_info ORDER BY id DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database fetch error' });
  }
});

// Add New Website (Admin Only)
app.post('/api/websites', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized! Pehle login karein.' });
  }

  const { name, website_name, website_link, description, contact } = req.body;
  if (!name || !website_name || !website_link) {
    return res.status(400).json({
      success: false,
      message: 'Name, Website Name, aur Website Link zaroori hain'
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO websites_info (name, website_name, website_link, description, contact)
       VALUES (?, ?, ?, ?, ?)`,
      [name, website_name, website_link, description || '', contact || '']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database insert error' });
  }
});

// Delete Website (Admin Only)
app.delete('/api/websites/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized!' });
  }

  try {
    await pool.execute('DELETE FROM websites_info WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete error' });
  }
});


// Contact Form Submission


const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Contact Form Email Endpoint
app.post('/api/contact', async (req, res) => {
  const { senderName, senderEmail, senderMessage, senderPhone } = req.body;

  if (!senderName || !senderEmail || !senderMessage || !senderPhone) {
    return res.status(400).json({
      success: false,
      message: 'Naam, email, message aur phone sab zaroori hain.'
    });
  }

  try {
    await mailTransporter.sendMail({
      from: `"${senderName} via project_contact" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: senderEmail,
      subject: `New Inquiry from ${senderName} (${senderEmail})`,
      text: `From Name: ${senderName}\nFrom Email: ${senderEmail}\nPhone: ${senderPhone}\n\nMessage:\n${senderMessage}`
    });

    res.json({ success: true, message: 'Message Gmail par send ho gaya!' });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ success: false, message: 'Email send karne mein error aaya.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});