import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Receipt,
  Users,
  Truck,
  WalletCards,
  CloudSync,
  FileCheck2,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'engines'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'treasury'
  | 'sync';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  availableEnginesCount: number;
  unpaidCustomersCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  availableEnginesCount,
  unpaidCustomersCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'لوحة التحكم',
      sublabel: 'نظرة عامة وإحصائيات',
      icon: LayoutDashboard,
    },
    {
      id: 'engines' as TabType,
      label: 'مكن ومواتير السيارات',
      sublabel: 'المخزن والإفراج الجمركي',
      icon: Cpu,
      badge: availableEnginesCount > 0 ? `${availableEnginesCount} متاح` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'sales' as TabType,
      label: 'فواتير المبيعات',
      sublabel: 'البيع الكاش والآجل والضمان',
      icon: Receipt,
    },
    {
      id: 'customers' as TabType,
      label: 'العملاء والآجل',
      sublabel: 'سندات القبض وكشف الحساب',
      icon: Users,
      badge: unpaidCustomersCount > 0 ? `${unpaidCustomersCount} عليهم آجل` : undefined,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'suppliers' as TabType,
      label: 'الموردين والمشتريات',
      sublabel: 'فواتير الوارد والمستحقات',
      icon: Truck,
    },
    {
      id: 'treasury' as TabType,
      label: 'الخزينة والأرباح',
      sublabel: 'حركة النقدية وصافي الربح',
      icon: WalletCards,
    },
    {
      id: 'sync' as TabType,
      label: 'المزامنة السحابية',
      sublabel: 'Firebase والنسخ الاحتياطي',
      icon: CloudSync,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-l border-slate-200 shrink-0 flex flex-col justify-between p-3 sm:p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          الأقسام الرئيسية
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  />
                  <div className="truncate text-right">
                    <div className="font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] truncate leading-tight mt-0.5 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-amber-400 text-slate-950' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="mt-6 pt-4 border-t border-slate-200 px-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
          <FileCheck2 className="w-4 h-4 text-emerald-600" />
          <span>قاعدة بيانات محلية Offline-First</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          جميع الصور وأرقام المحركات مخزنة على جهازك بسرعة فائقة.
        </p>
      </div>
    </aside>
  );
};
