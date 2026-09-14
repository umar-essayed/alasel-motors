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
import {
  defaultAccounts,
  demoClearanceDocs,
  defaultCustomers,
  defaultEngines,
  defaultSalesInvoices,
  defaultSettings,
  defaultSuppliers,
  defaultTransactions,
} from './seedData';

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
  }

  // Seed default data if empty
  async seedInitialData() {
    const accountsCount = await this.accounts.count();
    if (accountsCount === 0) {
      await this.accounts.bulkAdd(defaultAccounts);
      await this.clearanceDocs.bulkAdd(demoClearanceDocs);
      await this.suppliers.bulkAdd(defaultSuppliers);
      await this.customers.bulkAdd(defaultCustomers);
      await this.engines.bulkAdd(defaultEngines);
      await this.salesInvoices.bulkAdd(defaultSalesInvoices);
      await this.transactions.bulkAdd(defaultTransactions);
      await this.appSettings.add({
        id: 'main_settings',
        settings: defaultSettings,
        cloudSyncEnabled: false,
      });
      console.log('Al-Aseel Motors: IndexedDB seeded with initial demo data successfully.');
    }
  }
}

export const db = new AlAselDatabase();

// Auto-seed on startup
db.open().then(() => {
  db.seedInitialData();
});
