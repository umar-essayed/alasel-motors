import { db } from '../db';

export interface BackupStatus {
  lastBackupDate: string | null;
  isDue: boolean; // True if >= 7 days since last backup
  daysSinceLastBackup: number;
}

export class BackupService {
  private static instance: BackupService;

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  // Check backup status
  async checkBackupStatus(): Promise<BackupStatus> {
    try {
      const appSettings = await db.appSettings.get('main_settings');
      const lastBackupStr = appSettings?.settings?.lastBackupDate;

      if (!lastBackupStr) {
        return {
          lastBackupDate: null,
          isDue: true,
          daysSinceLastBackup: 999,
        };
      }

      const lastDate = new Date(lastBackupStr).getTime();
      const now = Date.now();
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

      return {
        lastBackupDate: lastBackupStr,
        isDue: diffDays >= 7,
        daysSinceLastBackup: diffDays,
      };
    } catch {
      return {
        lastBackupDate: null,
        isDue: false,
        daysSinceLastBackup: 0,
      };
    }
  }

  // Create and download complete local backup JSON (including full Base64 clearance images)
  async downloadCompleteBackup(): Promise<boolean> {
    try {
      const [
        engines,
        clearanceDocs,
        customers,
        suppliers,
        salesInvoices,
        transactions,
        accounts,
        supplierLedger,
        documentImages,
        appSettingsRec,
      ] = await Promise.all([
        db.engines.toArray(),
        db.clearanceDocs.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.salesInvoices.toArray(),
        db.transactions.toArray(),
        db.accounts.toArray(),
        db.supplierLedger.toArray(),
        db.documentImages.toArray(),
        db.appSettings.get('main_settings'),
      ]);

      const backupData = {
        version: 3,
        shop: 'الوكالة موتورز',
        exportedAt: new Date().toISOString(),
        clearanceDocsCount: clearanceDocs.length,
        enginesCount: engines.length,
        documentImagesCount: documentImages.length,
        data: {
          engines,
          clearanceDocs,
          customers,
          suppliers,
          salesInvoices,
          transactions,
          accounts,
          supplierLedger,
          documentImages,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `نسخة_احتياطية_الوكالة_موتورز_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Record backup date
      if (appSettingsRec) {
        await db.appSettings.update('main_settings', {
          settings: {
            ...appSettingsRec.settings,
            lastBackupDate: new Date().toISOString(),
          },
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to create backup:', err);
      return false;
    }
  }

  // Restore complete backup
  async restoreFromBackupJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed; // Support both structures

      if (data.engines) await db.engines.bulkPut(data.engines);
      if (data.clearanceDocs) await db.clearanceDocs.bulkPut(data.clearanceDocs);
      if (data.customers) await db.customers.bulkPut(data.customers);
      if (data.suppliers) await db.suppliers.bulkPut(data.suppliers);
      if (data.salesInvoices) await db.salesInvoices.bulkPut(data.salesInvoices);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.accounts) await db.accounts.bulkPut(data.accounts);

      return { success: true, message: 'تم استرجاع النسخة الاحتياطية بنجاح' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ملف غير صالح';
      return { success: false, message: msg };
    }
  }
}

export const backupService = BackupService.getInstance();
