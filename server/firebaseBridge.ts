import type { Plugin } from 'vite';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export function firebaseAdminSyncPlugin(): Plugin {
  let adminApp: App | null = null;
  let firestore: Firestore | null = null;
  const saPath = path.resolve(process.cwd(), 'alasel-954c7-firebase-adminsdk-fbsvc-247d2212b7.json');

  if (fs.existsSync(saPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      if (getApps().length === 0) {
        adminApp = initializeApp({ credential: cert(sa) });
      } else {
        adminApp = getApps()[0];
      }
      firestore = getFirestore(adminApp);
      console.log('✅ [Firebase Bridge] Loaded Service Account for project:', sa.project_id);
    } catch (e: any) {
      console.error('❌ [Firebase Bridge] Error initializing admin SDK:', e.message);
    }
  }

  return {
    name: 'firebase-admin-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/firebase/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        if (req.url === '/api/firebase/status' && req.method === 'GET') {
          return res.end(
            JSON.stringify({
              available: !!firestore,
              projectId: 'alasel-954c7',
              serviceAccountLoaded: true,
            })
          );
        }

        if (req.url === '/api/firebase/sync' && req.method === 'POST') {
          if (!firestore) {
            res.statusCode = 500;
            return res.end(
              JSON.stringify({
                success: false,
                error: 'لم يتم تهيئة Firebase Admin SDK محلياً',
              })
            );
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const fsDb = firestore!;

              // 1. PUSH local data into Firestore
              if (data.engines && Array.isArray(data.engines)) {
                const batch = fsDb.batch();
                for (const eng of data.engines) {
                  const ref = fsDb.collection('alasel_engines').doc(eng.id);
                  batch.set(ref, eng, { merge: true });
                }
                await batch.commit();
              }

              if (data.customers && Array.isArray(data.customers)) {
                const batch = fsDb.batch();
                for (const cust of data.customers) {
                  const ref = fsDb.collection('alasel_customers').doc(cust.id);
                  batch.set(ref, cust, { merge: true });
                }
                await batch.commit();
              }

              if (data.suppliers && Array.isArray(data.suppliers)) {
                const batch = fsDb.batch();
                for (const sup of data.suppliers) {
                  const ref = fsDb.collection('alasel_suppliers').doc(sup.id);
                  batch.set(ref, sup, { merge: true });
                }
                await batch.commit();
              }

              if (data.salesInvoices && Array.isArray(data.salesInvoices)) {
                const batch = fsDb.batch();
                for (const inv of data.salesInvoices) {
                  const ref = fsDb.collection('alasel_sales_invoices').doc(inv.id);
                  batch.set(ref, inv, { merge: true });
                }
                await batch.commit();
              }

              if (data.transactions && Array.isArray(data.transactions)) {
                const batch = fsDb.batch();
                for (const tx of data.transactions) {
                  const ref = fsDb.collection('alasel_transactions').doc(tx.id);
                  batch.set(ref, tx, { merge: true });
                }
                await batch.commit();
              }

              // 2. PULL remote data from Firestore
              const remoteEnginesSnap = await fsDb.collection('alasel_engines').get();
              const remoteEngines = remoteEnginesSnap.docs.map((d) => d.data());

              const remoteCustSnap = await fsDb.collection('alasel_customers').get();
              const remoteCust = remoteCustSnap.docs.map((d) => d.data());

              const remoteSuppSnap = await fsDb.collection('alasel_suppliers').get();
              const remoteSupp = remoteSuppSnap.docs.map((d) => d.data());

              const remoteSalesSnap = await fsDb.collection('alasel_sales_invoices').get();
              const remoteSales = remoteSalesSnap.docs.map((d) => d.data());

              const remoteTxSnap = await fsDb.collection('alasel_transactions').get();
              const remoteTx = remoteTxSnap.docs.map((d) => d.data());

              return res.end(
                JSON.stringify({
                  success: true,
                  message: 'تمت المزامنة بنجاح مع مشروع alasel-954c7 عبر Admin SDK',
                  data: {
                    engines: remoteEngines,
                    customers: remoteCust,
                    suppliers: remoteSupp,
                    salesInvoices: remoteSales,
                    transactions: remoteTx,
                  },
                })
              );
            } catch (err: any) {
              console.error('Firebase sync error:', err.message);
              res.statusCode = 400;
              return res.end(
                JSON.stringify({
                  success: false,
                  error: err.message,
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}
