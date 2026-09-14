import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Receipt,
  Users,
  Truck,
  WalletCards,
  CloudSync,
  ShoppingCart,
  BarChart3,
  Shield,
} from 'lucide-react';

export type TabType =
  | 'pos'
  | 'dashboard'
  | 'engines'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'treasury'
  | 'analytics'
  | 'sync';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  availableEnginesCount: number;
  unpaidCustomersCount: number;
  onOpenAccountsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  availableEnginesCount,
  unpaidCustomersCount,
  onOpenAccountsModal,
}) => {
  const navItems = [
    {
      id: 'pos' as TabType,
      label: 'شاشة البيع (POS)',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      id: 'dashboard' as TabType,
      label: 'الرئيسية',
      icon: LayoutDashboard,
    },
    {
      id: 'engines' as TabType,
      label: 'مخزن المواتير',
      icon: Cpu,
      badge: availableEnginesCount > 0 ? String(availableEnginesCount) : undefined,
    },
    {
      id: 'sales' as TabType,
      label: 'فواتير البيع',
      icon: Receipt,
    },
    {
      id: 'customers' as TabType,
      label: 'العملاء والآجل',
      icon: Users,
      badge: unpaidCustomersCount > 0 ? String(unpaidCustomersCount) : undefined,
    },
    {
      id: 'suppliers' as TabType,
      label: 'الموردين',
      icon: Truck,
    },
    {
      id: 'treasury' as TabType,
      label: 'الخزينة',
      icon: WalletCards,
    },
    {
      id: 'analytics' as TabType,
      label: 'التحليلات والمؤشرات',
      icon: BarChart3,
    },
    {
      id: 'sync' as TabType,
      label: 'المزامنة السحابية',
      icon: CloudSync,
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-white border-l border-slate-200 shrink-0 p-3.5 flex flex-col justify-between">
      <div className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : item.highlight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate text-sm">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Accounts & Staff button */}
      <div className="pt-4 border-t border-slate-200 mt-4">
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4 text-slate-400" />
          <span>إدارة الحسابات والـ PIN</span>
        </button>
      </div>
    </aside>
  );
};
