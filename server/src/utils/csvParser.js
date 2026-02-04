import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Parse CSV string to array of objects
 * @param {string} csvString - CSV content as string
 * @returns {Array} Array of objects
 */
export function parseCSV(csvString) {
  try {
    if (!csvString || csvString.trim() === '') {
      return [];
    }

    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        // Cast boolean values
        if (value === 'true') return true;
        if (value === 'false') return false;

        // Cast numbers (solo se non è una stringa che inizia con 0)
        if (!isNaN(value) && value !== '' && !value.startsWith('0')) {
          return Number(value);
        }

        return value;
      }
    });

    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`CSV parse error: ${error.message}`);
  }
}

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column names (optional, auto-detected from first object)
 * @returns {string} CSV string
 */
export function toCSV(data, columns = null) {
  try {
    if (!data || data.length === 0) {
      return '';
    }

    const output = stringify(data, {
      header: true,
      columns: columns || Object.keys(data[0]),
      quoted: true,
      quoted_empty: true
    });

    return output;
  } catch (error) {
    console.error('Error converting to CSV:', error);
    throw new Error(`CSV stringify error: ${error.message}`);
  }
}

/**
 * Parse progetti CSV with custom timeAllocation format
 * Formato: "day:hours|day:hours" (es. "1:2|3:4" = lunedì 2h, mercoledì 4h)
 */
export function parseProgettiCSV(csvString) {
  const records = parseCSV(csvString);

  return records.map(record => ({
    ...record,
    timeAllocation: record.timeAllocation
      ? record.timeAllocation.split('|').map(item => {
          const [day, hours] = item.split(':');
          return { day: parseInt(day), hours: parseFloat(hours) };
        })
      : [],
    completedSessions: record.completedSessions
      ? JSON.parse(record.completedSessions)
      : {}
  }));
}

/**
 * Convert progetti to CSV with custom timeAllocation format
 */
export function progettiToCSV(progetti) {
  const records = progetti.map(project => ({
    ...project,
    timeAllocation: project.timeAllocation
      .map(t => `${t.day}:${t.hours}`)
      .join('|'),
    completedSessions: JSON.stringify(project.completedSessions || {})
  }));

  return toCSV(records, ['id', 'title', 'description', 'startDate', 'endDate', 'timeAllocation', 'completedSessions', 'completed']);
}

/**
 * Parse routine CSV with days format
 * Formato: "1,3,5" (giorni della settimana)
 */
export function parseRoutineCSV(csvString) {
  const records = parseCSV(csvString);

  return records.map(record => ({
    ...record,
    days: record.days
      ? record.days.split(',').map(d => parseInt(d.trim()))
      : []
  }));
}

/**
 * Convert routine to CSV with days format
 */
export function routineToCSV(routines) {
  const records = routines.map(routine => ({
    ...routine,
    days: routine.days.join(',')
  }));

  return toCSV(records, ['id', 'name', 'icon', 'days']);
}

/**
 * Parse schede CSV with esercizi JSON
 * Formato esercizi: JSON stringified array di oggetti
 */
export function parseSchedeCSV(csvString) {
  const records = parseCSV(csvString);

  return records.map(record => ({
    ...record,
    esercizi: record.esercizi ? JSON.parse(record.esercizi) : []
  }));
}

/**
 * Convert schede to CSV with esercizi JSON
 */
export function schedeToCSV(schede) {
  const records = schede.map(scheda => ({
    ...scheda,
    esercizi: JSON.stringify(scheda.esercizi || [])
  }));

  return toCSV(records, ['id', 'nome', 'tipo', 'descrizione', 'esercizi']);
}
