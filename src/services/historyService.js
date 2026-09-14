import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_HISTORY_KEY = '@filmroom_recent_history_v1';
const MAX_HISTORY_ITEMS = 10;

/**
 * Retrieves the stored recent history (maximum 10 items, newest first).
 * @returns {Promise<Array>} List of history items
 */
export const getRecentHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch (err) {
    console.warn('[historyService] Failed to load recent history:', err.message);
    return [];
  }
};

/**
 * Adds an item to the recent history, deduplicating by ID, prepending to the front,
 * and capping at MAX_HISTORY_ITEMS (10).
 *
 * @param {Object} item
 * @param {string} item.id - Unique ID of the entity (UID, RoomID, CallID, or query text)
 * @param {'PROFILE'|'ROOM'|'CALL'|'SEARCH'} item.type - Type of item
 * @param {string} item.title - Display title
 * @param {string} [item.subtitle] - Additional context label
 * @param {Object} [item.data] - Cached payload for immediate reopening
 * @returns {Promise<Array>} Updated history list
 */
export const addRecentHistoryItem = async ({ id, type, title, subtitle = '', data = null }) => {
  if (!id || !type || !title) return [];
  try {
    const current = await getRecentHistory();
    // Filter out previous duplicate entry
    const filtered = current.filter((h) => !(h.id === id && h.type === type));

    const newItem = {
      id,
      type,
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      data,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[historyService] Failed to add recent history item:', err.message);
    return [];
  }
};

/**
 * Removes an item from recent history by id and type.
 */
export const removeRecentHistoryItem = async (id, type) => {
  try {
    const current = await getRecentHistory();
    const updated = current.filter((h) => !(h.id === id && h.type === type));
    await AsyncStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[historyService] Failed to remove history item:', err.message);
    return [];
  }
};

/**
 * Clears all recent history items.
 */
export const clearRecentHistory = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_HISTORY_KEY);
    return [];
  } catch (err) {
    console.warn('[historyService] Failed to clear history:', err.message);
    return [];
  }
};
