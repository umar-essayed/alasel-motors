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
      label: 'نقطة البيع (POS)',
      icon: ShoppingCart,
    },
    {
      id: 'dashboard' as TabType,
      label: 'الرئيسية',
      icon: LayoutDashboard,
    },
    {
      id: 'engines' as TabType,
      label: 'مخزن المحركات',
      icon: Cpu,
      badge: availableEnginesCount > 0 ? String(availableEnginesCount) : undefined,
    },
    {
      id: 'sales' as TabType,
      label: 'فواتير البيع والمرتجعات',
      icon: Receipt,
    },
    {
      id: 'customers' as TabType,
      label: 'العملاء والديون',
      icon: Users,
      badge: unpaidCustomersCount > 0 ? String(unpaidCustomersCount) : undefined,
    },
    {
      id: 'suppliers' as TabType,
      label: 'الموردين والمشتريات',
      icon: Truck,
    },
    {
      id: 'treasury' as TabType,
      label: 'الخزينة والمصروفات',
      icon: WalletCards,
    },
    {
      id: 'analytics' as TabType,
      label: 'التقارير والأرباح',
      icon: BarChart3,
    },
    {
      id: 'sync' as TabType,
      label: 'المزامنة السحابية',
      icon: CloudSync,
    },
  ];

  return (
    <aside className="w-full md:w-60 lg:w-64 bg-white border-l border-zinc-200 shrink-0 p-3 flex flex-col justify-between select-none">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-zinc-200 mt-3">
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span>إدارة المستخدمين</span>
        </button>
      </div>
    </aside>
  );
};
