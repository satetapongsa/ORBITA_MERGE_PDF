import express from 'express';
import cors from 'cors';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, is_pro',
      [email, password] // In a real app, hash this password!
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query(
      'SELECT id, email, is_pro FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Auth (Backend placeholder for Google JWT token verification)
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  const mockEmail = 'google.user@orbita.com';
  
  try {
    // Find or create the user in the database
    let result = await pool.query('SELECT id, email, is_pro FROM users WHERE email = $1', [mockEmail]);
    
    if (result.rows.length === 0) {
      // Auto-register Google user and default to true for preview
      result = await pool.query(
        'INSERT INTO users (email, password, is_pro) VALUES ($1, $2, $3) RETURNING id, email, is_pro',
        [mockEmail, 'oauth-managed-account', true]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscribe
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET is_pro = true WHERE email = $1 RETURNING id, email, is_pro',
      [email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Setup table if not exists
app.post('/api/setup', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_pro BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.json({ message: 'Table ensured.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Backend Server running on port ${port}`);
  });
}

export default app;
