import pool from './db.js';

export async function saveTokens(userId, tokens) {
  try {
    await pool.query(
      `INSERT INTO tokens (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(tokens)]
    );
  } catch (error) {
    console.error('Error saving tokens:', error);
    throw new Error('Cannot save tokens');
  }
}

export async function loadTokens(userId) {
  try {
    const result = await pool.query('SELECT data FROM tokens WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return null;
    return result.rows[0].data;
  } catch (error) {
    console.error('Error loading tokens:', error);
    return null;
  }
}

export async function deleteTokens(userId) {
  try {
    await pool.query('DELETE FROM tokens WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('Error deleting tokens:', error);
  }
}

export async function hasTokens(userId) {
  try {
    const result = await pool.query('SELECT 1 FROM tokens WHERE user_id = $1', [userId]);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
