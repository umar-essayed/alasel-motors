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
  purchaseOnCredit?: boolean; // هل تم شراء المكنة بالأجل لتسجيل دين على المورد أم كاش
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
  // تسليم ورق التخليص الجمركي
  clearanceDelivered?: boolean;
  clearanceDeliveryDate?: string;
  clearanceRecipientName?: string;
  clearanceRecipientPhone?: string;
  clearanceTrafficDepartment?: string; // وحدة المرور المتوجه إليها
  clearanceDeliveryNotes?: string;
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

export interface SupplierLedgerEntry {
  id: string;
  entryNumber: string;
  supplierId: string;
  supplierName: string;
  type: 'debt' | 'payment' | 'discount'; // debt: دين جديد علينا (له), payment: دفعة مسددة (منه), discount: خصم / تسوية
  amount: number;
  date: string;
  notes: string;
  paymentMethod?: 'cash' | 'bank' | 'wallet';
  affectTreasury?: boolean;
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

export interface DocumentImage {
  id: string;
  engineNumber: string;
  engineTitle?: string;
  title: string;
  category: 'clearance_stamp' | 'clearance_full' | 'engine_photo' | 'invoice_doc' | 'other';
  fileName: string;
  mimeType: string;
  fileSize: number;
  localDataUrl?: string; // Loaded locally instantly (0ms)
  r2Url?: string;
  r2Key?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  errorMessage?: string;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncOutboxItem {
  id: string;
  collection: 'engines' | 'customers' | 'suppliers' | 'salesInvoices' | 'transactions' | 'supplierLedger' | 'payments' | 'clearanceDocs' | 'documentImages';
  action: 'upsert' | 'delete';
  documentId: string;
  payload: Record<string, unknown>;
  originalTimestamp: string; // Preserves exact historical date/time even if synced months later
  attempts: number;
  lastAttemptAt?: string;
  status: 'pending' | 'failed';
  error?: string;
  createdAt: string;
}

export interface SyncAuditLog {
  id: string;
  type: 'push' | 'pull' | 'image_upload' | 'safety_backup' | 'error';
  status: 'success' | 'failure';
  message: string;
  itemCount: number;
  details?: string;
  timestamp: string;
}

export interface R2Config {
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicDomain?: string;
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
  masterPullPassword?: string;
  cloudSyncEnabled?: boolean;
  lastSyncedAt?: string;
  firebaseConfig?: FirebaseConfig;
}

export interface ArchivedInvoice {
  id: string;
  sourceDocument: 'doc1_ledger' | 'doc2_receipts' | string;
  sourceDocumentName: string;
  pageNumber: number;
  rowOrPosition: string;
  engineNumber: string;
  indicNumber?: string;
  candidate2?: string;
  candidate3?: string;
  customerName: string;
  merchantName?: string;
  trafficDepartment?: string;
  date?: string;
  phone?: string;
  notes?: string;
  isMatchedWithDoc1?: boolean;
  matchType?: string;
  matchedDoc1Page?: number;
  matchedDoc1Row?: number;
  matchedDoc1Engine?: string;
  matchedDoc1Customer?: string;
  matchedDoc1Traffic?: string;
  cropUrl: string;
  isConfirmed: boolean;
  createdAt?: string;
}


