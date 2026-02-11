const API_BASE_URL = import.meta.env.PROD
  ? '' // In produzione usa lo stesso dominio
  : 'http://localhost:3000'; // In sviluppo usa il server locale

/**
 * Helper per le chiamate API
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include', // Include cookies per le sessioni
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Errore di rete',
      message: response.statusText
    }));
    throw new Error(error.message || error.error || 'Errore sconosciuto');
  }

  return response.json();
}

/**
 * AUTH API
 */

export async function checkAuthStatus() {
  try {
    return await fetchAPI('/auth/status');
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false };
  }
}

export function loginWithGoogle() {
  window.location.href = `${API_BASE_URL}/auth/google`;
}

export async function logout() {
  return await fetchAPI('/auth/logout', { method: 'POST' });
}

/**
 * CALENDAR API
 */

function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getCalendarEvents(startDate, endDate) {
  const start = startDate instanceof Date
    ? toLocalDateKey(startDate)
    : startDate;

  const end = endDate instanceof Date
    ? toLocalDateKey(endDate)
    : endDate;

  return await fetchAPI(`/api/calendar/events?start=${start}&end=${end}`);
}

export async function getCalendarList() {
  return await fetchAPI('/api/calendar/list');
}

/**
 * DRIVE API (Data persistence)
 */

export async function loadAllData() {
  return await fetchAPI('/api/drive/data');
}

export async function saveAllData(data) {
  return await fetchAPI('/api/drive/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * LOCAL STORAGE HELPERS
 * Per cache temporanea dei dati
 */

const STORAGE_KEYS = {
  PROGETTI: 'planner_progetti',
  TASK: 'planner_task',
  ROUTINE: 'planner_routine',
  PROGRESSO: 'planner_progresso',
  LAST_SYNC: 'planner_last_sync'
};

export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function loadFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

export function clearLocalStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export const STORAGE = STORAGE_KEYS;
