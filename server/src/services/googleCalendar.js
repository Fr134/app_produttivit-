import { google } from 'googleapis';
import { getAuthenticatedClient } from '../routes/auth.js';

/**
 * Ottieni eventi dal Google Calendar
 * @param {string} timeMin - Data inizio (ISO 8601)
 * @param {string} timeMax - Data fine (ISO 8601)
 * @returns {Array} Lista eventi
 */
export async function getCalendarEvents(timeMin, timeMax) {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth });

    console.log(`📅 Recupero eventi dal ${timeMin} al ${timeMax}`);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'Europe/Rome'
    });

    const events = response.data.items || [];

    console.log(`✅ ${events.length} eventi recuperati`);

    // Trasforma gli eventi in un formato più semplice per il frontend
    return events.map(event => ({
      id: event.id,
      title: event.summary || 'Senza titolo',
      description: event.description || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location || '',
      attendees: event.attendees
        ? event.attendees.map(a => a.displayName || a.email)
        : [],
      htmlLink: event.htmlLink,
      isAllDay: !event.start.dateTime // Se non ha dateTime, è un evento all-day
    }));
  } catch (error) {
    console.error('❌ Errore nel recupero eventi:', error);
    throw new Error(`Calendar API error: ${error.message}`);
  }
}

/**
 * Ottieni lista dei calendari disponibili
 * @returns {Array} Lista calendari
 */
export async function getCalendarList() {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    return calendars.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor
    }));
  } catch (error) {
    console.error('❌ Errore nel recupero lista calendari:', error);
    throw new Error(`Calendar List API error: ${error.message}`);
  }
}
