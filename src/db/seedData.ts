import { Account, ShopSettings } from '../types';

// ─── إعدادات المحل الافتراضية ────────────────────────────────────────────────
export const defaultSettings: ShopSettings = {
  shopName: 'الوكالة موتورز',
  shopOwner: '',
  phone1: '',
  phone2: '',
  address: '',
  commercialRecord: '',
  taxNumber: '',
  defaultWarranty: 'ضمان 30 يوم تجربة ضد عيوب الصناعة بشرط سلامة الطبب',
  invoiceNotice: 'المحرك مباع بأوراق الإفراج الجمركي الأصلية من الوكالة موتورز وصالح للترخيص بالمرور',
  masterPullPassword: 'OmAr@20$10',
  cloudSyncEnabled: true,
  firebaseConfig: {
    apiKey: 'AIzaSyBGW3IJUU2WPjU5XlOcYX-WoBlNWecorlQ',
    authDomain: 'alasel-954c7.firebaseapp.com',
    projectId: 'alasel-954c7',
    storageBucket: 'alasel-954c7.firebasestorage.app',
    messagingSenderId: '932643000647',
    appId: '1:932643000647:web:6c3ff934e7d8e94740bc62',
    syncCollectionPrefix: 'el_wikalla_',
  },
};

// ─── حسابات النظام ──────────────────────────────────────────────────────────
export const defaultAccounts: Account[] = [
  {
    id: 'acc-ahmed',
    name: 'أحمد مجدي',
    role: 'admin',
    roleTitle: 'مدير عام',
    pin: '2026',
    avatarColor: 'bg-zinc-800 text-white',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-osama',
    name: 'أسامة',
    role: 'admin',
    roleTitle: 'مدير عام',
    pin: '2026',
    avatarColor: 'bg-zinc-800 text-white',
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
