console.log("📡 main.js geladen");

import { initializeApp } from "https://esm.run/firebase/app";
import { getFirestore, collection, getDocs } from "https://esm.run/firebase/firestore";

// Deine Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.appspot.com",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

// Initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Daten aus Firestore abrufen
async function fetchData() {
  console.log("🔍 Lade Daten aus 'ea_monitoring'...");
  const snapshot = await getDocs(collection(db, "ea_monitoring"));

  snapshot.forEach((doc) => {
    console.log("📦 Eintrag:", doc.data());
  });
}

fetchData();
