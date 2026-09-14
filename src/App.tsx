import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { EnginesList } from './components/engines/EnginesList';
import { EngineFormModal } from './components/engines/EngineFormModal';
import { SalesList } from './components/sales/SalesList';
import { CreateSaleModal } from './components/sales/CreateSaleModal';
import { SaleInvoiceModal } from './components/sales/SaleInvoiceModal';
import { CustomersList } from './components/customers/CustomersList';
import { SuppliersList } from './components/suppliers/SuppliersList';
import { TreasuryView } from './components/treasury/TreasuryView';
import { CloudSyncSettingsModal } from './components/sync/CloudSyncSettingsModal';
import { db } from './db';
import { defaultSettings } from './db/seedData';
import { Engine, SalesInvoice, ShopSettings } from './types';
import { useLiveQuery } from 'dexie-react-hooks';

const MainApp: React.FC = () => {
  const { currentAccount, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // App Settings
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);

  // Global Modals
  const [isNewEngineModalOpen, setIsNewEngineModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [engineToSell, setEngineToSell] = useState<Engine | null>(null);
  const [printedInvoice, setPrintedInvoice] = useState<SalesInvoice | null>(null);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);

  // Live queries for sidebar badge counts
  const availableEngines = useLiveQuery(() => db.engines.where('status').equals('available').toArray()) || [];
  const customersWithDebt = useLiveQuery(() => db.customers.filter(c => c.balance > 0).toArray()) || [];

  useEffect(() => {
    db.appSettings.get('main_settings').then((rec) => {
      if (rec?.settings) {
        setSettings(rec.settings);
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-display">الأصيل موتورز • تحميل النظام...</p>
      </div>
    );
  }

  // If not logged in with account PIN, show clean LoginView
  if (!currentAccount) {
    return <LoginView />;
  }

  const handleOpenSaleForEngine = (engine: Engine) => {
    setEngineToSell(engine);
    setIsSaleModalOpen(true);
  };

  const handleSaleSuccess = (invoice: SalesInvoice) => {
    setIsSaleModalOpen(false);
    setEngineToSell(null);
    setPrintedInvoice(invoice);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
        onOpenNewEngineModal={() => setIsNewEngineModalOpen(true)}
        searchQuery={searchQuery}
        onQuickSearch={(query) => {
          setSearchQuery(query);
          if (query && activeTab !== 'engines') {
            setActiveTab('engines');
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'sync') {
              setIsSyncSettingsOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          availableEnginesCount={availableEngines.length}
          unpaidCustomersCount={customersWithDebt.length}
        />

        {/* Dynamic Tab Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              onNavigateTab={setActiveTab}
              onOpenNewEngineModal={() => setIsNewEngineModalOpen(true)}
              onOpenSaleModal={() => {
                setEngineToSell(null);
                setIsSaleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'engines' && (
            <EnginesList
              onSellEngine={handleOpenSaleForEngine}
              externalSearchQuery={searchQuery}
            />
          )}

          {activeTab === 'sales' && (
            <SalesList settings={settings} />
          )}

          {activeTab === 'customers' && (
            <CustomersList settings={settings} />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersList settings={settings} />
          )}

          {activeTab === 'treasury' && (
            <TreasuryView />
          )}
        </main>
      </div>

      {/* GLOBAL MODALS */}

      {/* Add New Engine Modal */}
      <EngineFormModal
        isOpen={isNewEngineModalOpen}
        engine={null}
        onClose={() => setIsNewEngineModalOpen(false)}
        onSaved={() => {
          // auto updated by useLiveQuery
        }}
      />

      {/* Create Sale Modal */}
      <CreateSaleModal
        isOpen={isSaleModalOpen}
        initialEngine={engineToSell}
        settings={settings}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEngineToSell(null);
        }}
        onSaleCreated={handleSaleSuccess}
      />

      {/* Printable Invoice Modal */}
      {printedInvoice && (
        <SaleInvoiceModal
          invoice={printedInvoice}
          settings={settings}
          onClose={() => setPrintedInvoice(null)}
        />
      )}

      {/* Firebase Cloud Sync & Backup Modal */}
      <CloudSyncSettingsModal
        isOpen={isSyncSettingsOpen}
        onClose={() => setIsSyncSettingsOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
