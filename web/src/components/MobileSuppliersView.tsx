import React, { useState } from 'react';
import { Supplier, SupplierLedgerEntry } from '../types';
import { Search, BookOpen, Plus, ArrowUpRight, ArrowDownLeft, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { saveSupplierLedgerEntryRemote, saveSupplierRemote } from '../services/firebaseClient';

interface MobileSuppliersViewProps {
  suppliers: Supplier[];
  ledger: SupplierLedgerEntry[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const MobileSuppliersView: React.FC<MobileSuppliersViewProps> = ({
  suppliers,
  ledger,
  onRefresh,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Quick Agenda Entry Form
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryType, setEntryType] = useState<'payment' | 'debt_increase'>('payment');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSuppliers = suppliers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search))
  );

  const supplierEntries = selectedSupplier
    ? ledger.filter((e) => e.supplierId === selectedSupplier.id)
    : [];

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const numAmount = Number(amount);
      const isPayment = entryType === 'payment';
      const currentBalance = selectedSupplier.balanceDue || 0;
      const newBalance = isPayment ? currentBalance - numAmount : currentBalance + numAmount;

      const newEntry: SupplierLedgerEntry = {
        id: `ledger-${Date.now()}`,
        supplierId: selectedSupplier.id,
        type: entryType,
        amount: numAmount,
        date: new Date().toISOString().slice(0, 10),
        notes: notes || (isPayment ? 'سداد دفعة نقدية' : 'تسجيل دين إضافي بالدفتر'),
        referenceType: 'manual',
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
      };

      await saveSupplierLedgerEntryRemote(newEntry);

      // Update supplier balance
      const updatedSupplier: Supplier = {
        ...selectedSupplier,
        balanceDue: newBalance,
        totalPaid: isPayment ? (selectedSupplier.totalPaid || 0) + numAmount : selectedSupplier.totalPaid,
        totalSupplied: !isPayment ? (selectedSupplier.totalSupplied || 0) + numAmount : selectedSupplier.totalSupplied,
      };
      await saveSupplierRemote(updatedSupplier);

      setSelectedSupplier(updatedSupplier);
      setAmount('');
      setNotes('');
      setIsAddingEntry(false);
      onRefresh();
    } catch (err) {
      alert('فشل حفظ العملية بالسحابة');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            placeholder="بحث في الموردين وأجندة الديون..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Suppliers Grid/Cards */}
      <div className="space-y-2.5">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            {isLoading ? 'جارٍ تحميل الموردين من السحابة...' : 'لا يوجد موردون مسجلون'}
          </div>
        ) : (
          filteredSuppliers.map((supp) => (
            <div
              key={supp.id}
              onClick={() => setSelectedSupplier(supp)}
              className="bg-zinc-950 border border-zinc-850 active:border-zinc-700 p-3.5 rounded-xl space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">{supp.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{supp.phone || 'بدون هاتف'}</p>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[10px] text-zinc-500 block">رصيد الدين المستحق:</span>
                  <span className={`text-sm font-bold ${
                    (supp.balanceDue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {(supp.balanceDue || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span>مسدد: {(supp.totalPaid || 0).toLocaleString()} ج.م</span>
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  عرض دفتر الحساب
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Supplier Agenda & Ledger Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <span className="text-[10px] text-zinc-400 block">دفتر ديون المورد (الأجندة)</span>
                <h3 className="text-base font-bold text-white">{selectedSupplier.name}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedSupplier(null);
                  setIsAddingEntry(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Current Balance Summary Banner */}
            <div className="bg-black border border-zinc-850 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 block">الدين المتبقي له حالياً:</span>
                <span className="text-lg font-bold font-mono text-rose-400">
                  {(selectedSupplier.balanceDue || 0).toLocaleString()} ج.م
                </span>
              </div>

              <button
                onClick={() => setIsAddingEntry(!isAddingEntry)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingEntry ? 'إلغاء' : 'تسجيل حركة بأجندته'}</span>
              </button>
            </div>

            {/* Inline Quick Entry Form */}
            {isAddingEntry && (
              <form onSubmit={handleSaveEntry} className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType('payment')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      entryType === 'payment'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    سداد دفعة له (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('debt_increase')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      entryType === 'debt_increase'
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    زيادة دين علينا (+)
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-black border border-zinc-750 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">بيان / ملاحظة الدفعة</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: دفعة تحت الحساب كاش / استلام بضاعة..."
                    className="w-full bg-black border border-zinc-750 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ الحفظ والمزامنة...' : 'تأكيد وحفظ بالأجندة'}
                </button>
              </form>
            )}

            {/* Ledger Transactions Timeline */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-400">سجل حركات الأجندة السابقة:</h5>
              {supplierEntries.length === 0 ? (
                <div className="bg-black border border-zinc-850 p-4 rounded-xl text-center text-zinc-500 text-xs">
                  لا توجد حركات مسجلة بالأجندة لهذا المورد بعد
                </div>
              ) : (
                supplierEntries.map((item) => (
                  <div key={item.id} className="bg-black border border-zinc-850 p-2.5 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        {item.type === 'payment' ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            سداد دفعة
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            دين إضافي
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-white">
                        {item.amount?.toLocaleString()} ج.م
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300">{item.notes}</p>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-900">
                      <span>الرصيد بعد: {(item.balanceAfter || 0).toLocaleString()} ج.م</span>
                      <span>{item.date || item.createdAt?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setSelectedSupplier(null);
                setIsAddingEntry(false);
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
