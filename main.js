import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, query, orderBy, limit, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
 
console.log("📡 main.js geladen");

const accountNames = {
  "40493": "Demo1 - 40493",
  "40496": "Demo2 - 40496",
  "707838": "Eric live - 707838",
  "707947": "Marcel live - 707947"
  // weitere Einträge…
};
 
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
const accountSelect = document.getElementById("account-select");
let currentAccountId = null;
let selectedAccountId = null;
let accountListenerSet = false;
let portfolioChart = null;
let tradeChart = null;

const statsMonitoringBody = document.querySelector("#stats-monitoring tbody");
const statsTradesBody = document.querySelector("#stats-trades tbody");

// Tab-Umschaltung
const tab1Btn = document.getElementById("tab1-btn");
const tab2Btn = document.getElementById("tab2-btn");
const tab3Btn = document.getElementById("tab3-btn"); 
const tab4Btn = document.getElementById("tab4-btn");

const tab1Content = document.getElementById("tab1");
const tab2Content = document.getElementById("tab2");
const tab3Content = document.getElementById("tab3"); 
const tab4Content = document.getElementById("tab4");

function showTab(tabNumber) {
  const tabs = [tab1Content, tab2Content, tab3Content, tab4Content]; 
  const buttons = [tab1Btn, tab2Btn, tab3Btn, tab4Btn];          

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
tab4Btn.addEventListener("click", () => showTab(4));

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
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginSection.style.display = "block";
    contentSection.style.display = "none";
    return;
  }

  loginSection.style.display = "none";
  contentSection.style.display = "block";
  showTab(3);

  await loadAvailableAccounts();
  currentAccountId = accountSelect.value;

  // Account-Auswahl nur einmal verbinden
  if (!accountListenerSet) {
    accountSelect.addEventListener("change", () => {
      currentAccountId = accountSelect.value;
      reloadAllAccountData();
    });
    accountListenerSet = true;
  }

  // Initialdaten laden
  reloadAllAccountData();

  // Listener setzen (einmalig)
  watchMultiEAStatusTable();
  watchEAMessages();
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

async function loadAvailableAccounts() {
 const snapshot = await getDocs(collection(db, "ea_monitoring"));
 const accounts = new Set();

 snapshot.forEach(doc => {
  const accountId = doc.id;            // Doc-ID ist Account-ID
  accounts.add(accountId);
 });

 accountSelect.innerHTML = ""; // Reset
 Array.from(accounts).sort().forEach(acc => {
   const option = document.createElement("option");
   option.value = acc;
   option.textContent = accountNames[acc] || acc; // Mapping oder ID anzeigen
   accountSelect.appendChild(option);
 });

 // Setze ersten Account als aktiv
 if (accounts.size > 0) {
   currentAccountId = accountSelect.value;
 }
} 
function reloadAllAccountData() {
  fetchData();
  fetchTradeHistory();
  loadMultiEAStatusTable();
  loadEAParameters();
  loadEAMessages();
}

  // ========================================================================================================================== Monitoring-Daten laden ============ 

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
    ["Aktuelle Equity", `${lastEquity.toFixed(2)} €`],
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

  // ========================================================================================================== Trade-Daten laden ============
