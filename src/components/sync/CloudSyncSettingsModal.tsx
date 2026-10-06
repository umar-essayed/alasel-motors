import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { syncService, SyncStatus } from '../../services/syncService';
import { backupService } from '../../services/backupService';
import { FirebaseConfig } from '../../types';
import {
  X,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
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
    setMessage({ type: 'success', text: 'تم حفظ إعدادات Firebase وتحديث حالة الاتصال' });
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">
              المزامنة السحابية والنسخ الاحتياطي
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              مزامنة السحابة + النسخ الاحتياطي المحلي
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
        <div className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {message && (
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 ${
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

          {/* Backup Section */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-zinc-900">
              <Database className="w-4 h-4 text-zinc-700" />
              <span>النسخ الاحتياطي الأسبوعي (شامل الصور محلياً 100%)</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              يقوم بإنشاء وتنزيل ملف نسخة احتياطية كامل لجميع المحركات، الفواتير، الحسابات، وصور الإفراج الجمركي.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل نسخة احتياطية الآن</span>
              </button>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold">
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

          {/* Cloud Sync Status */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-zinc-800 block">حالة الاتصال السحابي:</span>
              <span className="text-zinc-500 mt-0.5 block">{syncStatus.message}</span>
              {syncStatus.lastSyncedAt && (
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  آخر مزامنة: {syncStatus.lastSyncedAt}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة فورية'}</span>
            </button>
          </div>

          {/* Firebase Config Form */}
          <form onSubmit={handleSaveConfig} className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-zinc-900">إعدادات Firebase (Firestore)</h4>
                <p className="text-[11px] text-zinc-500">
                  (ملاحظة: الصور تظل محفوظة محلياً فقط ولا ترفع إلى السحابة لتوفير المساحة)
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800 text-xs">
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={(e) => setCloudSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900"
                />
                <span>تفعيل المزامنة</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="alasel-954c7"
                  value={firebaseConfig.projectId}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={firebaseConfig.apiKey}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Auth Domain</label>
                <input
                  type="text"
                  placeholder="alasel-954c7.firebaseapp.com"
                  value={firebaseConfig.authDomain}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={firebaseConfig.appId}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                حفظ الإعدادات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
