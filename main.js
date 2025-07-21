import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
 
console.log("📡 main.js geladen");

document.addEventListener("DOMContentLoaded", () => {
  // Firebase Setup
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
  const auth = getAuth(app);

  // UI Elemente
  const loginForm = document.getElementById("login-form");
  const loginSection = document.getElementById("login-section");
  const contentSection = document.getElementById("content-section");
  const logoutButton = document.getElementById("logout-button");

  const statsMonitoringBody = document.querySelector("#stats-monitoring tbody");
  const statsTradesBody = document.querySelector("#stats-trades tbody");

  // Tab-Umschaltung
const tab1Btn = document.getElementById("tab1-btn");
const tab2Btn = document.getElementById("tab2-btn");
const tab3Btn = document.getElementById("tab3-btn"); 

const tab1Content = document.getElementById("tab1");
const tab2Content = document.getElementById("tab2");
const tab3Content = document.getElementById("tab3"); 

function showTab(tabNumber) {
  const tabs = [tab1Content, tab2Content, tab3Content]; 
  const buttons = [tab1Btn, tab2Btn, tab3Btn];          

  tabs.forEach((tab, index) => {
    if (index === tabNumber - 1) {
      tab.style.display = "block";
      tab.classList.add("active");
      buttons[index].classList.add("active");
    } else {
      tab.style.display = "none";
      tab.classList.remove("active");
      buttons[index].classList.remove("active");
    }
  });
}

tab1Btn.addEventListener("click", () => showTab(1));
tab2Btn.addEventListener("click", () => showTab(2));
tab3Btn.addEventListener("click", () => showTab(3));


  // Login / Logout
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.email.value;
      const password = loginForm.password.value;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
      } catch (error) {
        alert("Login fehlgeschlagen: " + error.message);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      signOut(auth);
    });
  }

  // Auth State beobachten
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginSection.style.display = "none";
      contentSection.style.display = "block";
      showTab(1);
      fetchData();
      fetchTradeHistory();
      loadMultiEAStatusTable();
      watchMultiEAStatusTable();
    } else {
      loginSection.style.display = "block";
      contentSection.style.display = "none";
    }
  });

  // Login Funktion für HTML-Zugriff (wird derzeit nicht genutzt)
  window.login = async function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      document.getElementById("login-error").textContent = "❌ Login fehlgeschlagen: " + error.message;
    }
  };
  // ============ Monitoring-Daten laden ============ 

  function updateMonitoringStats(equity, balance, drawdown) {
    const lastEquity = equity.at(-1) || 0;
    const firstEquity = equity[0] || 0;
    const lastBalance = balance.at(-1) || 0;
    const firstBalance = balance[0] || 0;
    const profit = lastEquity - firstEquity;
    const growth = ((lastBalance - firstBalance) / firstBalance) * 100;
    const maxDD = Math.max(...drawdown);
    const maxDDAbs = (maxDD / 100) * lastEquity;
    const recovery = maxDDAbs > 0 ? profit / maxDDAbs : "–";
    const returns = equity.slice(1).map((e, i) => e - equity[i]);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.map(r => (r - avg) ** 2).reduce((a, b) => a + b, 0) / returns.length);
    const sharpe = stdDev > 0 ? avg / stdDev : "–";
    const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = returns.filter(r => r < 0).reduce((a, b) => a + b, 0);
    const profitFactor = losses < 0 ? gains / Math.abs(losses) : "–";

    const stats = [
      ["Aktuelle Balance", `${lastBalance.toFixed(2)} €`],
      ["Balance-Wachstum", `${growth.toFixed(2)} %`],
      ["Aktueller Equity", `${lastEquity.toFixed(2)} €`],
      ["Gewinn seit Start", `${profit.toFixed(2)} €`],
      ["Maximaler Drawdown (%)", `${maxDD.toFixed(2)} %`],
      ["Maximaler Drawdown (absolut)", `${maxDDAbs.toFixed(2)} €`],
      ["Recovery Factor", typeof recovery === "number" ? recovery.toFixed(2) : recovery],
      ["Sharpe Ratio", typeof sharpe === "number" ? sharpe.toFixed(2) : sharpe],
      ["Profit Factor", typeof profitFactor === "number" ? profitFactor.toFixed(2) : profitFactor]
    ];

    statsMonitoringBody.innerHTML = "";
    for (const [label, value] of stats) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${label}</td><td style="text-align:right">${value}</td>`;
      statsMonitoringBody.appendChild(row);
    }
  }

  // ===================================================================================== Trade-Daten laden ============
async function fetchData() {
  console.log("🔍 Lade Daten aus 'ea_monitoring'...");
  const snapshot = await getDocs(collection(db, "ea_monitoring"));
  const dataList = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    if (
      d.timestamp &&
      typeof d.equity === "number" &&
      typeof d.balance === "number" &&
      typeof d.drawdown === "number"
    ) {
      dataList.push(d);
    }
  });

  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);
  const drawdown = dataList.map(d => d.drawdown);
  const timestamps = dataList.map(d => d.timestamp);
  const indexLabels = equity.map((_, i) => i);

  const useTimeAxis =
    document.getElementById("toggle-time-axis-live")?.checked ?? false;

  const labels = useTimeAxis ? timestamps : indexLabels;
  const xScaleType = useTimeAxis ? "time" : "linear";
  const xTitle = useTimeAxis ? "Zeit" : "Index";

  const ctx = document.getElementById("chart").getContext("2d");

  // Hilfsfunktionen
  function getMinWithPadding(data, paddingFactor = 0.1) {
    const min = Math.min(...data);
    return min - Math.abs(min * paddingFactor);
  }

  function getMaxWithPadding(data, paddingFactor = 0.1) {
    const max = Math.max(...data);
    return max + Math.abs(max * paddingFactor);
  }

  // Chart

 new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "line",
          label: "Equity",
          data: equity,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "Balance",
          data: balance,
          borderColor: "rgb(192, 75, 192)",
          tension: 0.1,
          yAxisID: "y"
        },
        {
          type: "bar",
          label: "Drawdown (%)",
          data: drawdown,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)",
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
      scales: {
        x: {
          type: xScaleType,
          title: {
            display: true,
            text: xTitle
          },
          ticks: {
            stepSize: useTimeAxis ? undefined : 1
          },
          time: useTimeAxis
            ? {
                tooltipFormat: "dd.MM.yyyy HH:mm",
                displayFormats: {
                  hour: "HH:mm",
                  day: "dd.MM"
                }
              }
            : undefined
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Kontostand"
          },
          beginAtZero: false,
          min: getMinWithPadding([...equity, ...balance]),
          max: getMaxWithPadding([...equity, ...balance])
        },
        y1: {
          type: "linear",
          position: "right",
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: "Drawdown (%)"
          },
          beginAtZero: false,
          min: getMinWithPadding(drawdown),
          max: getMaxWithPadding(drawdown)
        }
      }
    }
  });

  updateMonitoringStats(equity, balance, drawdown);
}
 
async function fetchTradeHistory() {
  console.log("📦 Lade Daten aus 'ea_trades'...");
  const snapshot = await getDocs(collection(db, "ea_trades"));
  tradeList = [];

  const eaCommentPattern = /^Lasertrader_V\d{3}(?:_[A-Z]{6}_[A-Z]{2,})?$/;
  const positionIdToComment = new Map();

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.time && typeof d.profit === "number") {
      // Wenn gültiger Kommentar vorhanden → merken
      if (eaCommentPattern.test(d.comment)) {
        positionIdToComment.set(d.position_id, d.comment);
      }
      tradeList.push(d);
    }
  });

  // Nachträglich Kommentare ergänzen, falls nötig
  tradeList.forEach(t => {
    if (!eaCommentPattern.test(t.comment) && positionIdToComment.has(t.position_id)) {
      t.comment = positionIdToComment.get(t.position_id);
    }
  });

  if (tradeList.length === 0) return;

  const defaultStart = new Date("2025-01-01T00:00:00Z");
  const defaultEnd = new Date();

  const rangeInput = document.getElementById("dateRange");
  let selectedRange = [defaultStart, defaultEnd];

  flatpickr(rangeInput, {
    mode: "range",
    dateFormat: "Y-m-d",
    defaultDate: selectedRange,
    locale: "de",
    onChange: (dates) => {
      if (dates.length === 2) {
        renderChartForRange(dates[0], dates[1]);
      }
    }
  });

  renderChartForRange(defaultStart, defaultEnd);
}
//========================================================================= EA STATUS DATEN LADEN
function renderMultiEAStatusTable(dataList) {
  const tableBody = document.querySelector("#payload-table-body");
  const tableHead = document.querySelector("#payload-table-head");
  tableBody.innerHTML = "";
  tableHead.innerHTML = "";

  const fieldOrder = [
    "symbol", "TimeFilterActive", "buy_count", "sell_count",
    "Buy_BB", "Buy_RSI", "Buy_MACD", "Buy_margin",
    "Buy_maxcount", "Buy_tickmax", "Buy_ATR",
    "Sell_BB", "Sell_RSI", "Sell_MACD", "Sell_margin",
    "Sell_maxcount", "Sell_tickmax", "Sell_ATR",
    "TTPaction", "buyTTP", "sellTTP",
    "RejectionActiveBuy", "RejectionActiveSell",
    "AntiGridActiveBuy", "AntiGridActiveSell", "LossLotsActive",
    "BuyList", "SellList"
  ];

  // Gruppieren: nur der neueste pro comment
  const latestByComment = {};
  dataList.forEach(data => {
    const comment = data.comment || "unbekannt";
    if (!(comment in latestByComment)) {
      latestByComment[comment] = data;
    }
  });

  const eaNames = Object.keys(latestByComment);

  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th>Parameter</th>` + eaNames.map(name => `<th>${name}</th>`).join("");
  tableHead.appendChild(headRow);

  const extraFields = new Set();
  Object.values(latestByComment).forEach(data => {
    Object.keys(data).forEach(field => {
      if (!fieldOrder.includes(field) && field !== "timestamp" && field !== "comment") {
        extraFields.add(field);
      }
    });
  });

  const allFields = [...fieldOrder, ...Array.from(extraFields).sort()];

  allFields.forEach(field => {
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${field}</strong></td>`;
    eaNames.forEach(name => {
      const eaData = latestByComment[name];
      const value = eaData[field] !== undefined ? formatValue(eaData[field]) : "-";
      row.innerHTML += `<td style="text-align:right;">${value}</td>`;
    });
    tableBody.appendChild(row);
  });
}
async function loadMultiEAStatusTable() {
  const colRef = collection(db, "ea_status");
  const q = query(colRef, orderBy("received_at", "desc"));
  const snapshot = await getDocs(q);
  const dataList = snapshot.docs.map(doc => doc.data());
  renderMultiEAStatusTable(dataList);
}
function watchMultiEAStatusTable() {
  const colRef = collection(db, "ea_status");
  const q = query(colRef, orderBy("received_at", "desc"));

  onSnapshot(q, snapshot => {
    const dataList = snapshot.docs.map(doc => doc.data());
    renderMultiEAStatusTable(dataList);
  });
}
// Optional: Formatierung je nach Typ
function formatValue(value) {
  const keyOrder = ["time", "ticket", "volume", "open", "tp", "sl", "swap"];

  if (typeof Timestamp !== "undefined" && value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      // Nach time sortieren (älteste zuerst)
      value.sort((a, b) => (a.time || 0) - (b.time || 0));

      // Tabellen-Header mit den Keys
      const headers = keyOrder.map(key => `<th style="padding: 2px 6px; text-align: left;">${key}</th>`).join("");

      // Eine Zeile pro Objekt mit den Werten
      const rows = value.map(obj => {
        const cells = keyOrder.map(key => {
          let val = obj[key];

          // Zeit umwandeln
          if (key === "time" && typeof val === "number") {
            val = new Date(val * 1000).toLocaleString();
          }

          // Boolean in Emoji
          if (typeof val === "boolean") {
            val = val ? "✅" : "❌";
          }

          return `<td style="padding: 2px 6px;">${val !== undefined ? val : ""}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("");

      // Komplettes Table innerhalb von <details>
      return `
        <details style="margin-bottom: 4px;">
          <summary style="cursor: pointer; font-size: 0.85em; color: #007acc;">Details anzeigen</summary>
          <table style="border-collapse: collapse; font-size: 0.8em; margin-top: 4px;">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </details>`;
    }

    // Arrays von Arrays oder einfachen Werten
    return value.map(row => {
      if (Array.isArray(row)) {
        return "[" + row.map(v => String(v)).join(", ") + "]";
      }
      if (typeof row === "boolean") {
        return row ? "✅" : "❌";
      }
      return String(row);
    }).join("<br>");
  }

  // Einzelne Objekte
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  // Einzelner Boolean
  if (typeof value === "boolean") {
    return value ? "✅" : "❌";
  }

  return String(value);
}



 
  let tradeList = [];
  let tradeChart = null;
  let useTimeAxis = false;
 function renderChartForRange(startDate, endDate) {
  const eaLegendContainer = document.getElementById("ea-legend");
  if (!eaLegendContainer) {
    console.warn("⚠️ Kein Element mit ID 'ea-legend' gefunden.");
    return;
  }

  const eaCommentPattern = /^Lasertrader_V\d{3}(?:_[A-Z]{6}_[A-Z]{2,})?$/;

  // Schritt 1: Kommentare für Schließ-Deals übernehmen
  const positionToComment = {};
  tradeList.forEach(t => {
    if (eaCommentPattern.test(t.comment) && t.position_id !== undefined) {
      positionToComment[t.position_id] = t.comment;
    }
  });

  const filtered = tradeList
    .map(t => {
      const updatedComment = eaCommentPattern.test(t.comment)
        ? t.comment
        : positionToComment[t.position_id] || null;
      return { ...t, comment: updatedComment };
    })
    .filter(t => new Date(t.time) >= startDate && new Date(t.time) <= endDate)
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const eaGroups = {};
  const colors = {};
  const colorPalette = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe"];
  let colorIndex = 0;

  filtered.forEach(t => {
    const comment = t.comment;
    if (!eaCommentPattern.test(comment)) return;
    if (!eaGroups[comment]) {
      eaGroups[comment] = [];
      colors[comment] = colorPalette[colorIndex++ % colorPalette.length];
    }
    eaGroups[comment].push(t);
  });

  // Datensätze
  const datasets = [];

  // Portfolio-Datensatz
  let totalCum = 0;
  const totalData = filtered.map((t, i) => {
    totalCum += t.profit;
    return {
      x: useTimeAxis ? new Date(t.time) : i,
      y: totalCum
    };
  });

  datasets.push({
    label: "Gesamtes Portfolio",
    data: totalData,
    borderColor: "#666",
    borderWidth: 2,
    borderDash: [5, 5],
    fill: false,
    tension: 0.1,
    hidden: false // Standard: sichtbar
  });

  // EA-Datensätze
  for (const comment of Object.keys(eaGroups)) {
    let cum = 0;
    const group = eaGroups[comment];
    const data = group.map(t => {
      cum += t.profit;
      return {
        x: useTimeAxis ? new Date(t.time) : undefined,
        y: cum
      };
    });

    datasets.push({
      label: comment,
      data: data.map((d, i) => ({
        x: useTimeAxis ? new Date(group[i].time) : i,
        y: d.y
      })),
      borderColor: colors[comment],
      fill: false,
      tension: 0.1,
      hidden: true // Standard: unsichtbar
    });
  }

  // Chart erzeugen
  const ctx = document.getElementById("chart-trades").getContext("2d");
  if (tradeChart) tradeChart.destroy();

  tradeChart = new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Trades vom ${startDate.toISOString().split("T")[0]} bis ${endDate.toISOString().split("T")[0]}`
        },
        legend: { display: false } // Eigene Legende verwenden
      },
      scales: {
        x: useTimeAxis
          ? { type: "time", time: { unit: "day" }, title: { display: true, text: "Datum" } }
          : { type: "linear", title: { display: true, text: "Trade-Index" }, ticks: { stepSize: 1 } },
        y: { title: { display: true, text: "Kumulierte Balance" } }
      }
    }
  });

  // Interaktive Legende mit Checkboxen
  eaLegendContainer.innerHTML = "";
  datasets.forEach((ds, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginBottom = "4px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !ds.hidden;
    checkbox.dataset.index = index;
    checkbox.style.marginRight = "6px";

    const colorBox = document.createElement("span");
    colorBox.style.width = "12px";
    colorBox.style.height = "12px";
    colorBox.style.background = ds.borderColor;
    colorBox.style.display = "inline-block";
    colorBox.style.marginRight = "8px";

    const label = document.createElement("span");
    label.textContent = ds.label;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(colorBox);
    wrapper.appendChild(label);
    eaLegendContainer.appendChild(wrapper);

    checkbox.addEventListener("change", () => {
      const chartIndex = parseInt(checkbox.dataset.index);
      tradeChart.setDatasetVisibility(chartIndex, checkbox.checked);
      tradeChart.update();
    });
  });

  updateTradeStats(filtered);
  updateMonthlyProfitTable(tradeList);
}


document.getElementById("toggle-time-axis").addEventListener("change", (e) => {
  useTimeAxis = e.target.checked;
  if (tradeList.length > 0) {
    const start = new Date(tradeList[0].time);
    const end = new Date(tradeList.at(-1).time);
    renderChartForRange(start, end);
  }
});
  function updateTradeStats(trades) {
    if (trades.length === 0) {
      statsTradesBody.innerHTML = "<tr><td colspan='2' style='text-align:center'>Keine Trades im gewählten Zeitraum</td></tr>";
      return;
    }

    const profits = trades.map(t => t.profit);
    const total = profits.reduce((a, b) => a + b, 0);
    const avg = total / profits.length;
    const max = Math.max(...profits);
    const min = Math.min(...profits);
    const wins = profits.filter(p => p > 0).length;
    const losses = profits.filter(p => p <= 0).length;

    let peak = 0, dd = 0, maxDD = 0, running = 0;
    for (let p of profits) {
      running += p;
      if (running > peak) peak = running;
      dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }

    const recovery = maxDD > 0 ? total / maxDD : "–";
    const stdDev = Math.sqrt(profits.map(p => (p - avg) ** 2).reduce((a, b) => a + b, 0) / profits.length);
    const sharpe = stdDev > 0 ? avg / stdDev : "–";
    const gain = profits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const loss = profits.filter(p => p < 0).reduce((a, b) => a + b, 0);
    const pf = loss < 0 ? gain / Math.abs(loss) : "–";

    const stats = [
      ["Anzahl Trades", trades.length],
      ["Gesamter Gewinn", total.toFixed(2) + " €"],
      ["Durchschnittlicher Gewinn", avg.toFixed(2) + " €"],
      ["Maximaler Gewinn", max.toFixed(2) + " €"],
      ["Maximaler Verlust", min.toFixed(2) + " €"],
      ["Gewonnene Trades", wins],
      ["Verlorene Trades", losses],
      ["Recovery Factor", typeof recovery === "number" ? recovery.toFixed(2) : recovery],
      ["Sharpe Ratio", typeof sharpe === "number" ? sharpe.toFixed(2) : sharpe],
      ["Profit Factor", typeof pf === "number" ? pf.toFixed(2) : pf]
    ];

    statsTradesBody.innerHTML = "";
    for (const [label, value] of stats) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${label}</td><td style="text-align:right">${value}</td>`;
      statsTradesBody.appendChild(row);
    }
  }
  function updateMonthlyProfitTable(trades) {
    const monthly = {};
  
    // Trades nach Jahr und Monat gruppieren
    trades.forEach(t => {
      const date = new Date(t.time);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-basiert
  
      const key = `${year}-${month}`;
      if (!monthly[key]) monthly[key] = 0;
      monthly[key] += t.profit;
    });
  
    const years = [...new Set(Object.keys(monthly).map(k => parseInt(k.split("-")[0])))].sort();
    const tbody = document.getElementById("monthly-profit-body");
    tbody.innerHTML = "";
  
    years.forEach(year => {
      const row = document.createElement("tr");
      const cells = [`<td><strong>${year}</strong></td>`];
  
      for (let i = 0; i < 12; i++) {
        const key = `${year}-${i}`;
        const profit = monthly[key] || 0;
        cells.push(`<td style="text-align:right; cursor:pointer;" data-year="${year}" data-month="${i}">${profit.toFixed(2)} €</td>`);
      }
    row.innerHTML = cells.join("");
    tbody.appendChild(row);
    
    // Klick-Handler für Monatszellen
    row.querySelectorAll("td[data-year][data-month]").forEach(cell => {
      cell.addEventListener("click", () => {
        const y = parseInt(cell.dataset.year);
        const m = parseInt(cell.dataset.month);
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0, 23, 59, 59);
        renderChartForRange(start, end);
      });
    });
    
    // Klick-Handler für Jahreszelle
    const yearCell = row.querySelector("td:first-child");
    yearCell.style.cursor = "pointer";
    yearCell.addEventListener("click", () => {
      const y = parseInt(yearCell.textContent);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59);
      renderChartForRange(start, end);
    });


    });
  }
  

});
