import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { syncService, SyncStatus, MASTER_PULL_PASSWORD } from '../../services/syncService';
import { backupService } from '../../services/backupService';
import { R2_CONFIG } from '../../services/imageService';
import { SyncAuditLog } from '../../types';
import {
  X,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CloudDownload,
} from 'lucide-react';

interface CloudSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: '',
    pendingCount: 0,
    outboxCount: 0,
    pendingImagesCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reverse pull state
  const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
  const [pullPasswordInput, setPullPasswordInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState('');

  // Password reveal toggle for admin
  const [showMasterPassword, setShowMasterPassword] = useState(false);

  // Audit logs state
  const [recentLogs, setRecentLogs] = useState<SyncAuditLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load recent audit logs
      db.syncAuditLogs.reverse().limit(10).toArray().then(setRecentLogs);

      const unsubscribe = syncService.subscribe((status) => {
        setSyncStatus(status);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    const result = await syncService.syncNow();
    setIsSyncing(false);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
    // refresh logs
    db.syncAuditLogs.reverse().limit(10).toArray().then(setRecentLogs);
  };

  const handleExecuteReversePull = async (e: React.FormEvent) => {
    e.preventDefault();
    setPullError('');
    setIsPulling(true);

    try {
      const res = await syncService.pullFromCloudWithPassword(pullPasswordInput);
      setIsPulling(false);
      setIsPullDialogOpen(false);
      setPullPasswordInput('');
      setMessage({
        type: 'success',
        text: res.message,
      });
      // refresh logs
      db.syncAuditLogs.reverse().limit(10).toArray().then(setRecentLogs);
    } catch (err: unknown) {
      setIsPulling(false);
      const msg = err instanceof Error ? err.message : 'فشلت المزامنة العكسية';
      setPullError(msg);
    }
  };

  const handleExportBackup = async () => {
    const success = await backupService.downloadCompleteBackup();
    if (success) {
      setMessage({ type: 'success', text: 'تم تنزيل النسخة الاحتياطية الكاملة (بما فيها الصور محلياً)' });
    } else {
      setMessage({ type: 'error', text: 'فشل تصدير النسخة الاحتياطية' });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const res = await backupService.restoreFromBackupJson(content);
      if (res.success) {
        alert('تم استعادة النسخة الاحتياطية بنجاح إلى قاعدة البيانات المحلية');
        window.location.reload();
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-zinc-800">
          <div>
            <h3 className="font-bold text-sm text-white">
              المزامنة السحابية والنسخ الاحتياطي — الوكالة موتورز
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              طابور المزامنة اللحظية (Outbox) + Cloudflare R2 للصور + المزامنة العكسية الآمنة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1 text-xs text-zinc-900 dark:text-zinc-100">
          {message && (
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Quick Metrics & Outbox Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">حالة الشبكة</span>
              <span className="font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                <span className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل (أوفلاين)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">طابور العمليات المعلقة</span>
              <span className="font-bold font-mono text-amber-500 text-sm">
                {syncStatus.outboxCount || 0} عملية بالانتظار
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-0.5">صور R2 المعلقة</span>
              <span className="font-bold font-mono text-blue-500 text-sm">
                {syncStatus.pendingImagesCount || 0} صورة بالانتظار
              </span>
            </div>
          </div>

          {/* Cloud Status Banner */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-semibold block">حالة الاتصال السحابي:</span>
              <span className="text-zinc-500 dark:text-zinc-400 mt-0.5 block">{syncStatus.message}</span>
              {syncStatus.lastSyncedAt && (
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  آخر مزامنة ناجحة: {syncStatus.lastSyncedAt.replace('T', ' ').slice(0, 19)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-black font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة فورية الآن'}</span>
            </button>
          </div>

          {/* Cloudflare R2 Storage Status */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <Cloud className="w-4 h-4 text-amber-500" />
                <span>تخزين سحابي للصور (Cloudflare R2 Bucket)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                نشط: {R2_CONFIG.bucketName}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              يتم ضغط صور المكن والإفراجات الجمركية محلياً ورفعها بأسماء ذكية مرتبطة برقم المكنة، مع إمكانية التحميل الفوري من الذاكرة المحلية بدون استهلاك للإنترنت.
            </p>
          </div>

          {/* PROTECTED REVERSE SYNC SECTION */}
          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <CloudDownload className="w-4 h-4 text-amber-500" />
                <span>المزامنة العكسية (سحب البيانات من السحابة وتثبيتها محلياً)</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                محمية برمز أمان
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              تُستخدم عند تثبيت البرنامج على جهاز جديد أو استعادة البيانات السحابية بالكامل.
              <strong className="text-zinc-900 dark:text-zinc-100 mr-1">
                (يقوم النظام بأخذ نسخة أمان محلية كاملة تلقائياً قبل البدء لحماية البيانات).
              </strong>
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setPullPasswordInput('');
                  setPullError('');
                  setIsPullDialogOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>بدء المزامنة العكسية (إدخال كلمة المرور)</span>
              </button>

              {/* Secure Master Password Reference for Admin */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-zinc-400">كلمة المرور الرئيسية:</span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  {showMasterPassword ? MASTER_PULL_PASSWORD : '••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="text-zinc-400 hover:text-zinc-200"
                  title={showMasterPassword ? 'إخفاء' : 'عرض كلمة المرور'}
                >
                  {showMasterPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Backup Section */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
              <Database className="w-4 h-4 text-zinc-700 dark:text-zinc-400" />
              <span>النسخ الاحتياطي المحلي اليدوي (شامل الصور محلياً 100%)</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              يقوم بإنشاء وتنزيل ملف نسخة احتياطية كامل لجميع المحركات، الفواتير، الحسابات، وصور الإفراج الجمركي.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل نسخة احتياطية الآن</span>
              </button>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-semibold">
                <Upload className="w-3.5 h-3.5 text-zinc-500" />
                <span>استرجاع من ملف</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                سجل المزامنة والتدقيق الأخير (Audit Log):
              </span>
              <span className="text-[10px] text-zinc-400">آخر 10 عمليات</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="max-h-36 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-zinc-700 dark:text-zinc-300 truncate">{log.message}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                      {log.timestamp.replace('T', ' ').slice(11, 19)}
                    </span>
                  </div>
                ))}

                {recentLogs.length === 0 && (
                  <div className="p-4 text-center text-zinc-400 text-xs">
                    لا توجد سجلات مزامنة بعد
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REVERSE PULL PASSWORD MODAL */}
      {isPullDialogOpen && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>تأكيد المزامنة العكسية</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              يرجى إدخال كلمة المرور الرئيسية لبدء سحب البيانات من السحابة.
              سيقوم النظام آلياً بحفظ نسخة أمان احتياطية من قاعدة البيانات الحالية قبل الاستبدال.
            </p>

            {pullError && (
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs">
                {pullError}
              </div>
            )}

            <form onSubmit={handleExecuteReversePull} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  كلمة المرور الرئيسية
                </label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور..."
                  value={pullPasswordInput}
                  onChange={(e) => setPullPasswordInput(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPullDialogOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPulling}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isPulling ? 'جارٍ السحب والحفظ...' : 'تأكيد وسحب البيانات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
