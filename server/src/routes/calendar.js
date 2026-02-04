import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCalendarEvents, getCalendarList } from '../services/googleCalendar.js';

const router = express.Router();

// Tutti gli endpoint calendar richiedono autenticazione
router.use(requireAuth);

/**
 * GET /api/calendar/events?start=2026-02-03&end=2026-02-10
 * Ottieni eventi dal Google Calendar in un range di date
 */
router.get('/events', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validazione parametri
    if (!start || !end) {
      return res.status(400).json({
        error: 'Parametri mancanti',
        message: 'I parametri start e end sono obbligatori (formato: YYYY-MM-DD)'
      });
    }

    // Converti le date in ISO 8601 con timezone
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Date non valide',
        message: 'Le date devono essere nel formato YYYY-MM-DD'
      });
    }

    // Aggiungi timezone Europe/Rome
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    const events = await getCalendarEvents(timeMin, timeMax);

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      error: 'Errore nel recupero degli eventi',
      message: error.message
    });
  }
});

/**
 * GET /api/calendar/list
 * Ottieni la lista di tutti i calendari disponibili
 */
router.get('/list', async (req, res) => {
  try {
    const calendars = await getCalendarList();

    res.json({
      success: true,
      count: calendars.length,
      calendars
    });
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    res.status(500).json({
      error: 'Errore nel recupero dei calendari',
      message: error.message
    });
  }
});

export default router;
