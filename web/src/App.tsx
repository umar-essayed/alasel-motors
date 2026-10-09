import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { MobileLoginView } from './components/MobileLoginView';
import { MobileEnginesView } from './components/MobileEnginesView';
import { MobileInvoicesView } from './components/MobileInvoicesView';
import { MobileSuppliersView } from './components/MobileSuppliersView';
import { MobileCustomersView } from './components/MobileCustomersView';
import { MobileAnalyticsView } from './components/MobileAnalyticsView';
import { MobileStudioView } from './components/MobileStudioView';
import { LedgerAuditStudio } from './components/LedgerAuditStudio';
import { Doc2ActiveLearningStudio } from './components/Doc2ActiveLearningStudio';
import {
  fetchEngines,
  fetchInvoices,
  fetchCustomers,
  fetchSuppliers,
  fetchSupplierLedger,
  fetchTransactions,
  fetchClearanceDocs,
} from './services/firebaseClient';
import {
  Engine,
  SalesInvoice,
  Customer,
  Supplier,
  SupplierLedgerEntry,
  Transaction,
  ClearanceDoc,
} from './types';
import logoImg from './assets/logo.png';
import {
  Package,
  Receipt,
  Users,
  BookOpen,
  BarChart3,
  FileImage,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  CheckCheck,
  Brain,
} from 'lucide-react';

export const App: React.FC = () => {
  const { activeAccount, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'engines' | 'invoices' | 'suppliers' | 'customers' | 'analytics' | 'studio' | 'ledgerAudit' | 'doc2Studio'
  >('doc2Studio');

  // Cloud state
  const [engines, setEngines] = useState<Engine[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clearanceDocs, setClearanceDocs] = useState<ClearanceDoc[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAllCloudData = async () => {
    setIsLoading(true);
    try {
      const [e, i, c, s, sl, t, cd] = await Promise.all([
        fetchEngines(),
        fetchInvoices(),
        fetchCustomers(),
        fetchSuppliers(),
        fetchSupplierLedger(),
        fetchTransactions(),
        fetchClearanceDocs(),
      ]);

      setEngines(e);
      setInvoices(i);
      setCustomers(c);
      setSuppliers(s);
      setSupplierLedger(sl);
      setTransactions(t);
      setClearanceDocs(cd);
    } catch (err) {
      console.error('Error fetching cloud data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount) {
      loadAllCloudData();
    }
  }, [activeAccount]);

  if (!activeAccount) {
    return <MobileLoginView />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-black/95 border-b border-zinc-850 px-4 h-14 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="الوكالة موتورز" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">الوكالة موتورز</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeAccount.name}</span>
              <span>•</span>
              <span className="font-mono text-amber-400">سحابي</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div
            className={`p-1.5 rounded-lg border text-xs flex items-center ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAllCloudData}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-3.5 pt-2">
        {activeTab === 'engines' && (
          <MobileEnginesView engines={engines} onRefresh={loadAllCloudData} isLoading={isLoading} />
        )}
        {activeTab === 'invoices' && (
          <MobileInvoicesView invoices={invoices} onRefresh={loadAllCloudData} isLoading={isLoading} />
        )}
        {activeTab === 'suppliers' && (
          <MobileSuppliersView
            suppliers={suppliers}
            ledger={supplierLedger}
            onRefresh={loadAllCloudData}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'customers' && (
          <MobileCustomersView
            customers={customers}
            onRefresh={loadAllCloudData}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'analytics' && (
          <MobileAnalyticsView
            engines={engines}
            invoices={invoices}
            customers={customers}
            suppliers={suppliers}
            transactions={transactions}
          />
        )}
        {activeTab === 'studio' && (
          <MobileStudioView
            clearanceDocs={clearanceDocs}
            engines={engines}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'ledgerAudit' && <LedgerAuditStudio />}
        {activeTab === 'doc2Studio' && <Doc2ActiveLearningStudio />}
      </main>

      {/* Bottom Sticky Tab Bar (Mobile Ergonomics - 0 horizontal overflow) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 border-t border-zinc-850 backdrop-blur-md px-2 py-1.5 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('doc2Studio')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'doc2Studio' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[10px]">الدفتر الكبير (3 احتمالات)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledgerAudit')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'ledgerAudit' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span className="text-[10px]">الدفتر الأول</span>
        </button>

        <button
          onClick={() => setActiveTab('engines')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'engines' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px]">المخزن</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'invoices' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px]">الفواتير</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'suppliers' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px]">الموردين</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'customers' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px]">العملاء</span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'studio' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileImage className="w-4 h-4" />
          <span className="text-[10px]">الوثائق</span>
        </button>
      </nav>
    </div>
  );
};
