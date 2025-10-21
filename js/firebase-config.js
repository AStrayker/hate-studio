// Используем полные URL-адреса для импорта Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Ваша конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB5X84s9PgkmnKt9nsNlsl5-mRyI06hexM",
  authDomain: "hate-studio.firebaseapp.com",
  projectId: "hate-studio",
  storageBucket: "hate-studio.firebasestorage.app",
  messagingSenderId: "862900757077",
  appId: "1:862900757077:web:ea1652b558a04235b1eadc",
  measurementId: "G-29V6NXRXMN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
