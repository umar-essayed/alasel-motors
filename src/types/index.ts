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

export type EngineStatus = 'available' | 'reserved' | 'sold' | 'returned';

export interface ClearanceDoc {
  id: string;
  engineNumber: string;
  imageData: string; // Base64 Data URL (stored 100% locally in IndexedDB)
  fileName: string;
  mimeType: string;
  customsOffice?: string;
  clearanceNumber?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Engine {
  id: string;
  engineNumber: string; // رقم المكنة المدموغ (Unique)
  carBrand: string;
  carModel: string;
  modelYear?: string;
  engineCapacity?: string;
  transmissionType?: string;
  condition?: string;
  costPrice: number;
  additionalCost: number;
  sellingPrice: number;
  actualSoldPrice?: number;
  status: EngineStatus;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  saleInvoiceId?: string;
  saleDate?: string;
  warrantyPeriod?: string;
  notes?: string;
  hasClearanceDoc: boolean;
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
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
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
  engineTitle: string;
  costPrice: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentType: 'cash' | 'credit' | 'partial';
  warrantyPeriod: string;
  chassisNumber?: string;
  date: string;
  profit: number;
  notes?: string;
  status?: 'active' | 'returned';
  returnDate?: string;
  returnReason?: string;
  refundAmount?: number;
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
  type: 'income' | 'expense';
  category: 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment' | 'rent' | 'salaries' | 'shipping' | 'refund' | 'general_expense';
  categoryLabel: string;
  amount: number;
  title: string;
  notes?: string;
  date: string;
  relatedId?: string;
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
  lastBackupDate?: string;
}
