import { google } from 'googleapis';
import { getAuthenticatedClient } from '../routes/auth.js';

export async function getCalendarEvents(userId, timeMin, timeMax) {
  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'Europe/Rome'
    });

    const events = response.data.items || [];

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
      isAllDay: !event.start.dateTime
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw new Error(`Calendar API error: ${error.message}`);
  }
}

export async function getCalendarList(userId) {
  try {
    const auth = await getAuthenticatedClient(userId);
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
    console.error('Error fetching calendar list:', error);
    throw new Error(`Calendar List API error: ${error.message}`);
  }
}
