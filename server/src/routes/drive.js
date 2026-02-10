import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../utils/db.js';

const router = express.Router();

router.use(requireAuth);

const VALID_KEYS = ['progetti', 'task', 'routine', 'progresso', 'schede', 'allenamenti', 'timeblocks'];

/**
 * GET /api/drive/data
 * Carica tutti i dati dal database PostgreSQL
 */
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, data FROM app_data WHERE key = ANY($1)',
      [VALID_KEYS]
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
    res.status(500).json({
      error: 'Errore nel caricamento dei dati',
      message: error.message
    });
  }
});

/**
 * POST /api/drive/save
 * Salva i dati nel database PostgreSQL
 */
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
          `INSERT INTO app_data (key, data, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
          [key, JSON.stringify(req.body[key])]
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
    res.status(500).json({
      error: 'Errore nel salvataggio dei dati',
      message: error.message
    });
  }
});

export default router;
