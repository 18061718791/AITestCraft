/**
 * 截图存储服务 - 使用 IndexedDB
 * 
 * 优势：
 * 1. 容量大（通常 50MB+，远大于 localStorage 的 5MB）
 * 2. 支持异步操作，不阻塞主线程
 * 3. 支持存储二进制数据
 * 4. 数据持久化，刷新页面不会丢失
 */

const DB_NAME = 'PageTabScreenshotsDB';
const DB_VERSION = 1;
const STORE_NAME = 'screenshots';

interface ScreenshotRecord {
  tabId: string;
  path: string;
  screenshot: string;
  timestamp: number;
}

class ScreenshotStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ScreenshotStorage] 数据库打开失败');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ScreenshotStorage] 数据库打开成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'tabId' });
          // 创建索引以便按路径查找
          store.createIndex('path', 'path', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[ScreenshotStorage] 对象存储创建成功');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 保存截图
   */
  async saveScreenshot(tabId: string, path: string, screenshot: string): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: ScreenshotRecord = {
        tabId,
        path,
        screenshot,
        timestamp: Date.now(),
      };

      const request = store.put(record);

      request.onsuccess = () => {
        console.log('[ScreenshotStorage] 截图保存成功:', tabId);
        resolve();
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 截图保存失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取截图
   */
  async getScreenshot(tabId: string): Promise<string | null> {
    await this.init();
    
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(tabId);

      request.onsuccess = () => {
        const result = request.result as ScreenshotRecord | undefined;
        resolve(result?.screenshot || null);
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 截图获取失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 根据路径获取截图
   */
  async getScreenshotByPath(path: string): Promise<{ tabId: string; screenshot: string } | null> {
    await this.init();
    
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('path');
      const request = index.getAll(path);

      request.onsuccess = () => {
        const results = request.result as ScreenshotRecord[];
        if (results.length > 0) {
          // 返回最新的截图
          const latest = results.sort((a, b) => b.timestamp - a.timestamp)[0];
          resolve({ tabId: latest.tabId, screenshot: latest.screenshot });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 截图获取失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 删除截图
   */
  async deleteScreenshot(tabId: string): Promise<void> {
    await this.init();
    
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(tabId);

      request.onsuccess = () => {
        console.log('[ScreenshotStorage] 截图删除成功:', tabId);
        resolve();
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 截图删除失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 批量删除截图
   */
  async deleteScreenshots(tabIds: string[]): Promise<void> {
    await Promise.all(tabIds.map(id => this.deleteScreenshot(id)));
  }

  /**
   * 清空所有截图
   */
  async clearAllScreenshots(): Promise<void> {
    await this.init();

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[ScreenshotStorage] 所有截图已清空');
        resolve();
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 清空截图失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清理过期截图（保留最近 30 天的）
   */
  async cleanupOldScreenshots(): Promise<void> {
    await this.init();
    
    if (!this.db) {
      return;
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(thirtyDaysAgo);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[ScreenshotStorage] 过期截图清理完成');
          resolve();
        }
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] 清理失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有截图的统计信息
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    await this.init();
    
    if (!this.db) {
      return { count: 0, totalSize: 0 };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as ScreenshotRecord[];
        const count = results.length;
        const totalSize = results.reduce((sum, record) => {
          // 估算大小：base64 字符串长度 * 0.75（因为 base64 编码会增加约 33% 体积）
          return sum + (record.screenshot?.length || 0) * 0.75;
        }, 0);
        
        resolve({ count, totalSize });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// 导出单例实例
export const screenshotStorage = new ScreenshotStorage();

export default screenshotStorage;
