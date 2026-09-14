import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { syncService, SyncStatus } from '../../services/syncService';
import { FirebaseConfig } from '../../types';
import {
  X,
  CloudSync,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Server,
  FileCode,
} from 'lucide-react';

interface CloudSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      db.appSettings.get('main_settings').then((rec) => {
        if (rec?.firebaseConfig) {
          setFirebaseConfig(rec.firebaseConfig);
        }
        if (rec?.cloudSyncEnabled !== undefined) {
          setCloudSyncEnabled(rec.cloudSyncEnabled);
        }
      });

      const unsubscribe = syncService.subscribe((status) => {
        setSyncStatus(status);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    await db.appSettings.update('main_settings', {
      firebaseConfig,
      cloudSyncEnabled,
    });

    await syncService.checkConfigAndInit();
    setMessage({ type: 'success', text: 'تم حفظ إعدادات Firebase وتحديث حالة الاتصال بنجاح' });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    const result = await syncService.syncNow();
    setIsSyncing(false);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  const handleExportBackup = async () => {
    const jsonStr = await syncService.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alasel_motors_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const success = await syncService.importBackupJson(content);
      if (success) {
        alert('تم استعادة النسخة الاحتياطية بنجاح إلى قاعدة البيانات المحلية!');
        window.location.reload();
      } else {
        alert('فشل استعادة النسخة الاحتياطية، تأكد من صحة الملف');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
              <CloudSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                المزامنة السحابية (Firebase) والنسخ الاحتياطي
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مزامنة ثنائية الاتجاه 2-Way Sync + تشغيل أوفلاين كامل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {message && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
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

          {/* Status Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-700 block">حالة الاتصال السحابي الحالية:</span>
              <span className="text-slate-500 mt-0.5 block">{syncStatus.message}</span>
              {syncStatus.lastSyncedAt && (
                <span className="text-[11px] text-slate-400 block mt-1">
                  آخر مزامنة ناجحة: {syncStatus.lastSyncedAt}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              <span>{isSyncing ? 'جارٍ المزامنة الآن...' : 'مزامنة ثنائية فورية'}</span>
            </button>
          </div>

          {/* Section: Firebase Config Form */}
          <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  إعدادات مشروع Firebase (Firestore)
                </h4>
                <p className="text-slate-500">
                  أدخل بيانات مشروعك في Firebase لتفعيل المزامنة بين أجهزة المحل
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={(e) => setCloudSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
                <span>تفعيل المزامنة السحابية</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={firebaseConfig.apiKey}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="alasel-motors"
                  value={firebaseConfig.projectId}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Auth Domain</label>
                <input
                  type="text"
                  placeholder="alasel-motors.firebaseapp.com"
                  value={firebaseConfig.authDomain}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="1:123456:web:abcd..."
                  value={firebaseConfig.appId}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                حفظ بيانات Firebase
              </button>
            </div>
          </form>

          {/* Section: Offline Backup & Restore */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-sm text-slate-900">
              النسخ الاحتياطي اليدوي المحلي (JSON Backup & Restore)
            </h4>
            <p className="text-slate-500">
              يمكنك تصدير قاعدة البيانات بالكامل (شاملة المواتير وصور أوراق الإفراج الجمركي والعملاء) لملف واحد للاحتفاظ به أو نقله لجهاز آخر بدون إنترنت.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-300 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>تصدير نسخة احتياطية كاملة (تحميل ملف JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-300 cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>استيراد واسترجاع من ملف JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
