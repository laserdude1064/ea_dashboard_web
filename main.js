import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Chart.js aus Skypack als ES-Modul importieren
import { Chart, registerables } from "https://cdn.skypack.dev/chart.js";

console.log("📡 main.js geladen");

// 1️⃣ Chart.js-Registrierung
Chart.register(...registerables);

const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.appspot.com",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchData() {
  console.log("🔍 Lade Daten aus 'ea_monitoring'...");
  const snapshot = await getDocs(collection(db, "ea_monitoring"));
  const timestamps = [];
  const equity = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.timestamp && d.equity !== undefined) {
      timestamps.push(d.timestamp);
      equity.push(d.equity);
      console.log("📦 Eintrag: ", d);
    }
  });

  // 2️⃣ Canvas-Element abrufen
  const canvas = document.getElementById("chart");
  if (!canvas) {
    console.error("❌ Kein <canvas id='chart'> gefunden!");
    return;
  }
  const ctx = canvas.getContext("2d");

  // 3️⃣ Chart erzeugen
  new Chart(ctx, {
    type: "line",
    data: {
      labels: timestamps,
      datasets: [{
        label: "Equity",
        data: equity,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Equity-Verlauf"
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Timestamp" }
        },
        y: {
          title: { display: true, text: "Equity (€)" }
        }
      }
    }
  });
}

fetchData();
