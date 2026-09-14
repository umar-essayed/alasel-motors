import Dexie, { type EntityTable } from 'dexie';
import {
  Account,
  Engine,
  ClearanceDoc,
  Supplier,
  Customer,
  SalesInvoice,
  SupplierInvoice,
  PaymentReceipt,
  Transaction,
  ShopSettings,
  FirebaseConfig,
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
  }

  // Seed default data if empty (first install)
  async seedInitialData() {
    const accountsCount = await this.accounts.count();
    if (accountsCount === 0) {
      await this.accounts.bulkAdd(defaultAccounts as Account[]);
    }
    const settingsCount = await this.appSettings.count();
    if (settingsCount === 0) {
      await this.appSettings.add({
        id: 'main_settings',
        settings: defaultSettings,
        cloudSyncEnabled: false,
      });
    }
    console.log('Al-Aseel Motors: Production database initialized.');
  }
}

export const db = new AlAselDatabase();

// Auto-seed on startup
db.open().then(() => {
  db.seedInitialData();
});
