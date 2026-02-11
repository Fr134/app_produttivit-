import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Check if we need to migrate from old single-user schema
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'users'
      );
    `);
    const needsMigration = !usersTableExists.rows[0].exists;

    let oldAppData = [];
    if (needsMigration) {
      console.log('Migrating from single-user to multi-user schema...');

      // Backup existing app_data if it exists
      try {
        const backup = await client.query('SELECT key, data FROM app_data');
        oldAppData = backup.rows;
        console.log(`Backed up ${oldAppData.length} app_data rows`);
      } catch (e) { /* table might not exist */ }

      // Drop old tables
      await client.query('DROP TABLE IF EXISTS app_data CASCADE');
      await client.query('DROP TABLE IF EXISTS tokens CASCADE');
    }

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        google_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        picture TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create tokens table (per-user)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        user_id TEXT PRIMARY KEY REFERENCES users(google_id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create app_data table (per-user, composite PK)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, key)
      );
    `);

    // Create session table for connect-pg-simple
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL COLLATE "default",
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // Store backed up data in a migration table for first-login migration
    if (needsMigration && oldAppData.length > 0) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migration_backup (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL
        );
      `);
      for (const row of oldAppData) {
        await client.query(
          `INSERT INTO _migration_backup (key, data) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
          [row.key, JSON.stringify(row.data)]
        );
      }
      console.log('Old data saved in _migration_backup table');
    }

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Migrate old single-user data to the first user who logs in
export async function migrateOldDataToUser(userId) {
  const client = await pool.connect();
  try {
    const backupExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = '_migration_backup'
      );
    `);

    if (!backupExists.rows[0].exists) return;

    const backup = await client.query('SELECT key, data FROM _migration_backup');
    if (backup.rows.length === 0) return;

    console.log(`Migrating ${backup.rows.length} data keys to user ${userId}...`);

    for (const row of backup.rows) {
      await client.query(
        `INSERT INTO app_data (user_id, key, data, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, key) DO NOTHING`,
        [userId, row.key, JSON.stringify(row.data)]
      );
    }

    // Drop migration backup table
    await client.query('DROP TABLE IF EXISTS _migration_backup');
    console.log('Migration completed successfully');
  } catch (error) {
    console.log('Migration check completed:', error.message);
  } finally {
    client.release();
  }
}

export default pool;