async function fetchData() {
  const dataList = [];
  if (!currentAccountId) {
    console.warn("⚠️ Kein Account ausgewählt – Abbruch.");
    return;
  }

  const includeArchive = document.getElementById("toggle-archive-data")?.checked ?? true;
  if (includeArchive) {
    console.log("🔍 Lade Daten aus 'ea_monitoring_history' für Account:", currentAccountId);
    const historySnapshot = await getDocs(collection(db, "ea_monitoring_history"));
    historySnapshot.forEach(doc => {
      const [docAccountId] = doc.id.split("_");
      if (docAccountId !== currentAccountId) return;
      const d = doc.data();
      const entries = d?.entries || [];
      entries.forEach(item => {
        if (
          item.timestamp &&
          typeof item.equity === "number" &&
          typeof item.balance === "number" &&
          typeof item.drawdown === "number"
        ) {
          dataList.push(item);
        }
      });
    });
  }

  console.log("🔍 Lade aktuelle Daten aus 'ea_monitoring'...");
  const docRef = doc(db, "ea_monitoring", currentAccountId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const d = docSnap.data();
    const entries = d?.entries || [];
    entries.forEach(item => {
      if (
        item.timestamp &&
        typeof item.equity === "number" &&
        typeof item.balance === "number" &&
        typeof item.drawdown === "number"
      ) {
        dataList.push(item);
      }
    });
  } else {
    console.warn(`Kein Dokument für Account ${currentAccountId} in ea_monitoring gefunden.`);
  }

  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

   // 🔹 NEU: Auflösung aus Dropdown auslesen
  const resolutionValue = document.getElementById("resolution-filter")?.value || "__ALL__";
  if (resolutionValue !== "__ALL__") {
    const stepMinutes = parseInt(resolutionValue, 10);
    let lastTs = 0;
    const filtered = [];
    dataList.forEach(d => {
      const ts = new Date(d.timestamp).getTime();
      if (ts - lastTs >= stepMinutes * 60000) {
        filtered.push(d);
        lastTs = ts;
      }
    });
    dataList.length = 0;
    dataList.push(...filtered);
  }

  const useTimeAxis = document.getElementById("toggle-time-axis-live")?.checked ?? false;

  // 🔹 Daten vorbereiten
  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);
  const drawdown = dataList.map(d => d.drawdown);
  const filteredDrawdown = drawdown.map(d => (d >= 0 ? d : 0));

  const timestamps = dataList.map(d => d.timestamp);
  const indexLabels = equity.map((_, i) => i);

  // ❗ Umschalten zwischen Index und Zeit
  const labels = useTimeAxis ? undefined : indexLabels;
  const equityData = useTimeAxis ? dataList.map(d => ({ x: d.timestamp, y: d.equity })) : equity;
  const balanceData = useTimeAxis ? dataList.map(d => ({ x: d.timestamp, y: d.balance })) : balance;
  const drawdownData = useTimeAxis ? dataList.map(d => ({ x: d.timestamp, y: d.drawdown >= 0 ? d.drawdown : 0 })) : filteredDrawdown;

  const ctx = document.getElementById("chart").getContext("2d");

  function getMinWithPadding(data, paddingFactor = 0.0001) {
    const min = Math.min(...data);
    return min - Math.abs(min * paddingFactor);
  }

  function getMaxWithPadding(data, paddingFactor = 0.0001) {
    const max = Math.max(...data);
    return max + Math.abs(max * paddingFactor);
  }

 if (portfolioChart) portfolioChart.destroy();
  portfolioChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { type: "line", label: "Equity", data: equityData, borderColor: "rgb(75, 192, 192)", tension: 0.1, yAxisID: "y" },
        { type: "line", label: "Balance", data: balanceData, borderColor: "rgb(192, 75, 192)", tension: 0.1, yAxisID: "y" },
        { type: "bar", label: "Drawdown (%)", data: drawdownData, backgroundColor: "rgba(255, 99, 132, 0.5)", borderColor: "rgb(255, 99, 132)", yAxisID: "y1" }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Equity, Balance & Drawdown" },
        legend: { position: "top" }
      },
      scales: {
        x: useTimeAxis
          ? {
              type: "time",
              title: { display: true, text: "Zeit" },
              time: {
                tooltipFormat: "dd.MM.yyyy HH:mm",
                displayFormats: { minute: "HH:mm", hour: "HH:mm", day: "dd.MM" },
                unit: "minute"
              },
              ticks: { autoSkip: true, source: "data" }
            }
          : {
              type: "linear",
              title: { display: true, text: "Index" },
              ticks: { stepSize: 1 }
            },
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Kontostand" },
          beginAtZero: false,
          min: getMinWithPadding([...equity, ...balance]),
          max: getMaxWithPadding([...equity, ...balance])
        },
        y1: {
          type: "linear",
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Drawdown (%)" },
          beginAtZero: true,
          min: 0,
          max: 50
        }
      }
    }
  });

  updateMonitoringStats(equity, balance, drawdown);
}



document.getElementById("toggle-time-axis-live")?.addEventListener("change", async () => {
  await fetchData();  // ruft den Chart mit neuer Achsen-Option neu auf
});

