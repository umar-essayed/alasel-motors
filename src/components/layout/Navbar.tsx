import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { syncService, SyncStatus } from '../../services/syncService';
import { backupService, BackupStatus } from '../../services/backupService';
import { useTheme } from '../../context/ThemeContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  Plus,
  Search,
  ShoppingCart,
  Download,
  CheckCircle,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  onOpenSyncSettings: () => void;
  onOpenNewEngineModal: () => void;
  onOpenPos: () => void;
  onQuickSearch: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyncSettings,
  onOpenNewEngineModal,
  onOpenPos,
  onQuickSearch,
  searchQuery,
}) => {
  const { currentAccount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: 'محلي',
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    lastBackupDate: null,
    isDue: false,
    daysSinceLastBackup: 0,
  });
  const [backupSuccess, setBackupSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    backupService.checkBackupStatus().then((st) => setBackupStatus(st));
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncService.syncNow();
    setIsManualSyncing(false);
  };

  const handleDownloadBackup = async () => {
    const success = await backupService.downloadCompleteBackup();
    if (success) {
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
      const st = await backupService.checkBackupStatus();
      setBackupStatus(st);
    }
  };

  return (
    <header className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 w-full select-none text-zinc-900 dark:text-zinc-100">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Shop Name */}
          <div className="flex items-center gap-3 shrink-0">
            <BrandLogo className="w-9 h-9 object-contain" />
            <div>
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-none block">
                الوكالة موتورز
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-0.5">
                إدارة المحركات والمبيعات
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="بحث برقم المحرك أو الموديل..."
                value={searchQuery}
                onChange={(e) => onQuickSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* POS Shortcut */}
            <button
              type="button"
              onClick={onOpenPos}
              className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>نقطة البيع</span>
            </button>

            {/* Add Engine */}
            <button
              type="button"
              onClick={onOpenNewEngineModal}
              className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إضافة محرك</span>
            </button>

            {/* Weekly Backup Button */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              title={
                backupStatus.isDue
                  ? 'مضى أكثر من أسبوع على آخر نسخة احتياطية — اضغط للتحميل الآن'
                  : 'تنزيل نسخة احتياطية كاملة (شاملة الصور محلياً)'
              }
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                backupSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : backupStatus.isDue
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                  : 'bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {backupSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden md:inline">تم الحفظ</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {backupStatus.isDue ? 'نسخة أسبوعية مطلوبة' : 'نسخة احتياطية'}
                  </span>
                </>
              )}
            </button>

            {/* Sync Badge */}
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer text-zinc-600"
              title={`${syncStatus.message} — اضغط للمزامنة الفورية`}
            >
              {syncStatus.state === 'syncing' || isManualSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
              ) : syncStatus.state === 'synced' || syncStatus.state === 'idle' ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="hidden lg:inline text-[11px] font-medium">
                {syncStatus.state === 'synced' || syncStatus.state === 'idle'
                  ? 'سحابي'
                  : 'محلي'}
              </span>
              {(syncStatus.pendingCount || 0) > 0 && (
                <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                  {syncStatus.pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenSyncSettings}
              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer text-zinc-500"
              title="إعدادات السحابة"
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>

            {/* Pure Black Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن (أسود فاخر)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-zinc-700" />
              )}
            </button>

            {/* User */}
            {currentAccount && (
              <div className="flex items-center gap-2 pr-2 border-r border-zinc-200">
                <span className="text-xs font-semibold text-zinc-700 hidden md:block">
                  {currentAccount.name}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
