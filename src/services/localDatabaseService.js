import * as SQLite from 'expo-sqlite';

let dbInstance = null;
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Opens and initializes the SQLite database with versioned migrations.
 */
export async function getLocalDatabase() {
  if (!dbInstance) {
    try {
      dbInstance = await SQLite.openDatabaseAsync('filmroom.db');
      await runMigrations(dbInstance);
    } catch (err) {
      console.warn('SQLite init notice:', err.message);
      throw err;
    }
  }
  return dbInstance;
}

/**
 * Versioned schema migration runner.
 */
async function runMigrations(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const currentVersionRow = await db.getFirstAsync(
    'SELECT MAX(version) as version FROM schema_version;'
  );
  const currentVersion = currentVersionRow?.version || 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      -- Production Rooms local cache
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        project_type TEXT,
        logline TEXT,
        start_date TEXT,
        end_date TEXT,
        location TEXT,
        poster_url TEXT,
        current_stage INTEGER DEFAULT 0,
        data_json TEXT,
        updated_at TEXT
      );

      -- Room Members local cache
      CREATE TABLE IF NOT EXISTS room_members (
        room_id TEXT NOT NULL,
        uid TEXT NOT NULL,
        name TEXT,
        production_role TEXT,
        room_access TEXT,
        data_json TEXT,
        PRIMARY KEY (room_id, uid)
      );

      -- Production Stage Notes
      CREATE TABLE IF NOT EXISTS production_notes (
        id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT NOT NULL,
        stage_number INTEGER,
        notes TEXT,
        data_json TEXT,
        updated_at TEXT
      );

      -- Public Crew Calls & Drafts
      CREATE TABLE IF NOT EXISTS crew_calls (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        call_type TEXT,
        project_name TEXT,
        location TEXT,
        compensation TEXT,
        data_json TEXT,
        status TEXT DEFAULT 'PUBLISHED',
        updated_at TEXT
      );

      -- Call Sheet Working Data
      CREATE TABLE IF NOT EXISTS call_sheets (
        id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT NOT NULL,
        shoot_date TEXT,
        location TEXT,
        data_json TEXT,
        updated_at TEXT
      );

      -- Digital Slate & Takes
      CREATE TABLE IF NOT EXISTS slate_takes (
        id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT NOT NULL,
        scene TEXT,
        take INTEGER,
        is_circle_take INTEGER DEFAULT 0,
        notes TEXT,
        data_json TEXT,
        created_at TEXT
      );

      -- Synchronization Queue
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_name TEXT NOT NULL,
        doc_id TEXT,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Sync Metadata key-value store
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        updated_at TEXT
      );

      INSERT INTO schema_version (version) VALUES (1);
    `);
  }
}

// ── REPOSITORY FUNCTIONS ──

/**
 * Cache or update a production room locally.
 */
export async function cacheRoom(room) {
  if (!room?.id) return;
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO rooms (id, title, project_type, logline, start_date, end_date, location, poster_url, current_stage, data_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      room.id,
      room.title || 'Untitled Project',
      room.projectType || null,
      room.logline || null,
      room.shootStartDate || null,
      room.shootEndDate || null,
      room.location || null,
      room.posterUrl || null,
      room.currentStage || 0,
      JSON.stringify(room),
      new Date().toISOString(),
    ]
  );
}

/**
 * Fetch all locally cached production rooms.
 */
export async function getCachedRooms() {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync('SELECT * FROM rooms ORDER BY updated_at DESC;');
  return rows.map((r) => {
    try {
      return JSON.parse(r.data_json);
    } catch (_) {
      return r;
    }
  });
}

/**
 * Delete a room from local cache.
 */
export async function deleteCachedRoom(roomId) {
  const db = await getLocalDatabase();
  await db.runAsync('DELETE FROM rooms WHERE id = ?;', [roomId]);
  await db.runAsync('DELETE FROM room_members WHERE room_id = ?;', [roomId]);
}

/**
 * Cache or update a crew call locally.
 */
export async function cacheCrewCall(call) {
  if (!call?.id) return;
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO crew_calls (id, title, call_type, project_name, location, compensation, data_json, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      call.id,
      call.title || 'Crew Call',
      call.postType || 'CREW_CALL',
      call.projectName || call.title || null,
      call.location || null,
      call.compensationTier || call.compensation || null,
      JSON.stringify(call),
      'PUBLISHED',
      new Date().toISOString(),
    ]
  );
}

/**
 * Fetch all locally cached crew calls.
 */
export async function getCachedCrewCalls() {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync('SELECT * FROM crew_calls ORDER BY updated_at DESC;');
  return rows.map((r) => {
    try {
      return JSON.parse(r.data_json);
    } catch (_) {
      return r;
    }
  });
}

/**
 * Cache a slate take.
 */
export async function cacheSlateTake(take) {
  if (!take?.id) return;
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO slate_takes (id, room_id, scene, take, is_circle_take, notes, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      take.id,
      take.roomId || 'global',
      take.scene || '',
      take.take || 1,
      take.isCircleTake ? 1 : 0,
      take.notes || null,
      JSON.stringify(take),
      take.createdAt || new Date().toISOString(),
    ]
  );
}

/**
 * Retrieve cached slate takes for a room.
 */
export async function getCachedSlateTakes(roomId) {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM slate_takes WHERE room_id = ? ORDER BY created_at DESC;',
    [roomId]
  );
  return rows.map((r) => {
    try {
      return JSON.parse(r.data_json);
    } catch (_) {
      return r;
    }
  });
}

/**
 * Retrieve database inspection statistics for Settings -> Storage & Data.
 */
export async function getLocalDatabaseStats() {
  try {
    const db = await getLocalDatabase();
    const roomsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM rooms;');
    const callsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM crew_calls;');
    const takesCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM slate_takes;');
    const queuePending = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';"
    );
    const queueTotal = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue;');

    const totalRecords =
      (roomsCount?.count || 0) +
      (callsCount?.count || 0) +
      (takesCount?.count || 0) +
      (queueTotal?.count || 0);

    // Approximate size in KB based on average record footprint
    const estimatedKb = Math.max(24, Math.round(totalRecords * 1.8 + 16));

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      rooms: roomsCount?.count || 0,
      calls: callsCount?.count || 0,
      takes: takesCount?.count || 0,
      pendingSync: queuePending?.count || 0,
      totalRecords,
      estimatedSizeFormatted: estimatedKb > 1024 ? `${(estimatedKb / 1024).toFixed(1)} MB` : `${estimatedKb} KB`,
    };
  } catch (err) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      rooms: 0,
      calls: 0,
      takes: 0,
      pendingSync: 0,
      totalRecords: 0,
      estimatedSizeFormatted: '16 KB',
    };
  }
}

/**
 * Clears cached temporary documents and slate takes without clearing pending sync changes.
 */
export async function clearLocalCache() {
  const db = await getLocalDatabase();
  await db.runAsync('DELETE FROM rooms;');
  await db.runAsync('DELETE FROM crew_calls;');
  await db.runAsync('DELETE FROM slate_takes;');
  await db.runAsync('DELETE FROM production_notes;');
  await db.runAsync('DELETE FROM call_sheets;');
  return true;
}
