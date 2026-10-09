export interface Account {
  id: string;
  name: string;
  role: 'admin' | 'cashier';
  roleTitle: string;
  pin: string;
  avatarColor: string;
}

export interface Engine {
  id: string;
  engineNumber: string;
  category: string;
  carModels: string;
  specs?: string;
  purchasePrice?: number;
  salePrice: number;
  lowestPrice?: number;
  status: 'available' | 'sold' | 'reserved' | 'returned';
  isPaidSupplier?: boolean;
  clearanceDocId?: string;
  supplierId?: string;
  supplierName?: string;
  customerName?: string;
  importCountry?: string;
  customsReleaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClearanceDoc {
  id: string;
  customsDocNumber: string;
  category: string;
  importDate: string;
  country: string;
  notes?: string;
  engineIds: string[];
  imageData?: string;
  r2Url?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balanceDue: number;
  invoicesCount: number;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  totalSupplied: number;
  totalPaid: number;
  balanceDue: number;
  enginesCount: number;
  createdAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  type: 'debt_increase' | 'payment' | 'purchase_credit' | 'adjustment';
  amount: number;
  date: string;
  notes: string;
  referenceId?: string;
  referenceType?: 'engine' | 'manual' | 'receipt';
  balanceAfter: number;
  createdAt: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId?: string;
  customerPhone?: string;
  saleDate: string;
  paymentType: 'cash' | 'credit' | 'partial';
  paidAmount: number;
  remainingAmount: number;
  discountAmount?: number;
  totalAmount: number;
  cashierName: string;
  warrantyPeriod?: string;
  notes?: string;
  engineId: string;
  engineNumber: string;
  engineCategory: string;
  clearanceStatus?: 'delivered' | 'pending' | 'ready_at_traffic';
  clearanceDeliveredTo?: string;
  clearanceDeliveredAt?: string;
  trafficDepartment?: string;
  clearanceNotes?: string;
  status: 'completed' | 'returned' | 'cancelled';
  returnReason?: string;
  returnedAt?: string;
  createdAt: string;
}

export interface DocumentImage {
  id: string;
  engineNumber: string;
  category: string;
  title: string;
  dataUrl?: string;
  r2Url?: string;
  r2Key?: string;
  mimeType: string;
  sizeBytes: number;
  syncStatus: 'synced' | 'pending' | 'local_only' | 'error';
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  relatedEntity?: 'customer' | 'supplier' | 'general';
  entityId?: string;
  entityName?: string;
  referenceId?: string;
  createdAt: string;
}
