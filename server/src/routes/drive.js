import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../utils/db.js';

const router = express.Router();

router.use(requireAuth);

const VALID_KEYS = ['progetti', 'task', 'routine', 'progresso', 'schede', 'allenamenti', 'timeblocks'];

// GET /api/drive/data - Load all data for the authenticated user
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, data FROM app_data WHERE user_id = $1 AND key = ANY($2)',
      [req.userId, VALID_KEYS]
    );

    const data = {};
    VALID_KEYS.forEach(key => { data[key] = []; });
    result.rows.forEach(row => { data[row.key] = row.data; });

    res.json({
      success: true,
      data,
      loadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading data from DB:', error);
    res.status(500).json({ error: 'Errore nel caricamento dei dati' });
  }
});

// POST /api/drive/save - Save data for the authenticated user
router.post('/save', async (req, res) => {
  try {
    const savedKeys = [];

    for (const key of VALID_KEYS) {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        if (!Array.isArray(req.body[key])) {
          return res.status(400).json({
            error: 'Formato non valido',
            message: `${key} deve essere un array`
          });
        }

        await pool.query(
          `INSERT INTO app_data (user_id, key, data, updated_at) VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, key) DO UPDATE SET data = $3, updated_at = NOW()`,
          [req.userId, key, JSON.stringify(req.body[key])]
        );
        savedKeys.push(key);
      }
    }

    if (savedKeys.length === 0) {
      return res.status(400).json({
        error: 'Nessun dato da salvare',
        message: 'Devi fornire almeno uno tra: ' + VALID_KEYS.join(', ')
      });
    }

    res.json({
      success: true,
      message: 'Dati salvati con successo',
      savedAt: new Date().toISOString(),
      saved: savedKeys
    });
  } catch (error) {
    console.error('Error saving data to DB:', error);
    res.status(500).json({ error: 'Errore nel salvataggio dei dati' });
  }
});

export default router;
