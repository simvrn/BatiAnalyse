import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

// Remplacez par votre config Firebase (Firebase Console > Project Settings > General)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const storage = getStorage(app)

/**
 * Upload une image dans Firebase Storage et retourne son URL publique.
 * @param {File} file - Le fichier à uploader
 * @param {string} path - Chemin dans Storage, ex: "images/articles/eiffage.jpg"
 * @returns {Promise<string>} URL de téléchargement
 */
export async function uploadImage(file, path) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
