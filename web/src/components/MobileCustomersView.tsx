import React, { useState } from 'react';
import { Customer } from '../types';
import { Search, User, Phone, MapPin, Wallet, AlertCircle } from 'lucide-react';
import { saveCustomerRemote } from '../services/firebaseClient';

interface MobileCustomersViewProps {
  customers: Customer[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const MobileCustomersView: React.FC<MobileCustomersViewProps> = ({
  customers,
  onRefresh,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState<'all' | 'debt'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers.filter((c) => {
    const matches = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search));
    if (!matches) return false;
    if (filterDebt === 'debt') return (c.balanceDue || 0) > 0;
    return true;
  });

  return (
    <div className="space-y-3 pb-24">
      {/* Search Header */}
      <div className="sticky top-14 z-20 bg-black/95 backdrop-blur-md pt-1 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFilterDebt('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterDebt === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            الكل ({customers.length})
          </button>
          <button
            onClick={() => setFilterDebt('debt')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterDebt === 'debt'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            عليهم مديونيات ({customers.filter((c) => (c.balanceDue || 0) > 0).length})
          </button>
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            {isLoading ? 'جارٍ تحميل العملاء من السحابة...' : 'لا يوجد عملاء مسجلون'}
          </div>
        ) : (
          filtered.map((cust) => (
            <div
              key={cust.id}
              onClick={() => setSelectedCustomer(cust)}
              className="bg-zinc-950 border border-zinc-850 active:border-zinc-700 p-3.5 rounded-xl space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">{cust.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{cust.phone || 'بدون هاتف'}</p>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[10px] text-zinc-500 block">المديونية المستحقة:</span>
                  <span className={`text-sm font-bold ${
                    (cust.balanceDue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {(cust.balanceDue || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span>إجمالي مشترياته: {(cust.totalPurchases || 0).toLocaleString()} ج.م</span>
                <span>عدد الفواتير: {cust.invoicesCount || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Detail Sheet */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <span className="text-[10px] text-zinc-400 block">بيانات العميل</span>
                <h3 className="text-base font-bold text-white">{selectedCustomer.name}</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-black border border-zinc-850 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">رقم الهاتف:</span>
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="font-mono text-amber-400 font-bold hover:underline"
                  >
                    {selectedCustomer.phone}
                  </a>
                </div>
                {selectedCustomer.nationalId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">الرقم القومي:</span>
                    <span className="font-mono text-zinc-300">{selectedCustomer.nationalId}</span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">العنوان:</span>
                    <span className="text-zinc-300">{selectedCustomer.address}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black border border-zinc-850 p-3 rounded-xl font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px] font-sans">المسدد منه:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {(selectedCustomer.totalPaid || 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-sans">المتبقي (الآجل):</span>
                  <span className="font-bold text-rose-400 text-sm">
                    {(selectedCustomer.balanceDue || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
