export type UserRole = 'admin' | 'sales';

export interface Account {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  pin: string; // 4-digit PIN code
  avatarColor: string;
  createdAt: string;
}

export type EngineStatus = 'available' | 'reserved' | 'sold';

export interface ClearanceDoc {
  id: string;
  engineNumber: string;
  imageData: string; // Base64 Data URL (stored 100% locally in IndexedDB)
  fileName: string;
  mimeType: string;
  customsOffice?: string; // e.g. جمرك بورسعيد / جمرك الإسكندرية / السويس
  clearanceNumber?: string; // رقم الشهادة الجمركية / الإفراج
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Engine {
  id: string;
  engineNumber: string; // رقم المكنة / المحرك (Unique)
  carBrand: string; // هيونداي، كيا، تويوتا، نيسان، ميتسوبيشي...
  carModel: string; // إلنترا، سيراتو، كورولا، لانسر...
  modelYear: string; // 2012-2016, 2015...
  engineCapacity: string; // 1600cc - G4FC
  transmissionType: string; // أوتوماتيك / عادي / يعمل على الاثنين
  condition: string; // استيراد كامل / نص استيراد / استيراد بالفتيس / مجدد فحص
  costPrice: number; // سعر الجملة / الشراء من المورد
  additionalCost: number; // مصاريف شحن / تجهيز / فحص
  sellingPrice: number; // سعر البيع المطلوب / المعروض
  actualSoldPrice?: number; // سعر البيع الفعلي عند البيع
  status: EngineStatus;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  saleInvoiceId?: string;
  saleDate?: string;
  warrantyPeriod?: string; // فترة الضمان
  notes?: string;
  hasClearanceDoc: boolean; // هل تم رفع صورة الإفراج الجمركي؟
  clearanceDocId?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchases: number; // إجمالي المشتريات منه
  totalPaid: number; // إجمالي ما سددناه له
  balance: number; // المتبقي له في ذمتنا (totalPurchases - totalPaid)
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nationalId?: string; // الرقم القومي
  address?: string;
  totalPurchases: number; // إجمالي مشترياته
  totalPaid: number; // إجمالي ما سدده
  balance: number; // المتبقي عليه آجل (totalPurchases - totalPaid)
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  engineId: string;
  engineNumber: string;
  engineTitle: string; // ماركة وموديل المكنة
  costPrice: number; // سعر الجملة لحساب الربح
  totalAmount: number; // إجمالي الفاتورة
  discount: number; // الخصم
  finalAmount: number; // الصافي
  paidAmount: number; // المسدد نقداً
  remainingAmount: number; // الآجل المتبقي
  paymentType: 'cash' | 'credit' | 'partial';
  warrantyPeriod: string; // فترة التجربة والضمان
  chassisNumber?: string; // رقم شاسيه السيارة المركب عليها الموتور
  date: string;
  profit: number; // الصافي - سعر الجملة والمصاريف
  notes?: string;
  createdBy: string;
  createdAt: string;
  synced?: boolean;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  enginesCount: number;
  enginesDetails: string;
  date: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  synced?: boolean;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  type: 'customer_payment' | 'supplier_payment';
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'wallet';
  date: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  synced?: boolean;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense'; // وارد للخزينة أو مصروف صادر
  category: 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment' | 'rent' | 'salaries' | 'shipping' | 'general_expense';
  categoryLabel: string;
  amount: number;
  title: string;
  notes?: string;
  date: string;
  relatedId?: string; // معرف الفاتورة أو المكنة أو السند
  createdBy: string;
  createdAt: string;
  synced?: boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  syncCollectionPrefix?: string;
}

export interface ShopSettings {
  shopName: string;
  shopOwner: string;
  phone1: string;
  phone2: string;
  address: string;
  commercialRecord?: string;
  taxNumber?: string;
  defaultWarranty: string;
  invoiceNotice: string;
}
