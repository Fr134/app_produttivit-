import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path del file dove salvare i token (escluso dal git)
const TOKENS_FILE = path.join(__dirname, '../../tokens.json');

/**
 * Salva i token OAuth2 su file
 * @param {Object} tokens - Token di accesso e refresh da Google
 */
export async function saveTokens(tokens) {
  try {
    await fs.writeFile(
      TOKENS_FILE,
      JSON.stringify(tokens, null, 2),
      'utf-8'
    );
    console.log('✅ Token salvati con successo');
  } catch (error) {
    console.error('❌ Errore nel salvataggio dei token:', error);
    throw new Error('Impossibile salvare i token');
  }
}

/**
 * Carica i token OAuth2 dal file
 * @returns {Object|null} Token salvati o null se non esistono
 */
export async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File non esiste, utente non ha ancora fatto login
      return null;
    }
    console.error('❌ Errore nel caricamento dei token:', error);
    throw new Error('Impossibile caricare i token');
  }
}

/**
 * Elimina i token salvati (logout)
 */
export async function deleteTokens() {
  try {
    await fs.unlink(TOKENS_FILE);
    console.log('✅ Token eliminati con successo');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File già non esiste
      return;
    }
    console.error('❌ Errore nell\'eliminazione dei token:', error);
    throw new Error('Impossibile eliminare i token');
  }
}

/**
 * Verifica se esistono token salvati
 * @returns {boolean}
 */
export async function hasTokens() {
  try {
    await fs.access(TOKENS_FILE);
    return true;
  } catch {
    return false;
  }
}
