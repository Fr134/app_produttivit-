import express from 'express';
import { google } from 'googleapis';
import { saveTokens, loadTokens, deleteTokens, hasTokens } from '../utils/tokenStorage.js';

const router = express.Router();

// Scopes richiesti per Google Calendar (readonly)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly'
];

/**
 * Crea un client OAuth2 con le credenziali
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * GET /auth/google
 * Inizia il flow OAuth2 - reindirizza l'utente alla pagina di consenso Google
 */
router.get('/google', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Ottieni refresh token
      scope: SCOPES,
      prompt: 'consent' // Forza il consenso per ottenere sempre il refresh token
    });

    console.log('🔐 Reindirizzamento a Google OAuth...');
    res.redirect(authUrl);
  } catch (error) {
    console.error('Errore nella generazione dell\'URL OAuth:', error);
    res.status(500).json({
      error: 'Errore di configurazione OAuth',
      message: error.message
    });
  }
});

/**
 * GET /auth/google/callback
 * Callback OAuth2 - Google reindirizza qui dopo il consenso dell'utente
 */
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    console.error('❌ Errore OAuth callback:', error);
    return res.redirect(`${frontendUrl}?auth=error&message=${error}`);
  }

  if (!code) {
    console.error('❌ Nessun codice di autorizzazione ricevuto');
    return res.redirect(`${frontendUrl}?auth=error&message=no_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();

    // Scambia il codice con i token
    const { tokens } = await oauth2Client.getToken(code);

    console.log('✅ Token ricevuti da Google');

    // Salva i token su file
    await saveTokens(tokens);

    console.log('✅ Autenticazione completata con successo');

    // Reindirizza al frontend con successo
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('❌ Errore durante lo scambio del codice:', error);
    res.redirect(`${frontendUrl}?auth=error&message=token_exchange_failed`);
  }
});

/**
 * GET /auth/status
 * Verifica se l'utente è autenticato
 */
router.get('/status', async (req, res) => {
  try {
    const authenticated = await hasTokens();
    const tokens = authenticated ? await loadTokens() : null;

    res.json({
      authenticated,
      expiryDate: tokens?.expiry_date || null
    });
  } catch (error) {
    console.error('Errore nella verifica dello stato:', error);
    res.status(500).json({
      error: 'Errore nella verifica dello stato',
      message: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout - elimina i token salvati
 */
router.post('/logout', async (req, res) => {
  try {
    await deleteTokens();

    console.log('👋 Logout effettuato');

    res.json({
      success: true,
      message: 'Logout effettuato con successo'
    });
  } catch (error) {
    console.error('Errore durante il logout:', error);
    res.status(500).json({
      error: 'Errore durante il logout',
      message: error.message
    });
  }
});

/**
 * Utility function per ottenere un client autenticato
 * Riutilizzabile in altri moduli
 */
export async function getAuthenticatedClient() {
  const tokens = await loadTokens();

  if (!tokens) {
    throw new Error('Utente non autenticato');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Gestione automatica del refresh token
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('🔄 Token rinnovati automaticamente');

    // Merge con i token esistenti (mantieni refresh_token se non presente nei nuovi)
    const updatedTokens = {
      ...tokens,
      ...newTokens
    };

    await saveTokens(updatedTokens);
  });

  return oauth2Client;
}

export default router;
