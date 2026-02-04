import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadAllData, saveAllData } from '../services/googleDrive.js';

const router = express.Router();

// Tutti gli endpoint drive richiedono autenticazione
router.use(requireAuth);

/**
 * GET /api/drive/data
 * Carica tutti i dati dai CSV su Google Drive
 */
router.get('/data', async (req, res) => {
  try {
    const data = await loadAllData();

    // Rimuovi i fileId dalla risposta (info interna)
    const response = {
      progetti: data.progetti.data,
      task: data.task.data,
      routine: data.routine.data,
      progresso: data.progresso.data,
      schede: data.schede.data,
      allenamenti: data.allenamenti.data
    };

    res.json({
      success: true,
      data: response,
      loadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading data from Drive:', error);
    res.status(500).json({
      error: 'Errore nel caricamento dei dati',
      message: error.message
    });
  }
});

/**
 * POST /api/drive/save
 * Salva i dati sui CSV su Google Drive
 *
 * Body: { progetti, task, routine, progresso, schede, allenamenti }
 * Puoi inviare solo i dati che vuoi aggiornare
 */
router.post('/save', async (req, res) => {
  try {
    const { progetti, task, routine, progresso, schede, allenamenti } = req.body;

    // Validazione: almeno un campo deve essere presente
    if (!progetti && !task && !routine && !progresso && !schede && !allenamenti) {
      return res.status(400).json({
        error: 'Nessun dato da salvare',
        message: 'Devi fornire almeno uno tra: progetti, task, routine, progresso, schede, allenamenti'
      });
    }

    // Prepara i dati da salvare
    const dataToSave = {};

    if (progetti) {
      if (!Array.isArray(progetti)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'progetti deve essere un array'
        });
      }
      dataToSave.progetti = progetti;
    }

    if (task) {
      if (!Array.isArray(task)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'task deve essere un array'
        });
      }
      dataToSave.task = task;
    }

    if (routine) {
      if (!Array.isArray(routine)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'routine deve essere un array'
        });
      }
      dataToSave.routine = routine;
    }

    if (progresso) {
      if (!Array.isArray(progresso)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'progresso deve essere un array'
        });
      }
      dataToSave.progresso = progresso;
    }

    if (schede) {
      if (!Array.isArray(schede)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'schede deve essere un array'
        });
      }
      dataToSave.schede = schede;
    }

    if (allenamenti) {
      if (!Array.isArray(allenamenti)) {
        return res.status(400).json({
          error: 'Formato non valido',
          message: 'allenamenti deve essere un array'
        });
      }
      dataToSave.allenamenti = allenamenti;
    }

    await saveAllData(dataToSave);

    res.json({
      success: true,
      message: 'Dati salvati con successo',
      savedAt: new Date().toISOString(),
      saved: Object.keys(dataToSave)
    });
  } catch (error) {
    console.error('Error saving data to Drive:', error);
    res.status(500).json({
      error: 'Errore nel salvataggio dei dati',
      message: error.message
    });
  }
});

export default router;
