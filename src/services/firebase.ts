import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FirebaseConfig } from '../types';

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function initializeFirebase(config: FirebaseConfig): { app: FirebaseApp; db: Firestore } | null {
  try {
    if (!config.apiKey || !config.projectId) {
      return null;
    }

    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }

    firestoreDb = getFirestore(app);
    return { app, db: firestoreDb };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
}

export function getFirestoreInstance(): Firestore | null {
  return firestoreDb;
}
