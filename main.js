import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("📡 main.js geladen");

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
  const dataList = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.timestamp && d.equity && d.balance && d.drawdown !== undefined) {
      dataList.push({
        timestamp: d.timestamp,
        equity: d.equity,
        balance: d.balance,
        drawdown: d.drawdown
      });
    }
  });

  // Sortieren nach Timestamp
  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const timestamps = dataList.map(d => d.timestamp);
  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);
  const drawdown = dataList.map(d => d.drawdown);

  const ctx = document.getElementById("chart").getContext("2d");

  new Chart(ctx, {
    type: "bar", // Basis-Typ: bar, für Mischdiagramme
    data: {
      labels: timestamps,
      datasets: [
        {
          type: "line",
          label: "Equity",
          data: equity,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          yAxisID: "y",
          fill: false
        },
        {
          type: "line",
          label: "Balance",
          data: balance,
          borderColor: "rgb(192, 75, 192)",
          tension: 0.1,
          yAxisID: "y",
          fill: false
        },
        {
          type: "bar",
          label: "Drawdown (%)",
          data: drawdown,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: 'Equity, Balance & Drawdown'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Kontostand'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Drawdown (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Zeit'
          }
        }
      }
    }
  });
 // 📊 Finanzkennzahlen berechnen
  const lastEquity = equity[equity.length - 1] || 0;
  const firstEquity = equity[0] || 0;
  const weeklyProfit = lastEquity - firstEquity;
  const maxDrawdown = Math.max(...drawdown);
  const maxDrawdownAbsolute = (maxDrawdown / 100) * lastEquity;

  const stats = [
    ["Aktueller Equity", `${lastEquity.toFixed(2)} €`],
    ["Gewinn letzte Woche", `${weeklyProfit.toFixed(2)} €`],
    ["Maximaler Drawdown (%)", `${maxDrawdown.toFixed(2)} %`],
    ["Maximaler Drawdown (absolut)", `${maxDrawdownAbsolute.toFixed(2)} €`]
  ];

  const statsBody = document.getElementById("stats-body");
  statsBody.innerHTML = ""; // Vorherige Einträge löschen

  for (const [label, value] of stats) {
    const row = document.createElement("tr");
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    cell1.textContent = label;
    cell2.textContent = value;
    cell2.style.textAlign = "right";
    row.appendChild(cell1);
    row.appendChild(cell2);
    statsBody.appendChild(row);
  }
}

fetchData();