document.getElementById("toggle-archive-data")?.addEventListener("change", async () => {
  await fetchData();
});
 
// 🔹 NEU: Dropdown-Event für Auflösung
document.getElementById("resolution-filter")?.addEventListener("change", async () => {
  await fetchData();
});
 //================================================================================================================================= HISTORISCHE TRADE DATEN LADEN
async function fetchTradeHistory() {
  if (!currentAccountId) {
    console.warn("⚠️ Kein Account ausgewählt – Trade-History wird nicht geladen.");
    return;
  }

  console.log("📦 Lade Daten aus 'ea_trades' für Account:", currentAccountId);
  const snapshot = await getDocs(collection(db, "ea_trades"));
  tradeList = [];

  const eaCommentPattern = /^Lasertrader_V\d{3}(?:_[A-Z]{6}_[A-Z]{2,})?$/;
  const positionIdToComment = new Map();

  snapshot.forEach(doc => {
    const d = doc.data();
     // Prüfe Account-ID und ob "deals" Array vorhanden ist
     if (d.account_id === currentAccountId && Array.isArray(d.deals)) {
       // Alle Trades des Tages durchgehen
       d.deals.forEach(trade => {
         if (trade.time && typeof trade.profit === "number") {
           if (eaCommentPattern.test(trade.comment)) {
             positionIdToComment.set(trade.position_id, trade.comment);
           }
           tradeList.push(trade);
         }
       });
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
    mode: "range", dateFormat: "Y-m-d", defaultDate: selectedRange, locale: "de",
    onChange: (dates) => {
      if (dates.length === 2) {
        renderChartForRange(dates[0], dates[1]);
      }
    }
  });
  renderChartForRange(defaultStart, defaultEnd);
}
 
let tradeList = [];
let useTimeAxis = false;

function renderChartForRange(startDate, endDate) {
  const eaLegendContainer = document.getElementById("ea-legend");
  if (!eaLegendContainer) {
    console.warn("⚠️ Kein Element mit ID 'ea-legend' gefunden.");
    return;
  }

  const eaCommentPattern = /^Lasertrader_V\d{3}(?:_[A-Z]{6}_[A-Z]{2,})?$/;
  const positionToComment = {};
  tradeList.forEach(t => {
    if (eaCommentPattern.test(t.comment) && t.position_id !== undefined) {
      positionToComment[t.position_id] = t.comment;
    }
  });

  const filtered = tradeList
    .map(t => {
      const updatedComment = eaCommentPattern.test(t.comment) ? t.comment : positionToComment[t.position_id] || null;
      return { ...t, comment: updatedComment };
    })
    .filter(t => new Date(t.time) >= startDate && new Date(t.time) <= endDate)
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const eaGroups = {}, colors = {};
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

  const datasets = [];
  let totalCum = 0;
  const totalData = filtered.map((t, i) => {
    totalCum += t.profit;
    return { x: useTimeAxis ? new Date(t.time) : i, y: totalCum };
  });

  datasets.push({
    label: "Gesamtes Portfolio",
    data: totalData,
    borderColor: "#666",
    borderWidth: 2,
    borderDash: [5, 5],
    fill: false,
    tension: 0.1,
    hidden: false
  });

  for (const comment of Object.keys(eaGroups)) {
    let cum = 0;
    const group = eaGroups[comment];
    const data = group.map(t => {
      cum += t.profit;
      return { x: useTimeAxis ? new Date(t.time) : undefined, y: cum };
    });

    datasets.push({
      label: comment,
      data: data.map((d, i) => ({ x: useTimeAxis ? new Date(group[i].time) : i, y: d.y })),
      borderColor: colors[comment],
      fill: false,
      tension: 0.1,
      hidden: true
    });
  }

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
        legend: { display: false }
      },
      scales: {
        x: useTimeAxis
          ? { type: "time", time: { unit: "day" }, title: { display: true, text: "Datum" } }
          : { type: "linear", title: { display: true, text: "Trade-Index" }, ticks: { stepSize: 1 } },
        y: { title: { display: true, text: "Kumulierte Balance" } }
      }
    }
  });

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
//================================================================================================================================================== EA STATUS DATEN LADEN
function renderMultiEAStatusTable(dataList) {
  const openSections = new Set();
  document.querySelectorAll(".collapsible-toggle").forEach(toggleRow => {
    const text = toggleRow.textContent;
    if (text.startsWith("▼")) {
      const sectionTitle = text.replace(/^▼\s*/, "").trim();
      openSections.add(sectionTitle);
    }
  });
 
  const tableBody = document.querySelector("#payload-table-body");
  const tableHead = document.querySelector("#payload-table-head");
  tableBody.innerHTML = "";
  tableHead.innerHTML = "";

  const fieldOrder = [
    "symbol", "received_at", "TimeFilterActive", "NoTrade", "buy_count", "sell_count", "lotsize", "TPFO", "TP", "SL", "waitmins", "BuyGrid", "SellGrid",
    "Buy_BB", "Buy_RSI", "Buy_MACD", "Buy_margin",
    "Buy_maxcount", "Buy_tickmax", "Buy_ATR", "Buy_waitminsbuy", "Buy_waitminssell",
    "Sell_BB", "Sell_RSI", "Sell_MACD", "Sell_margin",
    "Sell_maxcount", "Sell_tickmax", "Sell_ATR", "Sell_waitminsbuy", "Sell_waitminssell",
    "buyTTP", "sellTTP",
    "RejectionActiveBuy", "RejectionActiveSell",
    "AntiGridActiveBuy", "AntiGridActiveSell", "LossLotsActive",
    "BuyList", "SellList"
  ];
  let parameterFieldOrder = [
  "__basic trading parameters",
  "lotsize", "LossLotsMultiplicator", "MoneyManagement", "UsedBalance",

  "__time filter parameters",
  "StopTradingHour", "StopTradingMinute", "StartTradingHour", "StartTradingMinute",
  "ActivateTimeFilter", "TimeFilterStart1", "TimeFilterOffset1",
  "TimeFilterStart2", "TimeFilterOffset2",
  "TimeFilterStart3", "TimeFilterOffset3",
  "TimeFilterDay1", "TimeFilterDay2",

  "__order parameters",
  "MaxBuyOrders", "OrderSeries", "OrderSeriesPause",
  "GridMinDist", "GridMultiplier", "waitminutes",
  "waitminutesMultiplier", "waitminsnewgrid",

  "__news trading",
  "ActivateNewsTrading", "usepredefinedevents",
  "NTminutesbefore", "NTminutesafter", "uniqueEventNamesnumber",

  "__Take Profit parameters",
  "TakeProfitFirstOrder", "TakeProfitGridOrder", "ActivateDTP",
  "DTPFirstOrderMultiplier", "DTPGridOrderMultiplier", "DTPbars", "DTPtimeframe",
  "ActivateTrailingTP", "TrailingTPthresholdFirstOrder", "TrailingTPdistFirstOrder",
  "TrailingTPthreshold", "TrailingTPdist", "TrailingTPtickDiffThreshold",
  "swapcorrection", "buyswap", "sellswap", "swapcorrectionhour",
  "ActivateRejectionTP", "RejectionTP_timeframe", "RejectionRange", "RejectionMax",

  "__Stop Loss parameters",
  "ActivateStopLoss", "StopLoss", "ActivateAntiGrid",
  "AntiGridPercentage", "AntiGridLotMultiplicator", "TrailingTPdistAntiGrid",
  "ActivateStopTime", "closeorders", "closinghours", "CloseOnOppositeSignal",

  "__Bollinger Bands indicator parameters",
  "ActivateBB", "BB_period", "BB_shift", "BB_deviation",
  "BB_applied_price", "BB_timeframe",

  "__ATR Grid parameters",
  "ActivateATRgrid", "atrgrid_period", "atrgrid_timeframe", "ATRGridMultiplier",

  "__ATR Time parameters",
  "ActivateATRtime", "atrtime_period", "atrtime_timeframe", "ATRwaitminsMultiplier",

  "__ADX indicator parameters",
  "ActivateADX", "adx_period", "adx_timeframe", "adx_threshold",

  "__RSI indicator parameters",
  "ActivateRSI", "rsi_period", "rsi_timeframe", "rsi_applied_price", "rsi_deviation",

  "__MACD indicator parameters",
  "ActivateMACD", "macd_timeframe", "macd_applied_price",
  "fast_ema_period", "slow_ema_period", "signal_period",
  "macd_thershold", "ma_period", "ma_timeframe",

  "__Volatility management",
  "volatilitysleepdays", "ActivateTickMax", "period_SL",
  "tick_max", "tick_min", "tick_max_order", "tick_Diff_avg_mult", "tick_Diff_bars",
  "ActivateDoubleBB", "BB2_period", "BB2_deviation", "BB2_applied_price", "BB2_timeframe",
  "ActivateVolaBB", "BB3_period", "BB3_deviation", "BB3_applied_price", "BB3_timeframe", "BB3diff",
  "ActivateATRThreshold", "atrTRH_period", "atrTRH_timeframe",
  "ATRThreshold", "ATRThresholdMax", "ATRThresholdMin", "ATR_avg_mult", "ATRThreshold_bars"
  ];
  if (!currentAccountId) {
    console.warn("⚠️ Kein Account ausgewählt – Tabelle wird nicht angezeigt.");
    return;
  }
 
  const latestByComment = {};
 
  dataList.forEach(data => {
    if (data.account_id !== currentAccountId) return;
    const comment = data.comment || "unbekannt";    
    if (!(comment in latestByComment)) {
      latestByComment[comment] = data;
    }
  });

  const eaEntries = Object.entries(latestByComment);
  eaEntries.sort((a, b) => {
   const commentA = a[0], commentB = b[0]; 
   const endsWith = (str, suffix) => str.endsWith(suffix) ? 1 : 0; 
   const aMR = endsWith(commentA, "MR");     // MR-EAs sollen zuerst, dann TF, dann der Rest
   const bMR = endsWith(commentB, "MR");
   if (aMR !== bMR) return bMR - aMR;
 
   const aTF = endsWith(commentA, "TF");
   const bTF = endsWith(commentB, "TF");
   if (aTF !== bTF) return bTF - aTF;
 
   // Wenn beides gleich, dann nach TimeFilterActive
   const aVal = a[1].TimeFilterActive ? 1 : 0;
   const bVal = b[1].TimeFilterActive ? 1 : 0;
   return aVal - bVal;
  });

  const eaNames = eaEntries.map(([name]) => name);
  eaEntries.forEach(([name, eaData]) => {         // Parameterdaten ergänzen
    const params = cachedParametersByComment[name];
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (!(key in eaData)) {
          eaData[key] = value;  // Parameter an das Statusobjekt anhängen
        }
      });
    }
  });
   
  // Tabellenkopf
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th>Parameter</th>` + eaNames.map(name => `<th>${name}</th>`).join("");
  tableHead.appendChild(headRow);
  
  const allFields = [...fieldOrder, ...parameterFieldOrder];
  let insertedParameterDivider = false;  
  let currentSectionBody = null;
  
  allFields.forEach(field => {
    // Trennlinie vor Parameterbereich
    if (!insertedParameterDivider && !fieldOrder.includes(field)) {
      const dividerRow = document.createElement("tr");
      dividerRow.innerHTML = `<td colspan="${eaNames.length + 1}" class="table-divider"></td>`;
      tableBody.appendChild(dividerRow);
      insertedParameterDivider = true;
    }
  
    // Neue Sektion erkannt → collapsible starten
    if (field.startsWith("__")) {
      const sectionTitle = field.slice(2);
      const sectionClass = `section-${sectionTitle.replace(/\s+/g, "-")}`;
    
      const toggleRow = document.createElement("tr");
      toggleRow.classList.add("collapsible-toggle");
      let initiallyOpen = openSections.has(sectionTitle);
    
      toggleRow.innerHTML = `<td colspan="${eaNames.length + 1}">${initiallyOpen ? "▼" : "▶"} ${sectionTitle}</td>`;
    
      toggleRow.addEventListener("click", () => {
        const rows = tableBody.querySelectorAll(`.${sectionClass}`);
        const isVisible = rows.length && rows[0].style.display !== "none";
        rows.forEach(row => {
          row.style.display = isVisible ? "none" : "table-row";
        });
        toggleRow.innerHTML = `<td colspan="${eaNames.length + 1}">${isVisible ? "▶" : "▼"} ${sectionTitle}</td>`;
      });
    
      tableBody.appendChild(toggleRow);
      currentSectionBody = sectionClass;
    
      return;
    }
   
    const row = document.createElement("tr");  // Zeile rendern

    // wenn eine Sektion aktiv ist, zuordnen und standardmäßig verstecken
    if (currentSectionBody) {
      row.classList.add(currentSectionBody);
      const sectionTitle = currentSectionBody.replace(/^section-/, "").replace(/-/g, " ");
      if (!openSections.has(sectionTitle)) {
        row.style.display = "none";
      }
    }
   
    row.innerHTML = `<td><strong>${field}</strong></td>`;
  
    eaEntries.forEach(([name, eaData]) => {
     let value = "-";
     const paramData = cachedParametersByComment[name] || {};
   
     if (eaData[field] !== undefined) {
       if (field === "received_at") {
         const date = new Date(eaData[field]);
         const now = new Date();
         const diffMs = now - date;
         const diffMin = diffMs / 1000 / 60;
   
         const h = String(date.getHours()).padStart(2, '0');
         const m = String(date.getMinutes()).padStart(2, '0');
         const s = String(date.getSeconds()).padStart(2, '0');
         value = `${h}:${m}:${s}`;
   
         row.innerHTML += `<td class="${diffMin > 5 ? 'highlight' : ''}">${value}</td>`;
         return; // ❌ FEHLER: bricht loop zu früh ab → ❗ entfernt
       } else {
         value = formatValue(eaData[field]);
       }
     } else if (paramData[field] !== undefined) {
       value = formatValue(paramData[field]);
     }   
     row.innerHTML += `<td>${value}</td>`;
   });
  
   tableBody.appendChild(row);
  });
}

async function loadMultiEAStatusTable() {
  const colRef = collection(db, "ea_status");
  const snapshot = await getDocs(colRef);
  const dataList = snapshot.docs
    .map(doc => doc.data())
    .filter(d => d.account_id === currentAccountId); // 🔧 Nur Daten des aktiven Accounts
  renderMultiEAStatusTable(dataList);
}

function watchMultiEAStatusTable() {
  const colRef = collection(db, "ea_status");

  onSnapshot(colRef, snapshot => {
    const dataList = snapshot.docs
      .map(doc => doc.data())
      .filter(d => d.account_id === currentAccountId); // 🔧 Nur Daten des aktiven Accounts

    renderMultiEAStatusTable(dataList);
  });
}
//================================================================================================================================================== EA PARAMETER DATEN LADEN
 
let cachedParametersByComment = {};
async function loadEAParameters() {
  console.log("Lade Daten aus 'ea_parameters' für Account:", currentAccountId);
  const colRef = collection(db, "ea_parameters");
  const snapshot = await getDocs(colRef);

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.account_id !== currentAccountId) {
      return; // 🚫 Ignoriere fremde Konten
    }
    const comment = data.comment;
    const timestamp = data.received_at || 0;

    cachedParametersByComment[comment] = data;
    console.log("daten für ", currentAccountId, " hinzugefügt");
    
  });
}
 
function extractParameterFieldOrderAndGroups(comment) {
  const params = cachedParametersByComment[comment];
  if (!params) return { fieldOrder: [], groupTitles: {} };

  const fieldOrder = [];
  const groupTitles = {};
  let currentGroup = null;

  for (const [key, value] of Object.entries(params)) {
    const groupMatch = key.match(/^parametergruppe\d+$/i);
    if (groupMatch) {
      currentGroup = value;
    } else {
      if (currentGroup) {
        groupTitles[key] = currentGroup;
      }
      fieldOrder.push(key);
    }
  }

  return { fieldOrder, groupTitles };
} 
// Optional: Formatierung je nach Typ
function formatValue(value) {
  const keyOrder = ["time", "ticket", "volume", "open", "tp", "sl", "swap"];

  if (typeof Timestamp !== "undefined" && value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }
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
      <button onclick='openModal(\`${generateTableHTML(value)}\`)' style="font-size:0.8em; cursor:pointer;">🗂️ Details anzeigen</button>
      `;
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
  function generateTableHTML(value) {
   const keyOrder = ["time", "ticket", "volume", "open", "tp", "sl", "swap"];
 
   value.sort((a, b) => (a.time || 0) - (b.time || 0));
   const headers = keyOrder.map(key => `<th style="padding: 2px 6px; text-align: left;">${key}</th>`).join("");
 
   const rows = value.map(obj => {
     const cells = keyOrder.map(key => {
       let val = obj[key];
       if (key === "time" && typeof val === "number") val = new Date(val * 1000).toLocaleString();
       if (typeof val === "boolean") val = val ? "✅" : "❌";
       return `<td style="padding: 2px 6px;">${val !== undefined ? val : ""}</td>`;
     }).join("");
     return `<tr>${cells}</tr>`;
   }).join("");
 
   return `
     <table style="border-collapse: collapse; font-size: 0.85em; margin-top: 4px;">
       <thead><tr>${headers}</tr></thead>
       <tbody>${rows}</tbody>
     </table>`;
 }
   function openModal(contentHtml) {
    const overlay = document.getElementById("modal-overlay");
    const body = document.getElementById("modal-body");
    body.innerHTML = contentHtml;
    overlay.style.display = "block";
  }
  
  function closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
  }
   // Wichtig: Funktionen global machen
  window.openModal = openModal;
  window.closeModal = closeModal;

 
 //================================================================================================================================================= LOGS LADEN
