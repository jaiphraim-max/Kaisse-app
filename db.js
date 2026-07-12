/* ===========================================================
   DB — couche de persistance locale (IndexedDB)
   Fonctionne 100% hors ligne. Toutes les données restent
   sur l'appareil de l'utilisateur.
=========================================================== */

const DB_NAME = 'kaisse_db';
const DB_VERSION = 2;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products')) {
        const s = db.createObjectStore('products', { keyPath: 'id' });
        s.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const s = db.createObjectStore('sales', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('zClosures')) {
        const s = db.createObjectStore('zClosures', { keyPath: 'id' });
        s.createIndex('closedAt', 'closedAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getDB() {
  if (!dbInstance) dbInstance = await openDB();
  return dbInstance;
}

function tx(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

const Store = {
  async getAll(storeName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async get(storeName, key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async put(storeName, value) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, storeName, 'readwrite').put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async delete(storeName, key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async clear(storeName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, storeName, 'readwrite').clear();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ===========================================================
   Données de démarrage (première utilisation uniquement)
=========================================================== */
async function seedIfEmpty() {
  const existing = await Store.getAll('categories');
  if (existing.length > 0) return;

  const categories = [
    { id: 'cat-boissons', name: 'Boissons' },
    { id: 'cat-plats', name: 'Plats' },
    { id: 'cat-entrees', name: 'Entrées' },
    { id: 'cat-desserts', name: 'Desserts' },
    { id: 'cat-pizza', name: 'Pizza' },
  ];
  for (const c of categories) await Store.put('categories', c);

  const products = [
    { id: uid(), name: 'THB 65cl', category: 'cat-boissons', price: 5000, stock: 48, lowStockAt: 12 },
    { id: uid(), name: 'Coca-Cola 33cl', category: 'cat-boissons', price: 3000, stock: 60, lowStockAt: 15 },
    { id: uid(), name: 'Eau minérale', category: 'cat-boissons', price: 1500, stock: 80, lowStockAt: 20 },
    { id: uid(), name: 'Rhum arrangé', category: 'cat-boissons', price: 8000, stock: 24, lowStockAt: 6 },
    { id: uid(), name: 'Romazava', category: 'cat-plats', price: 12000, stock: 20, lowStockAt: 5 },
    { id: uid(), name: 'Poulet grillé riz', category: 'cat-plats', price: 10000, stock: 25, lowStockAt: 5 },
    { id: uid(), name: 'Zébu grillé', category: 'cat-plats', price: 15000, stock: 15, lowStockAt: 4, isRedMeat: true },
    { id: uid(), name: 'Salade de crudités', category: 'cat-entrees', price: 4000, stock: 30, lowStockAt: 8 },
    { id: uid(), name: 'Samossas (5pc)', category: 'cat-entrees', price: 3500, stock: 40, lowStockAt: 10 },
    { id: uid(), name: 'Mofo gasy', category: 'cat-desserts', price: 2000, stock: 50, lowStockAt: 10 },
    { id: uid(), name: 'Salade de fruits', category: 'cat-desserts', price: 3500, stock: 20, lowStockAt: 5 },
    { id: uid(), name: 'Pizza Margherita', category: 'cat-pizza', price: 12000, stock: 15, lowStockAt: 4 },
    { id: uid(), name: 'Pizza 4 fromages', category: 'cat-pizza', price: 14000, stock: 15, lowStockAt: 4 },
  ];
  for (const p of products) await Store.put('products', p);

  const tables = [];
  for (let i = 1; i <= 8; i++) {
    tables.push({ id: 'table-' + i, name: 'T' + i, status: 'free', order: [], openedAt: null });
  }
  for (const t of tables) await Store.put('tables', t);

  await Store.put('settings', { key: 'shopName', value: 'Mon Restobar' });
  await Store.put('settings', { key: 'currency', value: 'Ar' });
  await Store.put('settings', { key: 'cashierPin', value: '1234' });
  await Store.put('settings', { key: 'adminPin', value: '9999' });
  await Store.put('settings', { key: 'accentColor', value: '#C9622A' });
  await Store.put('settings', { key: 'textColor', value: '#F2E9DC' });
  await Store.put('settings', { key: 'theme', value: 'dark' });
  await Store.put('settings', { key: 'nif', value: '' });
  await Store.put('settings', { key: 'stat', value: '' });
  await Store.put('settings', { key: 'phone', value: '' });
  await Store.put('settings', { key: 'address', value: '' });
  await Store.put('settings', { key: 'thankYouMessage', value: 'Merci de votre visite ! Au plaisir de vous revoir.' });
  await Store.put('settings', { key: 'productNameColor', value: '#F2E9DC' });
  await Store.put('settings', { key: 'payButtonColor', value: '#C9622A' });
  await Store.put('settings', { key: 'sideOptions', value: ['Riz', 'Frites', 'Légumes', 'Salade'] });
  await Store.put('settings', { key: 'sauceOptions', value: ['Poivre', 'Roquefort', 'Champignons', 'Sans sauce'] });
  await Store.put('settings', { key: 'kitchenPrinterEnabled', value: false });
  await Store.put('settings', { key: 'kitchenPrinterType', value: 'none' });
  await Store.put('settings', { key: 'kitchenPrinterName', value: '' });
  await Store.put('settings', { key: 'kitchenPrinterWidth', value: '80' });
  await Store.put('settings', { key: 'receiptPrinterEnabled', value: false });
  await Store.put('settings', { key: 'receiptPrinterType', value: 'none' });
  await Store.put('settings', { key: 'receiptPrinterName', value: '' });
  await Store.put('settings', { key: 'receiptPrinterWidth', value: '80' });
  await Store.put('settings', { key: 'invoicePrinterEnabled', value: false });
  await Store.put('settings', { key: 'invoicePrinterType', value: 'none' });
  await Store.put('settings', { key: 'invoicePrinterName', value: '' });
  await Store.put('settings', { key: 'invoicePrinterWidth', value: 'A4' });
}
