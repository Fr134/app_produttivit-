import pool from './db.js';

/**
 * Salva i token OAuth2 nel database PostgreSQL
 */
export async function saveTokens(tokens) {
  try {
    await pool.query(
      `INSERT INTO tokens (id, data, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
      [JSON.stringify(tokens)]
    );
    console.log('✅ Token salvati nel database');
  } catch (error) {
    console.error('❌ Errore nel salvataggio dei token:', error);
    throw new Error('Impossibile salvare i token');
  }
}

/**
 * Carica i token OAuth2 dal database
 */
export async function loadTokens() {
  try {
    const result = await pool.query('SELECT data FROM tokens WHERE id = 1');
    if (result.rows.length === 0) return null;
    return result.rows[0].data;
  } catch (error) {
    console.error('❌ Errore nel caricamento dei token:', error);
    return null;
  }
}

/**
 * Elimina i token (logout)
 */
export async function deleteTokens() {
  try {
    await pool.query('DELETE FROM tokens WHERE id = 1');
    console.log('✅ Token eliminati');
  } catch (error) {
    console.error('❌ Errore eliminazione token:', error);
  }
}

/**
 * Verifica se esistono token salvati
 */
export async function hasTokens() {
  try {
    const result = await pool.query('SELECT 1 FROM tokens WHERE id = 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