async function loadEAMessages(selectedEA = "") {
  const colRef = collection(db, "ea_messages");
  const snapshot = await getDocs(colRef);

  const logList = document.getElementById("log-list");
  const filterSelect = document.getElementById("log-filter");
  logList.innerHTML = "";

  const allComments = new Set();
  const previousSelection = filterSelect.value;

  // dropdown menu zurücksetzen
  filterSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "__ALL__";
  defaultOption.textContent = "Alle EAs";
  filterSelect.appendChild(defaultOption);

  const messagesToDisplay = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const comment = data.comment || "Unbekannt";
    const accountId = data.account_id || "";
    const messages = data.messages || [];

    if (accountId !== currentAccountId) return;
    allComments.add(comment);
    if (selectedEA && selectedEA !== comment) return;
   
    messages.forEach(msg => {
      // Format: "JJ-MM-TT HH:MM:SS -> Nachricht"
      const match = msg.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
      const baseDate = match ? match[1] : "1970-01-01";
      const timeStr = match ? match[2] : "00:00:00";
      const sortKey = `${baseDate}T${timeStr}`;
      messagesToDisplay.push({ comment, fullMessage: msg, baseDate, sortKey });
    });
  });

  // Nach Zeitstempel sortieren
  messagesToDisplay.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
   
  // Logs einfügen mit Datumstrenner
  let lastDate = null;
  messagesToDisplay.forEach(({ comment, fullMessage, baseDate }) => {
    if (baseDate !== lastDate) {
      const hr = document.createElement("hr");
      hr.style.border = "1px solid black";
      hr.style.margin = "10px 0";
      logList.appendChild(hr);
      lastDate = baseDate;
    }

    const li = document.createElement("li");
    li.textContent = `[${comment}] ${fullMessage}`;
    logList.appendChild(li);
  });

  // Dropdown befüllen
  allComments.forEach(comment => {
    const opt = document.createElement("option");
    opt.value = comment;
    opt.textContent = comment;
    filterSelect.appendChild(opt);
  });
 
  // Auswahl wiederherstellen oder auf "Alle EAs" zurücksetzen
  filterSelect.value = previousSelection || "__ALL__";
}

document.getElementById("log-filter").addEventListener("change", (e) => {
  const selected = e.target.value;
  loadEAMessages(selected === "__ALL__" ? "" : selected);
});

function watchEAMessages() {
 const colRef = collection(db, "ea_messages");

 onSnapshot(colRef, snapshot => {
   let relevantChange = false;

   snapshot.docChanges().forEach(change => {
     const data = change.doc.data();
     if (data.account_id === currentAccountId) {
       relevantChange = true;
     }
   });

   if (relevantChange) {
     const selected = document.getElementById("log-filter")?.value || "__ALL__";
     loadEAMessages(selected === "__ALL__" ? "" : selected);
   }
 });
}


});
