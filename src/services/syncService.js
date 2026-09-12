import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getLocalDatabase } from './localDatabaseService';

/**
 * Enqueues a local operation into the SQLite sync queue.
 */
export async function enqueueSyncOperation({ collectionName, docId, action, payload }) {
  const localDb = await getLocalDatabase();
  const now = new Date().toISOString();

  await localDb.runAsync(
    `INSERT INTO sync_queue (collection_name, doc_id, action, payload_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?, ?);`,
    [collectionName, docId || null, action, JSON.stringify(payload || {}), now, now]
  );
}

/**
 * Returns the count of pending sync operations.
 */
export async function getPendingQueueCount() {
  try {
    const localDb = await getLocalDatabase();
    const result = await localDb.getFirstAsync(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';"
    );
    return result?.count || 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Retrieves all items in the sync queue.
 */
export async function getSyncQueue() {
  try {
    const localDb = await getLocalDatabase();
    const rows = await localDb.getAllAsync(
      'SELECT * FROM sync_queue ORDER BY created_at ASC;'
    );
    return rows.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload_json || '{}'),
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Fetches last sync metadata.
 */
export async function getLastSyncMetadata() {
  try {
    const localDb = await getLocalDatabase();
    const row = await localDb.getFirstAsync(
      "SELECT value FROM sync_metadata WHERE key = 'last_sync_timestamp';"
    );
    return row?.value || null;
  } catch (_) {
    return null;
  }
}

/**
 * Real synchronization engine: syncs pending SQLite queue operations to Firestore.
 * Handles conflict detection and returns honest operational counts.
 */
export async function syncNow({ userId } = {}) {
  const localDb = await getLocalDatabase();
  const pendingRows = await localDb.getAllAsync(
    "SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') ORDER BY created_at ASC;"
  );

  let syncedCount = 0;
  let failedCount = 0;
  let conflictCount = 0;

  for (const item of pendingRows) {
    try {
      const payload = JSON.parse(item.payload_json || '{}');
      const targetDocRef = doc(db, item.collection_name, item.doc_id);

      // Conflict detection for updates
      if (item.action === 'UPDATE' && item.doc_id) {
        const cloudSnap = await getDoc(targetDocRef);
        if (cloudSnap.exists()) {
          const cloudData = cloudSnap.data();
          const cloudUpdatedAt = cloudData.updatedAt?.toDate
            ? cloudData.updatedAt.toDate().toISOString()
            : cloudData.updatedAt;

          // If cloud document was modified after local item creation and has different version
          if (cloudUpdatedAt && cloudUpdatedAt > item.created_at) {
            await localDb.runAsync(
              "UPDATE sync_queue SET status = 'CONFLICT', error_message = 'Cloud version is newer', updated_at = ? WHERE id = ?;",
              [new Date().toISOString(), item.id]
            );
            conflictCount++;
            continue;
          }
        }
      }

      // Execute Firestore action
      if (item.action === 'CREATE' || item.action === 'UPDATE') {
        await setDoc(
          targetDocRef,
          {
            ...payload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else if (item.action === 'DELETE') {
        await deleteDoc(targetDocRef);
      }

      // Mark as synced in local SQLite queue
      await localDb.runAsync(
        "UPDATE sync_queue SET status = 'SYNCED', updated_at = ? WHERE id = ?;",
        [new Date().toISOString(), item.id]
      );
      syncedCount++;
    } catch (err) {
      console.warn('Sync item failed:', err.message);
      await localDb.runAsync(
        "UPDATE sync_queue SET status = 'FAILED', error_message = ?, updated_at = ? WHERE id = ?;",
        [err.message || 'Network or permission error', new Date().toISOString(), item.id]
      );
      failedCount++;
    }
  }

  // Update sync metadata
  const now = new Date().toISOString();
  await localDb.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('last_sync_timestamp', ?, ?);`,
    [now, now]
  );

  return {
    syncedCount,
    failedCount,
    conflictCount,
    lastSynced: now,
  };
}

/**
 * Conflict resolution handler: chooses whether to push local change or accept cloud data.
 */
export async function resolveConflict({ queueId, resolution }) {
  const localDb = await getLocalDatabase();
  const item = await localDb.getFirstAsync(
    'SELECT * FROM sync_queue WHERE id = ?;',
    [queueId]
  );
  if (!item) return;

  if (resolution === 'KEEP_LOCAL') {
    // Force retry local operation
    await localDb.runAsync(
      "UPDATE sync_queue SET status = 'PENDING', error_message = NULL, updated_at = ? WHERE id = ?;",
      [new Date().toISOString(), queueId]
    );
  } else if (resolution === 'KEEP_CLOUD') {
    // Dismiss local change and accept cloud
    await localDb.runAsync(
      "UPDATE sync_queue SET status = 'SYNCED', error_message = 'Resolved to cloud', updated_at = ? WHERE id = ?;",
      [new Date().toISOString(), queueId]
    );
  }
}
