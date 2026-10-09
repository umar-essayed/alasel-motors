import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../db';
import { getFirestoreInstance, initializeFirebase } from './firebase';
import {
  Engine,
  Customer,
  Supplier,
  SalesInvoice,
  Transaction,
  SupplierLedgerEntry,
  PaymentReceipt,
  ClearanceDoc,
  DocumentImage,
  SyncOutboxItem,
} from '../types';
import { processPendingImagesQueue } from './imageService';

export interface SyncStatus {
  state: 'offline' | 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
  lastSyncedAt?: string;
  pendingCount?: number;
  outboxCount?: number;
  pendingImagesCount?: number;
}

export const MASTER_PULL_PASSWORD = 'OmAr@20$10';

export class CloudSyncService {
  private static instance: CloudSyncService;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private isFlushing = false;
  private isPullingFromCloud = false;
  private currentStatus: SyncStatus = {
    state: 'offline',
    message: 'النظام يعمل محلياً بالكامل (Offline-First)',
    pendingCount: 0,
    outboxCount: 0,
    pendingImagesCount: 0,
  };

  private constructor() {
    this.checkConfigAndInit();
    this.setupNetworkListeners();
    this.setupChangeTracker();
    this.refreshPendingCounts();
  }

  private setupChangeTracker() {
    const monitoredTables = [
      'engines',
      'customers',
      'suppliers',
      'salesInvoices',
      'transactions',
      'supplierLedger',
      'payments',
      'clearanceDocs',
    ] as const;

    monitoredTables.forEach((tableName) => {
      const table = (db as unknown as Record<string, { hook?: Function }>)[tableName];
      if (!table || typeof table.hook !== 'function') return;

      table.hook('creating', (primKey: unknown, obj: Record<string, unknown>) => {
        if (this.isPullingFromCloud) return;
        const itemObj = { ...obj };
        setTimeout(() => {
          this.queueMutation(
            tableName,
            'upsert',
            String(primKey || itemObj.id),
            itemObj,
            (itemObj.createdAt as string) || (itemObj.date as string)
          );
        }, 50);
      });

      table.hook('updating', (modifications: Record<string, unknown>, primKey: unknown, obj: Record<string, unknown>) => {
        if (this.isPullingFromCloud) return;
        const merged = { ...obj, ...modifications };
        setTimeout(() => {
          this.queueMutation(
            tableName,
            'upsert',
            String(primKey),
            merged,
            (merged.updatedAt as string) || (merged.createdAt as string) || (merged.date as string)
          );
        }, 50);
      });

      table.hook('deleting', (primKey: unknown, obj: Record<string, unknown>) => {
        if (this.isPullingFromCloud) return;
        setTimeout(() => {
          this.queueMutation(
            tableName,
            'delete',
            String(primKey),
            obj || {},
            new Date().toISOString()
          );
        }, 50);
      });
    });
  }

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(status: Partial<SyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.listeners.forEach((l) => l(this.currentStatus));
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 [Sync Service] Network online: triggering auto-flush...');
        this.flushOutbox();
        processPendingImagesQueue();
      });

      window.addEventListener('offline', () => {
        this.updateStatus({
          state: 'offline',
          message: 'الجهاز غير متصل بالإنترنت (العمليات تحفظ في طابور الأوفلاين)',
        });
      });
    }
  }

  async refreshPendingCounts() {
    try {
      const outboxCount = await db.syncOutbox.where('status').equals('pending').count();
      const pendingImagesCount = await db.documentImages.where('syncStatus').equals('pending').count();
      this.updateStatus({
        outboxCount,
        pendingImagesCount,
        pendingCount: outboxCount + pendingImagesCount,
      });
    } catch {
      // Ignore count errors on initial setup
    }
  }

  async checkConfigAndInit(): Promise<boolean> {
    try {
      // Check local appSettings for Firebase Config
      const appSettings = await db.appSettings.get('main_settings');
      if (appSettings?.firebaseConfig && appSettings.cloudSyncEnabled) {
        const initialized = initializeFirebase(appSettings.firebaseConfig);
        if (initialized) {
          this.updateStatus({
            state: 'idle',
            message: 'المزامنة السحابية متصلة ومفعلة (Firebase Firestore)',
            lastSyncedAt: appSettings.lastSyncedAt,
          });
          this.refreshPendingCounts();
          return true;
        }
      }

      this.updateStatus({
        state: 'offline',
        message: 'النظام يعمل محلياً في وضع الأوفلاين (IndexedDB)',
      });
      this.refreshPendingCounts();
      return false;
    } catch {
      this.updateStatus({ state: 'error', message: 'خطأ في قراءة إعدادات المزامنة' });
      return false;
    }
  }

  /**
   * Queue any record change for real-time synchronization.
   * Preserves exact originalTimestamp so historical dates stay 100% accurate!
   */
  async queueMutation(
    collection: SyncOutboxItem['collection'],
    action: 'upsert' | 'delete',
    documentId: string,
    payload: Record<string, unknown>,
    originalTimestamp?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const outboxItem: SyncOutboxItem = {
      id: `outbox-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      collection,
      action,
      documentId,
      payload,
      originalTimestamp: originalTimestamp || (payload.createdAt as string) || (payload.date as string) || now,
      attempts: 0,
      status: 'pending',
      createdAt: now,
    };

    await db.syncOutbox.add(outboxItem);
    await this.refreshPendingCounts();

    // Trigger instant real-time sync if online
    if (navigator.onLine && !this.isFlushing) {
      this.flushOutbox().catch((err) => {
        console.warn('[Sync] Auto-flush failed, will retry:', err);
      });
    }
  }

  /**
   * Zero-waste Outbox Flush:
   * Commits queued mutations in atomic batches of up to 450 items (Firestore limit is 500).
   * Leaves zero stale reads on Firestore!
   */
  async flushOutbox(): Promise<{ success: boolean; pushedCount: number }> {
    if (this.isFlushing || !navigator.onLine) {
      return { success: false, pushedCount: 0 };
    }

    const firestore = getFirestoreInstance();
    if (!firestore) {
      return { success: false, pushedCount: 0 };
    }

    this.isFlushing = true;
    this.updateStatus({ state: 'syncing', message: 'جارٍ رفع العمليات المعلقة إلى السحابة...' });

    try {
      const pendingItems = await db.syncOutbox
        .where('status')
        .equals('pending')
        .limit(450)
        .toArray();

      if (pendingItems.length === 0) {
        this.updateStatus({ state: 'synced', message: 'كافة البيانات متزامنة بالكامل' });
        this.isFlushing = false;
        await this.refreshPendingCounts();
        return { success: true, pushedCount: 0 };
      }

      const batch = writeBatch(firestore);
      const appSettings = await db.appSettings.get('main_settings');
      const prefix = appSettings?.firebaseConfig?.syncCollectionPrefix || 'el_wikalla_';

      for (const item of pendingItems) {
        const colRef = collection(firestore, `${prefix}${item.collection}`);
        const docRef = doc(colRef, item.documentId);

        if (item.action === 'delete') {
          batch.delete(docRef);
        } else {
          // Embed the verified original historical timestamp
          const recordToSync = {
            ...item.payload,
            _syncedAt: new Date().toISOString(),
            _originalTimestamp: item.originalTimestamp,
          };
          batch.set(docRef, recordToSync, { merge: true });
        }
      }

      // 1-trip atomic commit
      await batch.commit();

      // Delete synced items from local outbox queue
      const idsToDelete = pendingItems.map((p) => p.id);
      await db.syncOutbox.bulkDelete(idsToDelete);

      const now = new Date().toISOString();
      await db.appSettings.update('main_settings', { lastSyncedAt: now });

      // Audit Log
      await db.syncAuditLogs.add({
        id: `audit-${Date.now()}`,
        type: 'push',
        status: 'success',
        message: `تم رفع ${pendingItems.length} عملية بنجاح إلى فايربيز`,
        itemCount: pendingItems.length,
        timestamp: now,
      });

      this.updateStatus({
        state: 'synced',
        message: `تمت المزامنة اللحظية بنجاح (${pendingItems.length} عملية)`,
        lastSyncedAt: now,
      });

      // Also trigger image queue if any pending images
      processPendingImagesQueue();

      this.isFlushing = false;
      await this.refreshPendingCounts();
      return { success: true, pushedCount: pendingItems.length };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Outbox Flush Error]', errorMsg);

      await db.syncAuditLogs.add({
        id: `audit-${Date.now()}`,
        type: 'error',
        status: 'failure',
        message: `خطأ أثناء المزامنة: ${errorMsg}`,
        itemCount: 0,
        timestamp: new Date().toISOString(),
      });

      this.updateStatus({
        state: 'error',
        message: `تعذر إتمام المزامنة: ${errorMsg}`,
      });

      this.isFlushing = false;
      await this.refreshPendingCounts();
      return { success: false, pushedCount: 0 };
    }
  }

  /**
   * Manual Sync Now Button Trigger
   */
  async syncNow(): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) {
      return { success: false, message: 'الجهاز غير متصل بالإنترنت حالياً' };
    }

    // 1. Process pending R2 images
    const imgRes = await processPendingImagesQueue();

    // 2. Flush pending database outbox
    const dbRes = await this.flushOutbox();

    return {
      success: true,
      message: `تمت المزامنة بنجاح (بيانات: ${dbRes.pushedCount} | صور: ${imgRes.uploaded})`,
    };
  }

  /**
   * PROTECTED REVERSE SYNC (Pull from Cloud to Local)
   * Requires master password ('OmAr@20$10')
   * Takes an automated safety snapshot backup of current local data before pulling!
   */
  async pullFromCloudWithPassword(
    passwordInput: string
  ): Promise<{ success: boolean; message: string; backupFileName?: string }> {
    // 1. Verify Master Password
    if (passwordInput.trim() !== MASTER_PULL_PASSWORD) {
      await db.syncAuditLogs.add({
        id: `audit-${Date.now()}`,
        type: 'error',
        status: 'failure',
        message: 'محاولة مزامنة عكسية مرفوضة: كلمة المرور غير صحيحة',
        itemCount: 0,
        timestamp: new Date().toISOString(),
      });
      throw new Error('كلمة المرور غير صحيحة. عملية المزامنة العكسية محمية!');
    }

    const firestore = getFirestoreInstance();
    if (!firestore) {
      throw new Error('الاتصال بقاعدة بيانات فايربيز غير مهيأ حالياً');
    }

    this.updateStatus({ state: 'syncing', message: 'جارٍ أخذ نسخة أمان احتياطية قبل السحب...' });

    // 2. MANDATORY SAFETY SNAPSHOT BACKUP of current local DB
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeTag = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours()
    )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const backupFileName = `local_safety_backup_${timeTag}.json`;

    const safetySnapshot = {
      createdAt: now.toISOString(),
      shopName: 'الوكالة موتورز',
      engines: await db.engines.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      salesInvoices: await db.salesInvoices.toArray(),
      transactions: await db.transactions.toArray(),
      supplierLedger: await db.supplierLedger.toArray(),
      payments: await db.payments.toArray(),
      documentImages: await db.documentImages.toArray(),
    };

    // Store safety backup in localStorage as a quick restore checkpoint
    try {
      localStorage.setItem(`alasel_safety_backup_${timeTag}`, JSON.stringify(safetySnapshot));
    } catch {
      // If local storage is full, download directly as a JSON file
      const blob = new Blob([JSON.stringify(safetySnapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    await db.syncAuditLogs.add({
      id: `audit-${Date.now()}`,
      type: 'safety_backup',
      status: 'success',
      message: `تم أخذ نسخة أمان احتياطية قبل المزامنة العكسية: ${backupFileName}`,
      itemCount: safetySnapshot.engines.length + safetySnapshot.salesInvoices.length,
      timestamp: now.toISOString(),
    });

    // 3. PULL DATA FROM FIRESTORE
    this.updateStatus({ state: 'syncing', message: 'جارٍ سحب البيانات من السحابة وتثبيتها محلياً...' });
    this.isPullingFromCloud = true;

    try {
      const appSettings = await db.appSettings.get('main_settings');
      const prefix = appSettings?.firebaseConfig?.syncCollectionPrefix || 'el_wikalla_';

      let totalPulled = 0;

    // Pull engines
    const engSnap = await getDocs(collection(firestore, `${prefix}engines`));
    const cloudEngines = engSnap.docs.map((d) => d.data() as Engine);
    if (cloudEngines.length > 0) {
      await db.engines.bulkPut(cloudEngines);
      totalPulled += cloudEngines.length;
    }

    // Pull customers
    const custSnap = await getDocs(collection(firestore, `${prefix}customers`));
    const cloudCustomers = custSnap.docs.map((d) => d.data() as Customer);
    if (cloudCustomers.length > 0) {
      await db.customers.bulkPut(cloudCustomers);
      totalPulled += cloudCustomers.length;
    }

    // Pull suppliers
    const supSnap = await getDocs(collection(firestore, `${prefix}suppliers`));
    const cloudSuppliers = supSnap.docs.map((d) => d.data() as Supplier);
    if (cloudSuppliers.length > 0) {
      await db.suppliers.bulkPut(cloudSuppliers);
      totalPulled += cloudSuppliers.length;
    }

    // Pull sales invoices
    const invSnap = await getDocs(collection(firestore, `${prefix}salesInvoices`));
    const cloudInvoices = invSnap.docs.map((d) => d.data() as SalesInvoice);
    if (cloudInvoices.length > 0) {
      await db.salesInvoices.bulkPut(cloudInvoices);
      totalPulled += cloudInvoices.length;
    }

    // Pull transactions
    const txSnap = await getDocs(collection(firestore, `${prefix}transactions`));
    const cloudTx = txSnap.docs.map((d) => d.data() as Transaction);
    if (cloudTx.length > 0) {
      await db.transactions.bulkPut(cloudTx);
      totalPulled += cloudTx.length;
    }

    // Pull supplier ledger
    const ledSnap = await getDocs(collection(firestore, `${prefix}supplierLedger`));
    const cloudLedger = ledSnap.docs.map((d) => d.data() as SupplierLedgerEntry);
    if (cloudLedger.length > 0) {
      await db.supplierLedger.bulkPut(cloudLedger);
      totalPulled += cloudLedger.length;
    }

    // Pull payments
    const paySnap = await getDocs(collection(firestore, `${prefix}payments`));
    const cloudPayments = paySnap.docs.map((d) => d.data() as PaymentReceipt);
    if (cloudPayments.length > 0) {
      await db.payments.bulkPut(cloudPayments);
      totalPulled += cloudPayments.length;
    }

    const finishTime = new Date().toISOString();
    await db.appSettings.update('main_settings', { lastSyncedAt: finishTime });

    await db.syncAuditLogs.add({
      id: `audit-${Date.now()}`,
      type: 'pull',
      status: 'success',
      message: `تم سحب وتثبيت ${totalPulled} سجلاً من السحابة بنجاح`,
      itemCount: totalPulled,
      timestamp: finishTime,
    });

    this.updateStatus({
      state: 'synced',
      message: `تمت المزامنة العكسية بنجاح (${totalPulled} سجلاً)`,
      lastSyncedAt: finishTime,
    });

    return {
      success: true,
      message: `تم سحب وتحديث ${totalPulled} سجلاً من السحابة بنجاح مع حفظ نسخة الأمان (${backupFileName})`,
      backupFileName,
    };
    } finally {
      this.isPullingFromCloud = false;
    }
  }
}

export const syncService = CloudSyncService.getInstance();
