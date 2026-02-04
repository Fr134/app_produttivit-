import { loadTokens } from '../utils/tokenStorage.js';

/**
 * Middleware per verificare che l'utente sia autenticato
 * Controlla se esiste un token valido salvato
 */
export const requireAuth = async (req, res, next) => {
  try {
    const tokens = await loadTokens();

    if (!tokens || !tokens.access_token) {
      return res.status(401).json({
        error: 'Non autenticato',
        message: 'Devi effettuare il login con Google'
      });
    }

    // Aggiungi i token alla request per usarli nei controller
    req.tokens = tokens;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Errore di autenticazione',
      message: error.message
    });
  }
};

/**
 * Middleware opzionale che carica i token se disponibili
 * Non blocca la richiesta se l'utente non è autenticato
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const tokens = await loadTokens();
    req.tokens = tokens || null;
    next();
  } catch (error) {
    req.tokens = null;
    next();
  }
};
