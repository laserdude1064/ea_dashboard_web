// main.js
console.log("📡 main.js geladen");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ESM-Build von Chart.js
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.esm.js";

// === Deine Firebase-Projekt-Konfiguration ===
const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.appspot.com",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Daten von Firestore holen und Chart aufbauen
async function renderChart() {
  const snapshot = await getDocs(collection(db, "ea_monitoring"));

  const labels = [];
  const dataPoints = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.timestamp && d.equity != null) {
      labels.push(d.timestamp);
      dataPoints.push(d.equity);
    }
  });

  const ctx = document.getElementById("chart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Equity",
        data: dataPoints,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: "Equity-Verlauf"
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Zeit" }
        },
        y: {
          title: { display: true, text: "Equity (€)" }
        }
      }
    }
  });
}

renderChart().catch(err => console.error("❌ Chart-Fehler:", err));
