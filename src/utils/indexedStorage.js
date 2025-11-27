// Lightweight IndexedDB helper for storing image data URLs
const DB_NAME = 'omr_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(key, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(dataUrl, key);
    putReq.onsuccess = () => resolve(true);
    putReq.onerror = () => reject(putReq.error);
  });
}

export async function getImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(key);
    getReq.onsuccess = () => resolve(getReq.result || null);
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const delReq = store.delete(key);
    delReq.onsuccess = () => resolve(true);
    delReq.onerror = () => reject(delReq.error);
  });
}

export async function clearAllImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const clearReq = store.clear();
    clearReq.onsuccess = () => resolve(true);
    clearReq.onerror = () => reject(clearReq.error);
  });
}
