import { loadTokens } from '../utils/tokenStorage.js';

export const requireAuth = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'Non autenticato',
        message: 'Devi effettuare il login con Google'
      });
    }

    const tokens = await loadTokens(userId);
    if (!tokens || !tokens.access_token) {
      return res.status(401).json({
        error: 'Non autenticato',
        message: 'Devi effettuare il login con Google'
      });
    }

    req.userId = userId;
    req.tokens = tokens;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Auth error' });
  }
};
