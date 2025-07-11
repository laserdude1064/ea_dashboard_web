// main.js – vollständig ergänzt mit Flatpickr & Presets
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

  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const timestamps = dataList.map(d => d.timestamp);
  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);
  const drawdown = dataList.map(d => d.drawdown);

  const ctx = document.getElementById("chart").getContext("2d");

  new Chart(ctx, {
    type: "bar",
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
      plugins: {
        title: {
          display: true,
          text: "Equity, Balance & Drawdown"
        },
        legend: {
          position: "top"
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left'
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

let tradeChart;

async function fetchTradeHistory(startDate, endDate) {
  const snapshot = await getDocs(collection(db, "ea_trades"));
  const trades = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.time && d.balance) {
      const t = new Date(d.time);
      if (t >= startDate && t <= endDate) {
        trades.push({ time: t.toISOString().split("T")[0], balance: d.balance });
      }
    }
  });

  trades.sort((a, b) => a.time.localeCompare(b.time));

  const labels = trades.map(d => d.time);
  const balances = trades.map(d => d.balance);

  const ctx = document.getElementById("chart-trades").getContext("2d");

  if (tradeChart) tradeChart.destroy();

  tradeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Balance (Trades)",
          data: balances,
          borderColor: "#007bff",
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Historische Balance aus Trades"
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Balance (€)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Datum'
          }
        }
      }
    }
  });
}

fetchData();

const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 1);

const fp = flatpickr("#dateRange", {
  mode: "range",
  defaultDate: [startOfYear, now],
  dateFormat: "Y-m-d",
  onClose: function(selectedDates) {
    if (selectedDates.length === 2) {
      fetchTradeHistory(selectedDates[0], selectedDates[1]);
    }
  }
});

document.getElementById("btn-7d").onclick = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  fp.setDate([from, to]);
  fetchTradeHistory(from, to);
};

document.getElementById("btn-30d").onclick = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  fp.setDate([from, to]);
  fetchTradeHistory(from, to);
};

document.getElementById("btn-ytd").onclick = () => {
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date();
  fp.setDate([from, to]);
  fetchTradeHistory(from, to);
};

document.getElementById("btn-all").onclick = () => {
  const from = new Date("2000-01-01");
  const to = new Date();
  fp.setDate([from, to]);
  fetchTradeHistory(from, to);
};

fetchTradeHistory(startOfYear, now);
