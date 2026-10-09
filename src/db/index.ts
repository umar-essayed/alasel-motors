import Dexie, { type EntityTable } from 'dexie';
import {
  Account,
  Engine,
  ClearanceDoc,
  Supplier,
  Customer,
  SalesInvoice,
  SupplierInvoice,
  SupplierLedgerEntry,
  PaymentReceipt,
  Transaction,
  ShopSettings,
  FirebaseConfig,
  DocumentImage,
  SyncOutboxItem,
  SyncAuditLog,
} from '../types';
import { defaultAccounts, defaultSettings } from './seedData';

export interface AppSettingsRecord {
  id: string;
  settings: ShopSettings;
  firebaseConfig?: FirebaseConfig;
  cloudSyncEnabled: boolean;
  lastSyncedAt?: string;
}

export class AlAselDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  engines!: EntityTable<Engine, 'id'>;
  clearanceDocs!: EntityTable<ClearanceDoc, 'id'>;
  suppliers!: EntityTable<Supplier, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  salesInvoices!: EntityTable<SalesInvoice, 'id'>;
  supplierInvoices!: EntityTable<SupplierInvoice, 'id'>;
  payments!: EntityTable<PaymentReceipt, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  appSettings!: EntityTable<AppSettingsRecord, 'id'>;
  supplierLedger!: EntityTable<SupplierLedgerEntry, 'id'>;
  documentImages!: EntityTable<DocumentImage, 'id'>;
  syncOutbox!: EntityTable<SyncOutboxItem, 'id'>;
  syncAuditLogs!: EntityTable<SyncAuditLog, 'id'>;

  constructor() {
    super('AlAselMotorsDB');

    this.version(1).stores({
      accounts: 'id, role, name',
      engines: 'id, &engineNumber, carBrand, carModel, status, supplierId, customerId, createdAt, updatedAt',
      clearanceDocs: 'id, &engineNumber, clearanceNumber, date, createdAt',
      suppliers: 'id, name, phone, balance, createdAt',
      customers: 'id, name, phone, nationalId, balance, createdAt',
      salesInvoices: 'id, invoiceNumber, customerId, engineId, engineNumber, date, createdAt',
      supplierInvoices: 'id, invoiceNumber, supplierId, date, createdAt',
      payments: 'id, receiptNumber, partyId, type, date, createdAt',
      transactions: 'id, type, category, date, createdAt',
      appSettings: 'id',
    });

    // Version 2: production migration — remove old demo accounts & data
    this.version(2).upgrade(async (tx) => {
      // Remove all old demo accounts
      await tx.table('accounts').clear();
      // Seed only the 2 production accounts
      await tx.table('accounts').bulkAdd(defaultAccounts as Account[]);
      // Clear any demo engines/customers/suppliers/invoices/transactions
      await tx.table('engines').clear();
      await tx.table('clearanceDocs').clear();
      await tx.table('suppliers').clear();
      await tx.table('customers').clear();
      await tx.table('salesInvoices').clear();
      await tx.table('supplierInvoices').clear();
      await tx.table('payments').clear();
      await tx.table('transactions').clear();
      console.log('Al-Aseel Motors: Database upgraded to v2 — demo data cleared.');
    });

    // Version 3: supplier agenda ledger
    this.version(3).stores({
      supplierLedger: 'id, supplierId, type, date, createdAt',
    });

    // Version 4: document images, real-time sync outbox, and audit logs
    this.version(4).stores({
      documentImages: 'id, engineNumber, category, syncStatus, createdAt',
      syncOutbox: 'id, collection, status, createdAt',
      syncAuditLogs: 'id, type, status, timestamp',
    });
  }

  // Seed default data if empty (first install) or migrate default accounts
  async seedInitialData() {
    const existingAccounts = await this.accounts.toArray();
    // If empty or still has old default accounts, update to the new owners
    const hasOldAccounts = existingAccounts.some((a) => a.id === 'acc-admin' || a.id === 'acc-cashier');
    if (existingAccounts.length === 0 || hasOldAccounts) {
      if (hasOldAccounts) {
        await this.accounts.where('id').equals('acc-admin').delete();
        await this.accounts.where('id').equals('acc-cashier').delete();
      }
      await this.accounts.bulkPut(defaultAccounts as Account[]);
    }
    const settingsRec = await this.appSettings.get('main_settings');
    if (!settingsRec) {
      await this.appSettings.put({
        id: 'main_settings',
        settings: defaultSettings,
        cloudSyncEnabled: true,
      });
    } else {
      // Migrate branding name if still old
      if (settingsRec.settings.shopName === 'الأصيل موتورز') {
        settingsRec.settings.shopName = 'الوكالة موتورز';
        settingsRec.settings.invoiceNotice = defaultSettings.invoiceNotice;
        settingsRec.settings.masterPullPassword = 'OmAr@20$10';
        await this.appSettings.put(settingsRec);
      }
    }
    console.log('الوكالة موتورز: Production database initialized.');
  }
}

export const db = new AlAselDatabase();

// Auto-seed on startup
db.open().then(() => {
  db.seedInitialData();
});
