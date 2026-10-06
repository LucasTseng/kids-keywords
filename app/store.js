/**
 * store.js
 * 本地持久化模块：用 IndexedDB 保存 sql.js 数据库快照（字节流），
 * 使得背默成绩在关闭页面后重新打开仍然保留。
 * 对外提供 saveSnapshot / loadSnapshot 两个异步接口。
 */

const DB_NAME = 'vocabulary-dictation';
const STORE_NAME = 'snapshots';
// 题库新增「extended 动态字段 extra」列后更换键名，使旧快照（无 extra 字段）失效，避免读取到旧题库结构
const KEY = 'main-v3';

/** 打开（必要时创建）IndexedDB 数据库，返回 Promise<IDBDatabase> */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 保存数据库快照字节流（Uint8Array） */
export async function saveSnapshot(bytes) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(bytes, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** 读取数据库快照，无快照时返回 null */
export async function loadSnapshot() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let result = null;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => {
      result = req.result || null;
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => reject(tx.error);
  });
}