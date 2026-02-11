import express from 'express';
import { google } from 'googleapis';
import { saveTokens, loadTokens, deleteTokens } from '../utils/tokenStorage.js';
import { migrateOldDataToUser } from '../utils/db.js';
import pool from '../utils/db.js';

const router = express.Router();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile'
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /auth/google - Start OAuth flow
router.get('/google', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth URL error:', error);
    res.status(500).json({ error: 'OAuth configuration error' });
  }
});

// GET /auth/google/callback - OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error || !code) {
    return res.redirect(`${frontendUrl}?auth=error&message=${error || 'no_code'}`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Google user profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const googleId = profile.id;
    const email = profile.email;
    const name = profile.name || email;
    const picture = profile.picture || '';

    // Upsert user in database
    await pool.query(
      `INSERT INTO users (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET email = $2, name = $3, picture = $4`,
      [googleId, email, name, picture]
    );

    // Save tokens for this user
    await saveTokens(googleId, tokens);

    // Migrate old single-user data to this user (if any)
    await migrateOldDataToUser(googleId);

    // Store userId in session
    req.session.userId = googleId;

    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${frontendUrl}?auth=error&message=token_exchange_failed`);
  }
});

// GET /auth/status - Check auth status
router.get('/status', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.json({ authenticated: false });
    }

    const tokens = await loadTokens(userId);
    if (!tokens || !tokens.access_token) {
      return res.json({ authenticated: false });
    }

    // Load user info
    const userResult = await pool.query(
      'SELECT name, email, picture FROM users WHERE google_id = $1',
      [userId]
    );
    const user = userResult.rows[0] || null;

    res.json({
      authenticated: true,
      expiryDate: tokens.expiry_date || null,
      user: user ? { name: user.name, email: user.email, picture: user.picture } : null
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Auth status error' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (userId) {
      await deleteTokens(userId);
    }

    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
      res.json({ success: true, message: 'Logout effettuato' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout error' });
  }
});

// Utility: get authenticated OAuth2 client for a specific user
export async function getAuthenticatedClient(userId) {
  const tokens = await loadTokens(userId);
  if (!tokens) {
    throw new Error('User not authenticated');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh tokens
  oauth2Client.on('tokens', async (newTokens) => {
    const updatedTokens = { ...tokens, ...newTokens };
    await saveTokens(userId, updatedTokens);
  });

  return oauth2Client;
}

export default router;
