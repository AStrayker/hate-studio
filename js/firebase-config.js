import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB5X84s9PgkmnKt9nsNlsl5-mRyI06hexM",
  authDomain: "hate-studio.firebaseapp.com",
  projectId: "hate-studio",
  storageBucket: "hate-studio.firebasestorage.app",
  messagingSenderId: "862900757077",
  appId: "1:862900757077:web:ea1652b558a04235b1eadc",
  measurementId: "G-29V6NXRXMN"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };