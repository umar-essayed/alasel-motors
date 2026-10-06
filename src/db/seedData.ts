import { Account, ShopSettings } from '../types';

// ─── إعدادات المحل الافتراضية ────────────────────────────────────────────────
export const defaultSettings: ShopSettings = {
  shopName: 'الأصيل موتورز',
  shopOwner: '',
  phone1: '',
  phone2: '',
  address: '',
  commercialRecord: '',
  taxNumber: '',
  defaultWarranty: 'ضمان 30 يوم تجربة ضد عيوب الصناعة بشرط سلامة الطبب',
  invoiceNotice: 'المحرك مباع بأوراق الإفراج الجمركي الأصلية وصالح للترخيص بالمرور',
};

// ─── حسابات النظام ──────────────────────────────────────────────────────────
export const defaultAccounts: Account[] = [
  {
    id: 'acc-admin',
    name: 'المدير',
    role: 'admin',
    roleTitle: 'مدير النظام',
    pin: '1234',
    avatarColor: 'bg-zinc-800 text-white',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-cashier',
    name: 'الكاشير',
    role: 'sales',
    roleTitle: 'كاشير مبيعات',
    pin: '5678',
    avatarColor: 'bg-zinc-700 text-white',
    createdAt: new Date().toISOString(),
  },
];

// ─── بيانات فارغة — لا توجد بيانات تجريبية ─────────────────────────────────
export const demoClearanceDocs = [] as const;
export const defaultSuppliers = [] as const;
export const defaultCustomers = [] as const;
export const defaultEngines = [] as const;
export const defaultSalesInvoices = [] as const;
export const defaultTransactions = [] as const;
