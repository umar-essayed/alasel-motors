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
  defaultWarranty: 'ضمان شهر تجربة كاملة ضد عيوب الصناعة بشرط سلامة طبب المحرك ورقم الموتور',
  invoiceNotice: 'المكنة مباعة بأوراق الإفراج الجمركي الأصلية وصالحة للترخيص في المرور خلال المدة القانونية.',
};

// ─── حسابان فقط: المدير + الكاشير ──────────────────────────────────────────
export const defaultAccounts: Account[] = [
  {
    id: 'acc-admin',
    name: 'المدير',
    role: 'admin',
    roleTitle: 'الإدارة العليا — صلاحيات كاملة',
    pin: '1234',
    avatarColor: 'bg-slate-800 text-amber-400',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-cashier',
    name: 'الكاشير',
    role: 'sales',
    roleTitle: 'المبيعات والعملاء وفواتير البيع',
    pin: '5678',
    avatarColor: 'bg-slate-700 text-white',
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
