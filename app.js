const STORAGE_KEY = "travelDashboardV2";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const AFN_SYMBOL = "؋";
const LRM = "\u200E";
const CLOUD_SYNC_DEBOUNCE_MS = 800;
const AIRLINES = [
  "Ariana Afghan Airlines",
  "Kam Air",
  "FlyDubai",
  "Emirates",
  "Qatar Airways",
  "Turkish Airlines",
  "Etihad Airways",
  "Saudia",
  "Air Arabia",
  "Pegasus Airlines",
  "Lufthansa",
  "British Airways",
  "Air France",
  "KLM",
  "SWISS",
  "Austrian Airlines",
  "Iberia",
  "ITA Airways",
  "SAS",
  "Finnair",
  "LOT Polish Airlines",
  "Aegean Airlines",
  "EgyptAir",
  "Royal Jordanian",
  "Oman Air",
  "Kuwait Airways",
  "Gulf Air",
  "Pakistan International Airlines",
  "Air India",
  "IndiGo",
  "SriLankan Airlines",
  "Biman Bangladesh Airlines",
  "Thai Airways",
  "Singapore Airlines",
  "Malaysia Airlines",
  "Cathay Pacific",
  "Japan Airlines",
  "All Nippon Airways",
  "Korean Air",
  "Asiana Airlines",
  "China Southern",
  "China Eastern",
  "Air China",
  "Hainan Airlines",
  "Philippine Airlines",
  "Vietnam Airlines",
  "Garuda Indonesia",
  "Qantas",
  "Air New Zealand",
  "United Airlines",
  "Delta Air Lines",
  "American Airlines",
  "Air Canada",
  "WestJet",
  "Alaska Airlines",
  "LATAM Airlines",
  "Avianca",
  "Copa Airlines",
  "Aeromexico",
  "South African Airways",
  "Ethiopian Airlines",
  "Kenya Airways",
  "RwandAir",
  "Royal Air Maroc"
];
const SUPABASE_DEFAULTS = {
  url: "",
  anonKey: "",
  stateId: "main"
};
const SUPABASE_TABLE = "app_state";
const APP_NAME = "Bilal Siraj Travel & Umrah Services Co.";
const DB_NAME = "bilalSirajTravelDb";
const DB_VERSION = 1;
const DB_STORE = "appState";

const state = fallbackState();
let cloudSaveTimer = null;
let supabaseSyncEnabled = false;
let supabaseSyncReadyChecked = false;
const ui = {
  views: document.querySelectorAll(".view"),
  navItems: document.querySelectorAll(".nav-item"),
  saleForm: document.getElementById("saleForm"),
  expenseForm: document.getElementById("expenseForm"),
  saleTable: document.getElementById("saleTable"),
  expenseTable: document.getElementById("expenseTable"),
  mMonth: document.getElementById("mMonth"),
  mYear: document.getElementById("mYear"),
  yYear: document.getElementById("yYear"),
  tsMonth: document.getElementById("tsMonth"),
  tsYear: document.getElementById("tsYear"),
  exMonth: document.getElementById("exMonth"),
  exYear: document.getElementById("exYear"),
  ticketMonthlyTable: document.getElementById("ticketMonthlyTable"),
  expenseMonthlyTable: document.getElementById("expenseMonthlyTable"),
  fileMenuToggle: document.getElementById("fileMenuToggle"),
  fileMenuPanel: document.getElementById("fileMenuPanel"),
  customerMenuToggle: document.getElementById("customerMenuToggle"),
  customerMenuPanel: document.getElementById("caSubNav"),
  globalSearchForm: document.getElementById("globalSearchForm"),
  searchQuery: document.getElementById("searchQuery"),
  toast: document.getElementById("toast")
};

let editingSaleId = null;
let editingExpenseId = null;

init().catch(() => {
  setupNav();
  setupFileMenu();
  setupFilters();
  setupForms();
  setupSearch();
  setupCaModule();
  setupCaInvoiceAutoGenerator();
  setupDatePickers();
  renderAll();
});

async function init() {
  document.title = APP_NAME;
  await loadPersistedState();
  await hydrateStateFromCloud();
  populateAirlineOptions();
  setupNav();
  setupFileMenu();
  setupFilters();
  setupForms();
  setupAirlineManagement();
  setupSearch();
  setupCaModule();
  setupCaInvoiceAutoGenerator();
  setupDatePickers();
  renderAll();
}

function setupDatePickers() {
  const fmtISO = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const dateInputs = Array.from(document.querySelectorAll('input[id$="Display"]'));
  if (!dateInputs.length) return;

  const picker = createPopupCalendar();
  let activeInput = null;
  let activeHidden = null;
  let currentViewDate = new Date();
  let selectedDate = null;

  function createPopupCalendar() {
    const wrapper = document.createElement("div");
    wrapper.className = "custom-datepicker hidden";
    wrapper.innerHTML = `
      <div class="custom-datepicker-card">
        <div class="custom-datepicker-header">
          <button type="button" class="custom-datepicker-nav" data-action="prev" aria-label="Previous month">←</button>
          <div class="custom-datepicker-month"></div>
          <button type="button" class="custom-datepicker-nav" data-action="next" aria-label="Next month">→</button>
        </div>
        <div class="custom-datepicker-weekdays"></div>
        <div class="custom-datepicker-grid"></div>
        <div class="custom-datepicker-footer">
          <button type="button" class="custom-datepicker-btn custom-datepicker-btn--cancel" data-action="cancel">Cancel</button>
          <button type="button" class="custom-datepicker-btn custom-datepicker-btn--pick" data-action="pick">Pick</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector(".custom-datepicker-weekdays").innerHTML = WEEKDAYS.map((day) => `<div>${day}</div>`).join("");

    wrapper.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.action;
      if (!action) return;
      event.stopPropagation();

      if (action === "prev") {
        currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
        renderCalendar();
      }
      if (action === "next") {
        currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1);
        renderCalendar();
      }
      if (action === "cancel") {
        closePicker();
      }
      if (action === "pick") {
        commitDate();
      }
    });

    wrapper.addEventListener("click", (event) => {
      const dayButton = event.target.closest(".custom-datepicker-day[data-date]");
      if (!dayButton) return;
      event.stopPropagation();
      const dateValue = dayButton.dataset.date;
      if (!dateValue) return;
      selectedDate = new Date(dateValue);
      renderCalendar();
    });

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target) && !activeInput?.contains(event.target)) {
        closePicker();
      }
    });

    window.addEventListener("resize", positionPicker);
    window.addEventListener("scroll", positionPicker, true);

    return wrapper;
  }

  function openPicker(input) {
    activeInput = input;
    activeHidden = document.getElementById(input.id.replace(/Display$/, ""));
    const initialISO = String(activeHidden?.value || "").trim();
    selectedDate = initialISO ? new Date(`${initialISO}T12:00:00`) : null;
    currentViewDate = selectedDate ? new Date(selectedDate) : new Date();
    if (!selectedDate) {
      selectedDate = currentViewDate;
    }
    renderCalendar();
    positionPicker();
    picker.classList.remove("hidden");
    picker.classList.add("custom-datepicker--open");
  }

  function closePicker() {
    picker.classList.add("hidden");
    picker.classList.remove("custom-datepicker--open");
    activeInput = null;
    activeHidden = null;
  }

  function commitDate() {
    if (!activeInput || !activeHidden || !selectedDate) {
      closePicker();
      return;
    }
    activeHidden.value = fmtISO(selectedDate);
    activeInput.value = formatDisplayDate(selectedDate);
    closePicker();
  }

  function renderCalendar() {
    const monthLabel = picker.querySelector(".custom-datepicker-month");
    const grid = picker.querySelector(".custom-datepicker-grid");
    monthLabel.textContent = `${MONTH_NAMES[currentViewDate.getMonth()]} ${currentViewDate.getFullYear()}`;

    const firstOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i += 1) {
      const day = daysInPrevMonth - startOffset + i + 1;
      const dateObj = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, day);
      cells.push(renderDayCell(dateObj, true));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), day);
      cells.push(renderDayCell(dateObj, false));
    }

    const totalCells = 42;
    const trailingCount = totalCells - cells.length;
    for (let day = 1; day <= trailingCount; day += 1) {
      const dateObj = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, day);
      cells.push(renderDayCell(dateObj, true));
    }

    grid.innerHTML = cells.join("");
  }

  function renderDayCell(dateObj, muted) {
    const iso = dateObj.toISOString();
    const isSelected = selectedDate && dateObj.toDateString() === selectedDate.toDateString();
    return `
      <button type="button" class="custom-datepicker-day ${muted ? "custom-datepicker-day--muted" : ""} ${isSelected ? "custom-datepicker-day--selected" : ""}" data-date="${iso}" ${muted ? "disabled" : ""}>
        ${dateObj.getDate()}
      </button>
    `;
  }

  function positionPicker() {
    if (!activeInput || !picker) return;
    const rect = activeInput.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const desiredLeft = rect.left + scrollLeft;
    const desiredTop = rect.top + scrollTop + rect.height + 10;
    const maxRight = window.innerWidth - picker.offsetWidth - 12;
    picker.style.left = `${Math.max(12 + scrollLeft, Math.min(desiredLeft, maxRight + scrollLeft))}px`;
    picker.style.top = `${desiredTop}px`;
  }

  dateInputs.forEach((input) => {
    input.addEventListener("click", () => openPicker(input));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker(input);
      }
    });
  });
}

async function loadPersistedState() {
  const persisted = await loadStoredState();
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, persisted);
}

async function loadStoredState() {
  const fallback = fallbackState();

  // Try Flask API first
  try {
    const response = await fetch('/api/state?id=main');
    if (response.ok) {
      const sqliteState = await response.json();
      if (sqliteState && typeof sqliteState === "object") {
        return normalizeState(sqliteState, fallback);
      }
    }
  } catch (e) {
    console.warn("Flask API not available, trying legacy/electron storage.");
  }

  // Preferred (Electron): SQLite (Electron main process) via preload bridge.
  try {
    const sqliteState = await window.bsApp?.loadState?.();
    if (sqliteState && typeof sqliteState === "object") {
      return normalizeState(sqliteState, fallback);
    }
  } catch (_) {
    // ignore and try legacy
  }

  // Legacy fallback: localStorage / IndexedDB (for migration from older versions).
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const storageData = JSON.parse(raw);

    // Attempt one-time migration into SQLite.
    try {
      await window.bsApp?.saveState?.(storageData);
    } catch (_) {
      // ignore
    }

    return normalizeState(storageData, fallback);
  } catch (_ ) {
    return fallback;
  }
}

function saveState() {
  // Primary persistence: Flask API if available
  fetch('/api/state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'main',
      payload: state
    })
  }).catch(() => {
    // Fallback: SQLite via Electron main process.
    window.bsApp?.saveState?.(state).catch?.(() => {});
  });

  // Optional legacy backup so old builds can still read (does not affect SQLite).
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_ ) {
    // ignore
  }

  scheduleCloudSave();
}

function populateAirlineOptions() {
  const airlineSelect = document.getElementById("sAirline");
  if (!airlineSelect) return;
  const list = Array.isArray(state.airlines) && state.airlines.length > 0 ? state.airlines : AIRLINES;
  let html = list.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
  html += `<option value="__MANAGE__" style="font-weight: bold; color: #2ecc71;">Manage Airlines...</option>`;
  airlineSelect.innerHTML = html;
}

function setupAirlineManagement() {
  const airlineSelect = document.getElementById("sAirline");
  if (airlineSelect) {
    airlineSelect.addEventListener("change", (e) => {
      if (e.target.value === "__MANAGE__") {
        showView("manageAirlines");
        // Reset to first airline so it doesn't stay on "Manage..."
        const list = Array.isArray(state.airlines) && state.airlines.length > 0 ? state.airlines : AIRLINES;
        e.target.value = list[0] || "";
      }
    });
  }

  const airlineForm = document.getElementById("airlineForm");
  const airlineListTable = document.getElementById("airlineListTable");
  const newAirlineNameInput = document.getElementById("newAirlineName");

  if (airlineForm) {
    airlineForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = newAirlineNameInput.value.trim();
      if (!name) return;

      if (!state.airlines) state.airlines = [...AIRLINES];
      if (state.airlines.includes(name)) {
        toast("Airline already exists.");
        return;
      }

      state.airlines.push(name);
      state.airlines.sort();
      newAirlineNameInput.value = "";
      saveState();
      renderAll();
      toast("Airline added.");
    });
  }

  window.removeAirline = (name) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;
    if (!state.airlines) state.airlines = [...AIRLINES];
    state.airlines = state.airlines.filter(a => a !== name);
    saveState();
    renderAll();
    toast("Airline removed.");
  };
}

function renderAirlineList() {
  const table = document.getElementById("airlineListTable");
  if (!table) return;

  const list = Array.isArray(state.airlines) && state.airlines.length > 0 ? state.airlines : AIRLINES;
  table.innerHTML = list.map(name => `
    <tr>
      <td>${esc(name)}</td>
      <td>
        <button class="btn btn-red btn-sm" onclick="removeAirline('${esc(name)}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

// NOTE: legacy loadState/saveState were removed; use loadStoredState()/saveState() above.

function fallbackState() {
  const now = new Date();
  return {
    sales: [],
    expenses: [],
    airlines: [...AIRLINES],
    selectedMonth: now.getMonth() + 1,
    selectedYear: now.getFullYear(),
    selectedYearlyYear: now.getFullYear(),
    searchText: "",
    investByYear: {},
    caCustomers: [],
    caInvoices: [],
    caPayments: [],
    caNextInvoiceNum: 1,
    lastSaleTicketNumber: 0
  };
}

function normalizeState(parsed, fallback) {
  const parsedSelectedYear = Number(parsed?.selectedYear);
  const parsedSelectedYearlyYear = Number(parsed?.selectedYearlyYear);
  const parsedNextInvoiceNum = Number(parsed?.caNextInvoiceNum);
  const sales = Array.isArray(parsed?.sales)
    ? parsed.sales.map((s, idx) => ({
        ...s,
        airline: s.airline || "",
        currency: normalizeCurrency(s.currency),
        ticketNumber: Number.isFinite(Number(s.ticketNumber)) ? Number(s.ticketNumber) : idx + 1
      }))
    : [];
  const existingTicketNumberMax = sales.reduce((max, s) => Math.max(max, Number(s.ticketNumber) || 0), 0);
  const parsedLastSaleTicketNumber = Number(parsed?.lastSaleTicketNumber);
  const expenses = Array.isArray(parsed?.expenses)
    ? parsed.expenses.map((e, idx) => ({
        ...e,
        currency: normalizeCurrency(e.currency),
        expenseNumber: Number.isFinite(Number(e.expenseNumber)) ? Number(e.expenseNumber) : idx + 1
      }))
    : [];
  const existingExpenseNumberMax = expenses.reduce((max, e) => Math.max(max, Number(e.expenseNumber) || 0), 0);
  const parsedLastExpenseNumber = Number(parsed?.lastExpenseNumber);
  return {
    ...fallback,
    ...(parsed && typeof parsed === "object" ? parsed : {}),
    sales,
    expenses,
    selectedYear: Number.isFinite(parsedSelectedYear) && parsedSelectedYear > 0 ? parsedSelectedYear : fallback.selectedYear,
    selectedYearlyYear:
      Number.isFinite(parsedSelectedYearlyYear) && parsedSelectedYearlyYear > 0
        ? parsedSelectedYearlyYear
        : fallback.selectedYearlyYear,
    investByYear:
      parsed?.investByYear && typeof parsed.investByYear === "object" && !Array.isArray(parsed.investByYear)
        ? parsed.investByYear
        : {},
    caCustomers: Array.isArray(parsed?.caCustomers) ? parsed.caCustomers : [],
    caInvoices: Array.isArray(parsed?.caInvoices)
      ? parsed.caInvoices.map((i) => ({ ...i, currency: normalizeCurrency(i.currency) }))
      : [],
    caPayments: Array.isArray(parsed?.caPayments)
      ? parsed.caPayments.map((p) => ({ ...p, currency: normalizeCurrency(p.currency) }))
      : [],
    caNextInvoiceNum: Number.isFinite(parsedNextInvoiceNum) ? Math.max(1, parsedNextInvoiceNum) : 1,
    lastSaleTicketNumber: Number.isFinite(parsedLastSaleTicketNumber)
      ? Math.max(parsedLastSaleTicketNumber, existingTicketNumberMax)
      : existingTicketNumberMax,
    lastExpenseNumber: Number.isFinite(parsedLastExpenseNumber)
      ? Math.max(parsedLastExpenseNumber, existingExpenseNumberMax)
      : existingExpenseNumberMax
  };
}

function supabaseConfig() {
  const runtime = window.SUPABASE_CONFIG || {};
  const url = String(runtime.url || localStorage.getItem("supabaseUrl") || SUPABASE_DEFAULTS.url).trim();
  const anonKey = String(runtime.anonKey || localStorage.getItem("supabaseAnonKey") || SUPABASE_DEFAULTS.anonKey).trim();
  const stateId = String(runtime.stateId || localStorage.getItem("supabaseStateId") || SUPABASE_DEFAULTS.stateId).trim() || "main";
  return { url, anonKey, stateId };
}

function isSupabaseEnabled() {
  if (supabaseSyncReadyChecked) return supabaseSyncEnabled;
  const cfg = supabaseConfig();
  supabaseSyncEnabled = Boolean(cfg.url && cfg.anonKey && !cfg.url.includes("YOUR_") && !cfg.anonKey.includes("YOUR_"));
  supabaseSyncReadyChecked = true;
  return supabaseSyncEnabled;
}

function getSupabaseClient() {
  const cfg = supabaseConfig();
  if (!cfg.url || !cfg.anonKey || !window.supabase) return null;
  return window.supabase.createClient(cfg.url, cfg.anonKey);
}

async function hydrateStateFromCloud() {
  if (!isSupabaseEnabled()) return;
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");
    const cfg = supabaseConfig();
    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .select("payload")
      .eq("id", cfg.stateId)
      .limit(1)
      .single();
    if (error || !data?.payload) return;
    const merged = normalizeState(data.payload, fallbackState());
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveStateToDb(state).catch(() => {});
    toast("Supabase data loaded.");
  } catch (_) {
    toast("Supabase sync unavailable. Using local data.");
  }
}

function scheduleCloudSave() {
  if (!isSupabaseEnabled()) return;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    pushStateToCloud().catch(() => {});
  }, CLOUD_SYNC_DEBOUNCE_MS);
}

async function pushStateToCloud() {
  if (!isSupabaseEnabled()) return;
  const client = getSupabaseClient();
  if (!client) return;
  const cfg = supabaseConfig();
  await client.from(SUPABASE_TABLE).upsert(
    {
      id: cfg.stateId,
      payload: state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCurrency(v) {
  const raw = String(v || "")
    .trim()
    .toUpperCase();
  if (!raw) return "USD";

  // Accept old/alternate labels so totals stay correct everywhere.
  if (raw === "AFN" || raw === "AFG" || raw === "AFGHANI" || raw === "AFGHAN AFGHANI") {
    return "AFN";
  }
  return "USD";
}

function money(v) {
  return `$${toNumber(v).toFixed(2)}`;
}

function moneyByCurrency(v, currency) {
  const amount = toNumber(v).toFixed(2);
  return normalizeCurrency(currency) === "AFN" ? `${LRM}${AFN_SYMBOL} ${amount}${LRM}` : `$${amount}`;
}

function currencyPairText(values) {
  const usd = toNumber(values?.USD);
  const afn = toNumber(values?.AFN);
  return `USD: ${moneyByCurrency(usd, "USD")} | AFN: ${moneyByCurrency(afn, "AFN")}`;
}

function sumByCurrency(items, getAmount) {
  return items.reduce(
    (acc, item) => {
      const currency = normalizeCurrency(item.currency);
      acc[currency] += toNumber(getAmount(item));
      return acc;
    },
    { USD: 0, AFN: 0 }
  );
}

function yearOf(date) {
  return Number((date || "").slice(0, 4)) || 0;
}

function monthOf(date) {
  return Number((date || "").slice(5, 7)) || 0;
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toast(msg) {
  if (!ui.toast) return;
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  setTimeout(() => ui.toast.classList.remove("show"), 1500);
}

function setupNav() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  sidebar.addEventListener("click", (e) => {
    const caHome = e.target.closest("#customerMenuToggle");
    if (caHome) {
      const isVisible = ui.customerMenuPanel?.classList.contains("is-visible");
      setCaSubNavVisible(!isVisible);
      ui.customerMenuToggle?.querySelector(".caret")?.classList.toggle("fa-rotate-180", !isVisible);
      if (!isVisible) {
        ui.fileMenuPanel?.classList.remove("is-visible");
        ui.fileMenuToggle?.querySelector(".caret")?.classList.remove("fa-rotate-180");
      }
      return;
    }

    const btn = e.target.closest(".nav-item[data-view]");
    if (btn) {
      showView(btn.dataset.view);
      setCaSubNavVisible(false);
      ui.customerMenuToggle?.querySelector(".caret")?.classList.remove("fa-rotate-180");
      ui.fileMenuPanel?.classList.remove("is-visible");
      ui.fileMenuToggle?.querySelector(".caret")?.classList.remove("fa-rotate-180");
      return;
    }

    const sub = e.target.closest(".nav-sub-item[data-view]");
    if (sub) {
      showView(sub.dataset.view);
      setCaSubNavVisible(true);
      ui.customerMenuToggle?.querySelector(".caret")?.classList.add("fa-rotate-180");
    }
  });
}

function showView(name) {
  const view = document.getElementById(`${name}View`);
  if (!view) return;
  ui.views.forEach((v) => v.classList.remove("active"));
  view.classList.add("active");
  ui.navItems.forEach((n) => n.classList.remove("active"));
  document.querySelectorAll(".nav-sub-item").forEach((n) => n.classList.remove("active-sub"));

  if (name.startsWith("ca")) {
    const caBtn = document.querySelector("[data-ca-home]");
    if (caBtn) caBtn.classList.add("active");
    const activeSub = document.querySelector(`.nav-sub-item[data-view="${name}"]`);
    if (activeSub) activeSub.classList.add("active-sub");
    renderCaModule();
    return;
  }

  const activeBtn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  if (name === "yearlySummary") {
    renderYearlySummary();
  }
}

function setCaSubNavVisible(show) {
  const caSubNav = ui.customerMenuPanel || document.getElementById("caSubNav");
  if (!caSubNav) return;
  caSubNav.classList.toggle("is-visible", show);
  caSubNav.setAttribute("aria-hidden", show ? "false" : "true");
}

function setupFileMenu() {
  if (!ui.fileMenuToggle || !ui.fileMenuPanel) return;

  ui.fileMenuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = ui.fileMenuPanel.classList.contains("is-visible");
    ui.fileMenuPanel.classList.toggle("is-visible", !isVisible);
    ui.fileMenuToggle.querySelector(".caret")?.classList.toggle("fa-rotate-180", !isVisible);
    
    // If opening file menu, close customers menu
    if (!isVisible) {
      setCaSubNavVisible(false);
      ui.customerMenuToggle?.querySelector(".caret")?.classList.remove("fa-rotate-180");
    }
  });

  ui.fileMenuPanel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-export]");
    if (btn) {
      const type = btn.dataset.export;
      if (type === "ticket") printMonthlyTicketSale();
      else if (type === "expense") printMonthlyExpense();
      else if (type === "monthlySummary") printMonthlySummary();
      else if (type === "yearly") printYearlySummary();
      ui.fileMenuPanel.classList.remove("is-visible");
      ui.fileMenuToggle.querySelector(".caret")?.classList.remove("fa-rotate-180");
    }
  });

  // Export all data as JSON
  const exportBtn = document.getElementById("exportDataBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      try {
        // Get latest state from Flask API or SQLite
        let data;
        try {
          const resp = await fetch('/api/state?id=main');
          if (resp.ok) data = await resp.json();
        } catch (e) {}

        if (!data) {
          data = await window.bsApp?.loadState?.() || state;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bilal-siraj-travel-backup.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        toast("Data exported as JSON file.");
      } catch (e) {
        toast("Export failed: " + (e?.message || e));
      }
    });
  }

  // Import data from JSON
  const importBtn = document.getElementById("importDataBtn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.addEventListener("change", async (e) => {
        const file = input.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = JSON.parse(text);
          // Save to Flask API
          try {
            await fetch('/api/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: 'main', payload: imported })
            });
          } catch (e) {}
          // Save to SQLite if in Electron
          await window.bsApp?.saveState?.(imported);
          Object.keys(state).forEach((k) => delete state[k]);
          Object.assign(state, imported);
          renderAll();
          toast("Data imported successfully.");
        } catch (e) {
          toast("Import failed: " + (e?.message || e));
        }
      });
      input.click();
    });
  }
}

function setupFilters() {
  if (!ui.mMonth || !ui.mYear || !ui.yYear) return;
  ui.mMonth.innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  refreshYearOptions();
  ui.mMonth.value = String(state.selectedMonth);
  ui.mYear.value = String(state.selectedYear);
  ui.yYear.value = String(state.selectedYearlyYear);

  if (ui.tsMonth && ui.tsYear) {
    ui.tsMonth.innerHTML = ui.mMonth.innerHTML;
    ui.tsYear.innerHTML = ui.mYear.innerHTML;
    ui.tsMonth.value = String(state.selectedMonth);
    ui.tsYear.value = String(state.selectedYear);
  }
  if (ui.exMonth && ui.exYear) {
    ui.exMonth.innerHTML = ui.mMonth.innerHTML;
    ui.exYear.innerHTML = ui.mYear.innerHTML;
    ui.exMonth.value = String(state.selectedMonth);
    ui.exYear.value = String(state.selectedYear);
  }

  ui.mMonth.addEventListener("change", (e) => {
    state.selectedMonth = Number(e.target.value);
    syncMonthYear();
  });
  ui.mYear.addEventListener("change", (e) => {
    state.selectedYear = Number(e.target.value);
    syncMonthYear();
  });
  ui.yYear.addEventListener("change", (e) => {
    state.selectedYearlyYear = Number(e.target.value);
    saveState();
    renderYearlySummary();
  });

  ui.tsMonth?.addEventListener("change", (e) => {
    state.selectedMonth = Number(e.target.value);
    syncMonthYear();
  });
  ui.tsYear?.addEventListener("change", (e) => {
    state.selectedYear = Number(e.target.value);
    syncMonthYear();
  });
  ui.exMonth?.addEventListener("change", (e) => {
    state.selectedMonth = Number(e.target.value);
    syncMonthYear();
  });
  ui.exYear?.addEventListener("change", (e) => {
    state.selectedYear = Number(e.target.value);
    syncMonthYear();
  });
}

function syncMonthYear() {
  saveState();
  if (ui.mMonth) ui.mMonth.value = String(state.selectedMonth);
  if (ui.mYear) ui.mYear.value = String(state.selectedYear);
  if (ui.tsMonth) ui.tsMonth.value = String(state.selectedMonth);
  if (ui.tsYear) ui.tsYear.value = String(state.selectedYear);
  if (ui.exMonth) ui.exMonth.value = String(state.selectedMonth);
  if (ui.exYear) ui.exYear.value = String(state.selectedYear);
  renderMonthlySummary();
  renderTicketMonthlyList();
  renderExpenseMonthlyList();
}

function availableYears() {
  const now = new Date().getFullYear();
  const set = new Set([now]);
  state.sales.forEach((s) => set.add(yearOf(s.date)));
  state.expenses.forEach((e) => set.add(yearOf(e.date)));
  return [...set].filter(Boolean).sort((a, b) => b - a);
}

function refreshYearOptions() {
  const years = availableYears();
  const opts = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  if (ui.mYear) ui.mYear.innerHTML = opts;
  if (ui.yYear) ui.yYear.innerHTML = opts;
  if (!years.includes(state.selectedYear)) state.selectedYear = years[0];
  if (!years.includes(state.selectedYearlyYear)) state.selectedYearlyYear = years[0];
  if (ui.mYear) ui.mYear.value = String(state.selectedYear);
  if (ui.yYear) ui.yYear.value = String(state.selectedYearlyYear);
  if (ui.tsYear) ui.tsYear.value = String(state.selectedYear);
  if (ui.exYear) ui.exYear.value = String(state.selectedYear);
}

function setupForms() {
  if (ui.saleForm) {
    ui.saleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        contact: document.getElementById("sContact")?.value.trim() || "",
        passenger: document.getElementById("sPassenger")?.value.trim() || "",
        route: document.getElementById("sRoute")?.value.trim() || "",
        airline: document.getElementById("sAirline")?.value || "",
        date: document.getElementById("sDate")?.value || "",
        currency: normalizeCurrency(document.getElementById("sCurrency")?.value),
        airlineCost: toNumber(document.getElementById("sCost")?.value),
        companyProfit: toNumber(document.getElementById("sProfit")?.value)
      };
      if (!payload.contact || !payload.passenger || !payload.route || !payload.airline || !payload.date) {
        toast("Fill required sale fields.");
        return;
      }
      if (editingSaleId) {
        const idx = state.sales.findIndex((x) => x.id === editingSaleId);
        if (idx >= 0) state.sales[idx] = { ...state.sales[idx], ...payload };
        editingSaleId = null;
        document.getElementById("saleSubmitBtn").textContent = "+ Add Sale";
        toast("Sale updated.");
      } else {
        state.sales.push({ id: id(), ...payload });
        toast("Sale added.");
      }
      state.sales.sort((a, b) => {
        const dA = new Date(a.date).getTime();
        const dB = new Date(b.date).getTime();
        if (Number.isFinite(dA) && Number.isFinite(dB)) {
          if (dA !== dB) return dB - dA;
        }
        return String(b.id).localeCompare(String(a.id));
      });
      ui.saleForm.reset();
      saveState();
      renderAll();
    });
  }

  if (ui.expenseForm) {
    ui.expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("eName")?.value.trim() || "",
        currency: normalizeCurrency(document.getElementById("eCurrency")?.value),
        amount: toNumber(document.getElementById("eAmount")?.value),
        date: document.getElementById("eDate")?.value || ""
      };
      if (!payload.name || !payload.date || payload.amount <= 0) {
        toast("Fill required expense fields.");
        return;
      }
      if (editingExpenseId) {
        const idx = state.expenses.findIndex((x) => x.id === editingExpenseId);
        if (idx >= 0) state.expenses[idx] = { ...state.expenses[idx], ...payload };
        editingExpenseId = null;
        document.getElementById("expenseSubmitBtn").textContent = "+ Add Expense";
        toast("Expense updated.");
      } else {
        const expenseNumber = (Number(state.lastExpenseNumber) || 0) + 1;
        state.lastExpenseNumber = expenseNumber;
        state.expenses.push({ id: id(), expenseNumber, ...payload });
        toast("Expense added.");
      }
      state.expenses.sort((a, b) => {
        const expenseDiff = (Number(b.expenseNumber) || 0) - (Number(a.expenseNumber) || 0);
        if (expenseDiff !== 0) return expenseDiff;
        return String(b.id).localeCompare(String(a.id));
      });
      ui.expenseForm.reset();
      saveState();
      renderAll();
    });
  }
}

function setupSearch() {
  if (!ui.globalSearchForm || !ui.searchQuery) return;
  ui.searchQuery.value = state.searchText || "";
  ui.globalSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.searchText = ui.searchQuery.value.trim().toLowerCase();
    saveState();
    renderAll();
  });
}

function matchesSearch(values) {
  const q = (state.searchText || "").trim();
  if (!q) return true;
  return values.some((v) => String(v || "").toLowerCase().includes(q));
}

function renderAll() {
  refreshYearOptions();
  populateAirlineOptions();
  renderAirlineList();
  renderSaleTable();
  renderExpenseTable();
  renderMonthlySummary();
  renderYearlySummary();
  renderTicketMonthlyList();
  renderExpenseMonthlyList();
  renderCaModule();
}

function ensureCaData() {
  if (!Array.isArray(state.caCustomers)) state.caCustomers = [];
  if (!Array.isArray(state.caInvoices)) state.caInvoices = [];
  if (!Array.isArray(state.caPayments)) state.caPayments = [];
}

function caCustomerName(customerId) {
  ensureCaData();
  const c = state.caCustomers.find((x) => x.id === customerId);
  return c ? c.name : "—";
}

function customerAccountTotals(customerId) {
  ensureCaData();
  const customerInvoices = state.caInvoices.filter((i) => i.customerId === customerId);
  const customerPayments = state.caPayments.filter((p) => p.customerId === customerId);
  const invoiced = sumByCurrency(customerInvoices, (i) => i.totalAmount);
  const paid = sumByCurrency(customerPayments, (p) => p.amount);
  return {
    invoiced,
    paid,
    balance: {
      USD: invoiced.USD - paid.USD,
      AFN: invoiced.AFN - paid.AFN
    }
  };
}

function fillCaCustomerSelects() {
  ensureCaData();
  const options = state.caCustomers
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join("");
  const invSel = document.getElementById("caInvoiceCustomer");
  const paySel = document.getElementById("caPaymentCustomer");
  const repSel = document.getElementById("caReportCustomer");

  if (invSel) {
    const prev = invSel.value;
    invSel.innerHTML = `<option value="">Select customer...</option>${options}`;
    if ([...invSel.options].some((o) => o.value === prev)) invSel.value = prev;
  }
  if (paySel) {
    const prev = paySel.value;
    paySel.innerHTML = `<option value="">Select customer...</option>${options}`;
    if ([...paySel.options].some((o) => o.value === prev)) paySel.value = prev;
  }
  if (repSel) {
    const prev = repSel.value;
    repSel.innerHTML = `<option value="">All customers</option>${options}`;
    if ([...repSel.options].some((o) => o.value === prev)) repSel.value = prev;
  }
}

function renderCaDashboard() {
  ensureCaData();
  const totalInv = sumByCurrency(state.caInvoices, (i) => i.totalAmount);
  const totalPaid = sumByCurrency(state.caPayments, (p) => p.amount);
  const totalPending = state.caCustomers.reduce(
    (acc, c) => {
      const b = customerAccountTotals(c.id).balance;
      acc.USD += b.USD > 0 ? b.USD : 0;
      acc.AFN += b.AFN > 0 ? b.AFN : 0;
      return acc;
    },
    { USD: 0, AFN: 0 }
  );

  setText("caDashInvoiced", currencyPairText(totalInv));
  setText("caDashPaid", currencyPairText(totalPaid));
  setText("caDashPending", currencyPairText(totalPending));

  const bars = document.getElementById("caDashBars");
  if (bars) {
    const totalInvAll = totalInv.USD + totalInv.AFN;
    const totalPaidAll = totalPaid.USD + totalPaid.AFN;
    const totalPendingAll = totalPending.USD + totalPending.AFN;
    const maxVal = Math.max(totalInvAll, totalPaidAll, totalPendingAll, 1);
    const pct = (v) => Math.round((toNumber(v) / maxVal) * 100);
    bars.innerHTML = `
      <div class="ca-bar-row"><span>Invoices</span><div class="ca-bar-track"><div class="ca-bar-fill" style="width:${pct(totalInvAll)}%"></div></div><span>${currencyPairText(totalInv)}</span></div>
      <div class="ca-bar-row"><span>Received</span><div class="ca-bar-track"><div class="ca-bar-fill ca-bar-paid" style="width:${pct(totalPaidAll)}%"></div></div><span>${currencyPairText(totalPaid)}</span></div>
      <div class="ca-bar-row"><span>Pending</span><div class="ca-bar-track"><div class="ca-bar-fill ca-bar-pending" style="width:${pct(totalPendingAll)}%"></div></div><span>${currencyPairText(totalPending)}</span></div>
    `;
  }

  const duesList = document.getElementById("caDashDuesList");
  if (duesList) {
    const rows = state.caCustomers.filter((c) => {
      const b = customerAccountTotals(c.id).balance;
      return b.USD > 0.005 || b.AFN > 0.005;
    });
    duesList.innerHTML = rows.length
      ? rows
          .map((c) => `<li><strong>${esc(c.name)}</strong> - ${currencyPairText(customerAccountTotals(c.id).balance)} due</li>`)
          .join("")
      : "<li>No pending balances.</li>";
  }

  const paidList = document.getElementById("caDashPaidList");
  if (paidList) {
    const rows = state.caCustomers.filter((c) => {
      const t = customerAccountTotals(c.id);
      const invoicedAny = t.invoiced.USD > 0 || t.invoiced.AFN > 0;
      const paidFully = t.balance.USD <= 0.005 && t.balance.AFN <= 0.005;
      return invoicedAny && paidFully;
    });
    paidList.innerHTML = rows.length ? rows.map((c) => `<li>${esc(c.name)}</li>`).join("") : "<li>No fully paid customers yet.</li>";
  }
}

function renderCaCustomersTable() {
  ensureCaData();
  const tbody = document.getElementById("caCustomerTable");
  if (!tbody) return;
  const localQ = (document.getElementById("caCustomerSearch")?.value || "").trim().toLowerCase();
  const globalQ = (state.searchText || "").trim().toLowerCase();
  const q = localQ || globalQ;
  let rows = state.caCustomers;
  if (q) {
    rows = rows.filter((c) =>
      [c.name, c.phone, c.email, c.address].some((f) => String(f || "").toLowerCase().includes(q))
    );
  }
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4">${q ? "No customers match search." : "No customers yet."}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (c) => `<tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.phone || "—")}</td>
      <td>${esc(c.email || "—")}</td>
      <td>
        <button type="button" class="btn" data-profile-ca-customer="${c.id}">Profile</button>
        <button type="button" class="btn" data-edit-ca-customer="${c.id}">Edit</button>
        <button type="button" class="btn" data-delete-ca-customer="${c.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderCaInvoicesTable() {
  ensureCaData();
  const tbody = document.getElementById("caInvoiceTable");
  if (!tbody) return;
  const rows = [...state.caInvoices]
    .filter((inv) => matchesSearch([inv.invoiceNumber, caCustomerName(inv.customerId), inv.date, inv.totalAmount, inv.description]))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">No invoices yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (inv) => `<tr>
      <td>${esc(inv.invoiceNumber || "—")}</td>
      <td>${esc(caCustomerName(inv.customerId))}</td>
      <td>${esc(inv.date || "—")}</td>
      <td>${esc(normalizeCurrency(inv.currency))}</td>
      <td>${moneyByCurrency(inv.totalAmount, inv.currency)}</td>
      <td>
        <button type="button" class="btn" data-print-ca-invoice="${inv.id}">PDF</button>
        <button type="button" class="btn" data-edit-ca-invoice="${inv.id}">Edit</button>
        <button type="button" class="btn" data-delete-ca-invoice="${inv.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderCaPaymentsTable() {
  ensureCaData();
  const tbody = document.getElementById("caPaymentTable");
  if (!tbody) return;
  const rows = [...state.caPayments]
    .filter((p) => matchesSearch([caCustomerName(p.customerId), p.amount, p.date, p.method]))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">No payments recorded.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (p) => `<tr>
      <td>${esc(caCustomerName(p.customerId))}</td>
      <td>${esc(normalizeCurrency(p.currency))}</td>
      <td>${moneyByCurrency(p.amount, p.currency)}</td>
      <td>${esc(p.date || "—")}</td>
      <td>${esc(p.method || "—")}</td>
      <td>
        <button type="button" class="btn" data-edit-ca-payment="${p.id}">Edit</button>
        <button type="button" class="btn" data-delete-ca-payment="${p.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");
}

function resetCaCustomerForm() {
  document.getElementById("caCustomerForm")?.reset();
  const editId = document.getElementById("caCustomerEditId");
  if (editId) editId.value = "";
  setText("caCustomerFormTitle", "Add customer");
  setText("caCustomerSubmit", "Save customer");
  document.getElementById("caCustomerCancelEdit")?.setAttribute("hidden", "");
}

function openCaCustomerProfile(customerId) {
  const c = state.caCustomers.find((x) => x.id === customerId);
  if (!c) return;
  const totals = customerAccountTotals(customerId);
  const modal = document.getElementById("caModal");
  const body = document.getElementById("caModalBody");
  const title = document.getElementById("caModalTitle");
  if (!modal || !body || !title) return;
  title.textContent = c.name;
  body.innerHTML = `
    <p class="lead">${esc(c.phone || "—")} · ${esc(c.email || "—")}</p>
    <p>${esc(c.address || "")}</p>
    <div class="ca-profile-stats">
      <div><span>Total invoices</span><strong>${currencyPairText(totals.invoiced)}</strong></div>
      <div><span>Total paid</span><strong>${currencyPairText(totals.paid)}</strong></div>
      <div><span>Remaining balance</span><strong>${currencyPairText(totals.balance)}</strong></div>
    </div>
  `;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeCaModal() {
  const modal = document.getElementById("caModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function resetCaInvoiceForm() {
  document.getElementById("caInvoiceForm")?.reset();
  const editId = document.getElementById("caInvoiceEditId");
  if (editId) editId.value = "";
  setText("caInvoiceFormTitle", "New invoice");
  setText("caInvoiceSubmit", "Save invoice");
  document.getElementById("caInvoiceCancelEdit")?.setAttribute("hidden", "");
  const dateEl = document.getElementById("caInvoiceDate");
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  const numberEl = document.getElementById("caInvoiceNumber");
  if (numberEl) numberEl.value = formatNextInvoiceNumber();
  const currencyEl = document.getElementById("caInvoiceCurrency");
  if (currencyEl) currencyEl.value = "USD";
}

function resetCaPaymentForm() {
  document.getElementById("caPaymentForm")?.reset();
  const editId = document.getElementById("caPaymentEditId");
  if (editId) editId.value = "";
  setText("caPaymentFormTitle", "Record payment");
  setText("caPaymentSubmit", "Save payment");
  document.getElementById("caPaymentCancelEdit")?.setAttribute("hidden", "");
  const dateEl = document.getElementById("caPaymentDate");
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  const currencyEl = document.getElementById("caPaymentCurrency");
  if (currencyEl) currencyEl.value = "USD";
}

function reportActivityCustomerIds(from, to) {
  if (!from && !to) return null;
  const fromTime = from ? new Date(`${from}T00:00:00`) : null;
  const toTime = to ? new Date(`${to}T23:59:59`) : null;
  const ids = new Set();
  state.caInvoices.forEach((inv) => {
    if (!inv.date) return;
    const d = new Date(`${inv.date}T12:00:00`);
    if (fromTime && d < fromTime) return;
    if (toTime && d > toTime) return;
    ids.add(inv.customerId);
  });
  state.caPayments.forEach((pay) => {
    if (!pay.date) return;
    const d = new Date(`${pay.date}T12:00:00`);
    if (fromTime && d < fromTime) return;
    if (toTime && d > toTime) return;
    ids.add(pay.customerId);
  });
  return ids;
}

function runOutstandingReport() {
  const from = document.getElementById("caReportFrom")?.value || "";
  const to = document.getElementById("caReportTo")?.value || "";
  const customerId = document.getElementById("caReportCustomer")?.value || "";
  const body = document.getElementById("caReportBody");
  if (!body) return;
  const activityIds = reportActivityCustomerIds(from, to);

  const rows = state.caCustomers.filter((c) => {
    if (customerId && c.id !== customerId) return false;
    if (activityIds && !activityIds.has(c.id)) return false;
    const bal = customerAccountTotals(c.id).balance;
    return bal.USD > 0.005 || bal.AFN > 0.005;
  });

  if (!rows.length) {
    body.innerHTML = `<p class="lead">No customers with outstanding balance for selected filters.</p>`;
    return;
  }

  body.innerHTML = `
    <div class="table-wrap"><table><thead><tr><th>Customer</th><th>Invoiced</th><th>Paid</th><th>Balance</th></tr></thead><tbody>
    ${rows
      .map((c) => {
        const totals = customerAccountTotals(c.id);
        return `<tr><td>${esc(c.name)}</td><td>${currencyPairText(totals.invoiced)}</td><td>${currencyPairText(totals.paid)}</td><td class="text-red">${currencyPairText(
          totals.balance
        )}</td></tr>`;
      })
      .join("")}
    </tbody></table></div>`;
}

function runPaymentHistoryReport() {
  const from = document.getElementById("caReportFrom")?.value || "";
  const to = document.getElementById("caReportTo")?.value || "";
  const customerId = document.getElementById("caReportCustomer")?.value || "";
  const body = document.getElementById("caReportBody");
  if (!body) return;

  let rows = [...state.caPayments];
  if (customerId) rows = rows.filter((p) => p.customerId === customerId);
  if (from) rows = rows.filter((p) => (p.date || "") >= from);
  if (to) rows = rows.filter((p) => (p.date || "") <= to);
  rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!rows.length) {
    body.innerHTML = `<p class="lead">No payments in this range.</p>`;
    return;
  }

  body.innerHTML = `
    <div class="table-wrap"><table><thead><tr><th>Customer</th><th>Currency</th><th>Amount</th><th>Date</th><th>Method</th></tr></thead><tbody>
    ${rows
      .map(
        (p) => `<tr><td>${esc(caCustomerName(p.customerId))}</td><td>${esc(normalizeCurrency(p.currency))}</td><td>${moneyByCurrency(
          p.amount,
          p.currency
        )}</td><td>${esc(p.date || "—")}</td><td>${esc(p.method || "—")}</td></tr>`
      )
      .join("")}
    </tbody></table></div>`;
}

function printCaGenericReport() {
  const bodyHtml = document.getElementById("caReportBody")?.innerHTML || "";
  if (!bodyHtml.trim()) {
    toast("Generate a report first.");
    return;
  }
  const title = document.getElementById("caReportTitle")?.textContent || "Report";
  const host = document.getElementById("caInvoicePrintHost");
  if (!host) return;
  host.removeAttribute("hidden");
  host.innerHTML = `<div style="padding:24px;font-family:Inter,system-ui,sans-serif"><h1 style="margin:0 0 16px;font-size:1.25rem">${esc(
    title
  )}</h1>${bodyHtml}</div>`;
  document.body.classList.add("print-caGeneric");
  setTimeout(() => window.print(), 80);
}

function printCaInvoice(invoiceId) {
  const inv = state.caInvoices.find((x) => x.id === invoiceId);
  if (!inv) return;
  const customer = state.caCustomers.find((c) => c.id === inv.customerId);
  const previewHtml = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Invoice ${esc(inv.invoiceNumber || "—")}</title>
      <style>
        body { margin: 0; background: #f5f7fb; font-family: Inter, system-ui, sans-serif; color: #1f2937; }
        .toolbar { position: sticky; top: 0; background: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .toolbar button { border: 0; border-radius: 8px; background: #2563eb; color: #fff; padding: 10px 14px; cursor: pointer; font-weight: 600; }
        .page { max-width: 760px; margin: 20px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
        h1 { margin: 0 0 8px; font-size: 1.4rem; }
        .muted { color: #6b7280; margin: 0 0 16px; }
        .total { font-size: 1.15rem; font-weight: 600; margin-top: 16px; }
        @media print {
          .toolbar { display: none; }
          body { background: #fff; }
          .page { margin: 0; border: none; border-radius: 0; max-width: none; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <strong>Invoice Preview</strong>
        <button onclick="window.print()">Print / Save PDF</button>
      </div>
      <div class="page">
        <h1>Invoice ${esc(inv.invoiceNumber || "—")}</h1>
        <p class="muted">Date: ${esc(inv.date || "—")}</p>
        <p><strong>Bill to</strong><br>${esc(customer?.name || "—")}<br>${esc(customer?.address || "")}<br>${esc(customer?.phone || "")} ${esc(
    customer?.email || ""
  )}</p>
        <p><strong>Description</strong><br>${esc(inv.description || "—")}</p>
        <p class="total">Total: ${moneyByCurrency(inv.totalAmount, inv.currency)}</p>
      </div>
    </body>
    </html>
  `;

  const previewWin = window.open("", "_blank");
  if (previewWin) {
    previewWin.document.open();
    previewWin.document.write(previewHtml);
    previewWin.document.close();
  } else {
    toast("Popup blocked. Please allow popups for preview.");
  }
}

function renderCaModule() {
  ensureCaData();
  renderCaDashboard();
  fillCaCustomerSelects();
  renderCaCustomersTable();
  renderCaInvoicesTable();
  renderCaPaymentsTable();
}

function setupCaModule() {
  document.getElementById("caCustomerSearch")?.addEventListener("input", renderCaCustomersTable);

  document.getElementById("caCustomerForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    ensureCaData();
    const editId = document.getElementById("caCustomerEditId")?.value.trim() || "";
    const payload = {
      name: document.getElementById("caCustName")?.value.trim() || "",
      phone: document.getElementById("caCustPhone")?.value.trim() || "",
      email: document.getElementById("caCustEmail")?.value.trim() || "",
      address: document.getElementById("caCustAddress")?.value.trim() || ""
    };
    if (!payload.name) {
      toast("Customer name is required.");
      return;
    }
    if (editId) {
      const idx = state.caCustomers.findIndex((c) => c.id === editId);
      if (idx >= 0) {
        state.caCustomers[idx] = { ...state.caCustomers[idx], ...payload };
        toast("Customer updated.");
      }
    } else {
      state.caCustomers.unshift({ id: id(), ...payload });
      toast("Customer saved.");
    }
    saveState();
    resetCaCustomerForm();
    renderCaModule();
  });

  document.getElementById("caCustomerCancelEdit")?.addEventListener("click", resetCaCustomerForm);

  document.getElementById("caCustomerTable")?.addEventListener("click", (e) => {
    const prof = e.target.closest("[data-profile-ca-customer]");
    const edit = e.target.closest("[data-edit-ca-customer]");
    const del = e.target.closest("[data-delete-ca-customer]");

    if (prof) {
      openCaCustomerProfile(prof.dataset.profileCaCustomer);
      return;
    }
    if (edit) {
      const c = state.caCustomers.find((x) => x.id === edit.dataset.editCaCustomer);
      if (!c) return;
      document.getElementById("caCustomerEditId").value = c.id;
      document.getElementById("caCustName").value = c.name || "";
      document.getElementById("caCustPhone").value = c.phone || "";
      document.getElementById("caCustEmail").value = c.email || "";
      document.getElementById("caCustAddress").value = c.address || "";
      setText("caCustomerFormTitle", "Edit customer");
      setText("caCustomerSubmit", "Update customer");
      document.getElementById("caCustomerCancelEdit")?.removeAttribute("hidden");
      showView("caCustomers");
      return;
    }
    if (del) {
      const customerId = del.dataset.deleteCaCustomer;
      const hasInvoices = state.caInvoices.some((i) => i.customerId === customerId);
      const hasPayments = state.caPayments.some((p) => p.customerId === customerId);
      if (hasInvoices || hasPayments) {
        toast("Remove invoices and payments for this customer first.");
        return;
      }
      state.caCustomers = state.caCustomers.filter((c) => c.id !== customerId);
      saveState();
      toast("Customer deleted.");
      renderCaModule();
    }
  });

  document.getElementById("caModal")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-ca-modal]")) {
      closeCaModal();
    }
  });

  document.getElementById("caInvoiceForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    ensureCaData();
    const editId = document.getElementById("caInvoiceEditId")?.value.trim() || "";
    const customerId = document.getElementById("caInvoiceCustomer")?.value || "";
    const date = document.getElementById("caInvoiceDate")?.value || "";
    const currency = normalizeCurrency(document.getElementById("caInvoiceCurrency")?.value);
    const totalAmount = toNumber(document.getElementById("caInvoiceAmount")?.value);
    const description = document.getElementById("caInvoiceDesc")?.value.trim() || "";
    let invoiceNumber = document.getElementById("caInvoiceNumber")?.value.trim() || "";

    if (!customerId) return toast("Select a customer.");
    if (!date || totalAmount <= 0) return toast("Enter date and valid amount.");
    if (!invoiceNumber) {
      invoiceNumber = formatNextInvoiceNumber();
    } else {
      const seqFromInput = parseInvoiceSeq(invoiceNumber);
      if (seqFromInput <= 0) {
        toast("Invoice number must be like INV-00001.");
        return;
      }
      invoiceNumber = `INV-${String(seqFromInput).padStart(5, "0")}`;
    }

    const invoiceSeq = parseInvoiceSeq(invoiceNumber);
    const duplicate = state.caInvoices.some((x) => parseInvoiceSeq(x.invoiceNumber) === invoiceSeq && x.id !== editId);
    if (duplicate) {
      toast("Invoice number already exists.");
      return;
    }

    if (editId) {
      const idx = state.caInvoices.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        state.caInvoices[idx] = { ...state.caInvoices[idx], customerId, invoiceNumber, date, currency, totalAmount, description };
        toast("Invoice updated.");
      }
    } else {
      state.caInvoices.unshift({ id: id(), customerId, invoiceNumber, date, currency, totalAmount, description });
      const seq = parseInvoiceSeq(invoiceNumber);
      const nextSeq = seq > 0 ? seq + 1 : state.caNextInvoiceNum + 1;
      if (nextSeq > state.caNextInvoiceNum) state.caNextInvoiceNum = nextSeq;
      toast("Invoice saved.");
    }
    saveState();
    resetCaInvoiceForm();
    renderCaModule();
  });

  document.getElementById("caInvoiceCancelEdit")?.addEventListener("click", resetCaInvoiceForm);

  document.getElementById("caInvoiceTable")?.addEventListener("click", (e) => {
    const pr = e.target.closest("[data-print-ca-invoice]");
    const ed = e.target.closest("[data-edit-ca-invoice]");
    const del = e.target.closest("[data-delete-ca-invoice]");
    if (pr) return printCaInvoice(pr.dataset.printCaInvoice);
    if (ed) {
      const inv = state.caInvoices.find((x) => x.id === ed.dataset.editCaInvoice);
      if (!inv) return;
      document.getElementById("caInvoiceEditId").value = inv.id;
      document.getElementById("caInvoiceCustomer").value = inv.customerId || "";
      document.getElementById("caInvoiceNumber").value = inv.invoiceNumber || "";
      document.getElementById("caInvoiceDate").value = inv.date || "";
      document.getElementById("caInvoiceCurrency").value = normalizeCurrency(inv.currency);
      document.getElementById("caInvoiceAmount").value = toNumber(inv.totalAmount);
      document.getElementById("caInvoiceDesc").value = inv.description || "";
      setText("caInvoiceFormTitle", "Edit invoice");
      setText("caInvoiceSubmit", "Update invoice");
      document.getElementById("caInvoiceCancelEdit")?.removeAttribute("hidden");
      showView("caInvoices");
      return;
    }
    if (del) {
      state.caInvoices = state.caInvoices.filter((x) => x.id !== del.dataset.deleteCaInvoice);
      saveState();
      toast("Invoice deleted.");
      renderCaModule();
    }
  });

  document.getElementById("caPaymentForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    ensureCaData();
    const editId = document.getElementById("caPaymentEditId")?.value.trim() || "";
    const customerId = document.getElementById("caPaymentCustomer")?.value || "";
    const amount = toNumber(document.getElementById("caPaymentAmount")?.value);
    const currency = normalizeCurrency(document.getElementById("caPaymentCurrency")?.value);
    const date = document.getElementById("caPaymentDate")?.value || "";
    const method = document.getElementById("caPaymentMethod")?.value || "Cash";
    if (!customerId || !date || amount <= 0) return toast("Fill customer, date and amount.");

    if (editId) {
      const idx = state.caPayments.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        state.caPayments[idx] = { ...state.caPayments[idx], customerId, currency, amount, date, method };
        toast("Payment updated.");
      }
    } else {
      state.caPayments.unshift({ id: id(), customerId, currency, amount, date, method });
      toast("Payment recorded.");
    }
    saveState();
    resetCaPaymentForm();
    renderCaModule();
  });

  document.getElementById("caPaymentCancelEdit")?.addEventListener("click", resetCaPaymentForm);

  document.getElementById("caPaymentTable")?.addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit-ca-payment]");
    const del = e.target.closest("[data-delete-ca-payment]");
    if (ed) {
      const pay = state.caPayments.find((x) => x.id === ed.dataset.editCaPayment);
      if (!pay) return;
      document.getElementById("caPaymentEditId").value = pay.id;
      document.getElementById("caPaymentCustomer").value = pay.customerId || "";
      document.getElementById("caPaymentAmount").value = toNumber(pay.amount);
      document.getElementById("caPaymentCurrency").value = normalizeCurrency(pay.currency);
      document.getElementById("caPaymentDate").value = pay.date || "";
      document.getElementById("caPaymentMethod").value = pay.method || "Cash";
      setText("caPaymentFormTitle", "Edit payment");
      setText("caPaymentSubmit", "Update payment");
      document.getElementById("caPaymentCancelEdit")?.removeAttribute("hidden");
      showView("caPayments");
      return;
    }
    if (del) {
      state.caPayments = state.caPayments.filter((x) => x.id !== del.dataset.deleteCaPayment);
      saveState();
      toast("Payment deleted.");
      renderCaModule();
    }
  });

  document.getElementById("caReportOutstanding")?.addEventListener("click", () => {
    runOutstandingReport();
    setText("caReportTitle", "Outstanding report");
  });
  document.getElementById("caReportPayments")?.addEventListener("click", () => {
    runPaymentHistoryReport();
    setText("caReportTitle", "Payment history report");
  });
  document.getElementById("caReportPrint")?.addEventListener("click", printCaGenericReport);

  const invDate = document.getElementById("caInvoiceDate");
  if (invDate && !invDate.value) invDate.value = new Date().toISOString().slice(0, 10);
  const payDate = document.getElementById("caPaymentDate");
  if (payDate && !payDate.value) payDate.value = new Date().toISOString().slice(0, 10);
}

function renderSaleTable() {
  if (!ui.saleTable) return;
  const list = state.sales
    .slice()
    .filter((s) => matchesSearch([s.contact, s.passenger, s.route, s.airline]))
    .sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      if (Number.isFinite(dA) && Number.isFinite(dB) && dA !== dB) {
        return dB - dA;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  if (!list.length) {
    ui.saleTable.innerHTML = `<tr><td colspan="10">No sales yet.</td></tr>`;
    return;
  }
  ui.saleTable.innerHTML = list
    .map((s, index) => {
      const total = toNumber(s.airlineCost) + toNumber(s.companyProfit);
      return `<tr>
        <td>${list.length - index}</td>
        <td>${esc(s.contact)}</td>
        <td>${esc(s.passenger)}</td>
        <td>${esc(s.route)}</td>
        <td>${esc(s.airline || "—")}</td>
        <td>${esc(s.date)}</td>
        <td>${esc(normalizeCurrency(s.currency))}</td>
        <td>${moneyByCurrency(s.airlineCost, s.currency)}</td>
        <td>${moneyByCurrency(s.companyProfit, s.currency)}</td>
        <td>${moneyByCurrency(total, s.currency)}</td>
        <td>
          <button class="btn" data-sale-edit="${s.id}">Edit</button>
          <button class="btn" data-sale-del="${s.id}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");

  ui.saleTable.querySelectorAll("[data-sale-del]").forEach((b) => {
    b.addEventListener("click", () => {
      state.sales = state.sales.filter((x) => x.id !== b.dataset.saleDel);
      saveState();
      renderAll();
    });
  });
  ui.saleTable.querySelectorAll("[data-sale-edit]").forEach((b) => {
    b.addEventListener("click", () => {
      const s = state.sales.find((x) => x.id === b.dataset.saleEdit);
      if (!s) return;
      editingSaleId = s.id;
      document.getElementById("saleSubmitBtn").textContent = "Update Sale";
      document.getElementById("sContact").value = s.contact || "";
      document.getElementById("sPassenger").value = s.passenger || "";
      document.getElementById("sRoute").value = s.route || "";
      document.getElementById("sAirline").value = s.airline || AIRLINES[0];
      document.getElementById("sDate").value = s.date || "";
      document.getElementById("sCurrency").value = normalizeCurrency(s.currency);
      document.getElementById("sCost").value = toNumber(s.airlineCost);
      document.getElementById("sProfit").value = toNumber(s.companyProfit);
      showView("ticketSale");
    });
  });
}

function renderExpenseTable() {
  if (!ui.expenseTable) return;
  const list = state.expenses
    .slice()
    .filter((e) => matchesSearch([e.name, e.date, e.amount]))
    .sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      if (Number.isFinite(dA) && Number.isFinite(dB) && dA !== dB) {
        return dB - dA;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  if (!list.length) {
    ui.expenseTable.innerHTML = `<tr><td colspan="6">No expenses yet.</td></tr>`;
    return;
  }
  ui.expenseTable.innerHTML = list
    .map(
      (e, index) => `<tr>
      <td>${list.length - index}</td>
      <td>${esc(e.name)}</td>
      <td>${esc(e.date)}</td>
      <td>${moneyByCurrency(e.amount, e.currency)}</td>
      <td>${esc(normalizeCurrency(e.currency))}</td>
      <td>
        <button class="btn" data-exp-edit="${e.id}">Edit</button>
        <button class="btn" data-exp-del="${e.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  ui.expenseTable.querySelectorAll("[data-exp-del]").forEach((b) => {
    b.addEventListener("click", () => {
      state.expenses = state.expenses.filter((x) => x.id !== b.dataset.expDel);
      saveState();
      renderAll();
    });
  });
  ui.expenseTable.querySelectorAll("[data-exp-edit]").forEach((b) => {
    b.addEventListener("click", () => {
      const e = state.expenses.find((x) => x.id === b.dataset.expEdit);
      if (!e) return;
      editingExpenseId = e.id;
      document.getElementById("expenseSubmitBtn").textContent = "Update Expense";
      document.getElementById("eName").value = e.name || "";
      document.getElementById("eCurrency").value = normalizeCurrency(e.currency);
      document.getElementById("eAmount").value = toNumber(e.amount);
      document.getElementById("eDate").value = e.date || "";
      showView("monthlyExpense");
    });
  });
}

function renderMonthlySummary() {
  const m = state.selectedMonth;
  const y = state.selectedYear;
  const sales = state.sales.filter((s) => yearOf(s.date) === y && monthOf(s.date) === m);
  const expenses = state.expenses.filter((e) => yearOf(e.date) === y && monthOf(e.date) === m);
  const profit = sumByCurrency(sales, (s) => s.companyProfit);
  const exp = sumByCurrency(expenses, (e) => e.amount);
  const net = {
    USD: profit.USD - exp.USD,
    AFN: profit.AFN - exp.AFN
  };

  setText("mTicketProfit", currencyPairText(profit));
  setText("mExpenses", currencyPairText(exp));
  setText("mNetProfit", currencyPairText(net));
  setText("mSummaryProfit", currencyPairText(profit));
  setText("mSummaryExpense", currencyPairText(exp));
  setText("mSummaryNet", currencyPairText(net));
  setText("mSaleCount", String(sales.length));
  setText("mExpenseCount", String(expenses.length));
  setText("mSummaryTitle", `Financial Summary for ${MONTHS[m - 1]} ${y}`);
}

function renderYearlySummary() {
  const y = state.selectedYearlyYear;
  const sales = state.sales.filter((s) => yearOf(s.date) === y);
  const expenses = state.expenses.filter((e) => yearOf(e.date) === y);
  const profit = sumByCurrency(sales, (s) => s.companyProfit);
  const exp = sumByCurrency(expenses, (e) => e.amount);
  const net = {
    USD: profit.USD - exp.USD,
    AFN: profit.AFN - exp.AFN
  };

  setText("yProfit", currencyPairText(profit));
  setText("yExpenses", currencyPairText(exp));
  setText("yNet", currencyPairText(net));
  setText("ySummaryProfit", currencyPairText(profit));
  setText("ySummaryExpense", currencyPairText(exp));
  setText("ySummaryNet", currencyPairText(net));
  setText("yTransactions", String(sales.length));
  setText("yExpenseItems", String(expenses.length));
  setText("yAvgProfit", currencyPairText({ USD: profit.USD / 12, AFN: profit.AFN / 12 }));
  setText("yAvgExpenses", currencyPairText({ USD: exp.USD / 12, AFN: exp.AFN / 12 }));
  setText("ySummaryTitle", `Annual Financial Summary - ${y}`);
  setText("breakdownTitle", `Monthly Breakdown for ${y}`);

  const tbody = document.getElementById("yearBreakdownBody");
  if (!tbody) return;
  const rows = MONTHS.map((m, i) => {
    const month = i + 1;
    const monthSales = sales.filter((s) => monthOf(s.date) === month);
    const monthExpenses = expenses.filter((x) => monthOf(x.date) === month);
    const p = sumByCurrency(monthSales, (s) => s.companyProfit);
    const e = sumByCurrency(monthExpenses, (x) => x.amount);
    const n = { USD: p.USD - e.USD, AFN: p.AFN - e.AFN };
    return `<tr><td>${m}</td><td>${moneyByCurrency(p.USD, "USD")}</td><td>${moneyByCurrency(e.USD, "USD")}</td><td>${moneyByCurrency(
      n.USD,
      "USD"
    )}</td><td>${moneyByCurrency(p.AFN, "AFN")}</td><td>${moneyByCurrency(e.AFN, "AFN")}</td><td>${moneyByCurrency(n.AFN, "AFN")}</td></tr>`;
  });
  rows.push(
    `<tr><td><strong>TOTAL</strong></td><td><strong>${moneyByCurrency(profit.USD, "USD")}</strong></td><td><strong>${moneyByCurrency(
      exp.USD,
      "USD"
    )}</strong></td><td><strong>${moneyByCurrency(net.USD, "USD")}</strong></td><td><strong>${moneyByCurrency(
      profit.AFN,
      "AFN"
    )}</strong></td><td><strong>${moneyByCurrency(exp.AFN, "AFN")}</strong></td><td><strong>${moneyByCurrency(net.AFN, "AFN")}</strong></td></tr>`
  );
  tbody.innerHTML = rows.join("");
}

function renderTicketMonthlyList() {
  if (!ui.ticketMonthlyTable) return;
  const m = state.selectedMonth;
  const y = state.selectedYear;
  const sales = state.sales
    .slice()
    .filter((s) => yearOf(s.date) === y && monthOf(s.date) === m)
    .filter((s) => matchesSearch([s.contact, s.passenger, s.route, s.airline, s.date, s.airlineCost, s.companyProfit]))
    .sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      if (Number.isFinite(dA) && Number.isFinite(dB) && dA !== dB) {
        return dB - dA;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  setText("ticketMonthlyTitle", `Monthly Ticket Sale List - ${MONTHS[m - 1]} ${y}`);
  const salesTotals = sumByCurrency(sales, (s) => toNumber(s.airlineCost) + toNumber(s.companyProfit));
  setText("tsTotalUsd", moneyByCurrency(salesTotals.USD, "USD"));
  setText("tsTotalAfn", moneyByCurrency(salesTotals.AFN, "AFN"));
  if (!sales.length) {
    ui.ticketMonthlyTable.innerHTML = `<tr><td colspan="10">No ticket sales for this period.</td></tr>`;
    return;
  }
  ui.ticketMonthlyTable.innerHTML = sales
    .map((s, index) => {
      const total = toNumber(s.airlineCost) + toNumber(s.companyProfit);
      return `<tr>
        <td>${sales.length - index}</td>
        <td>${esc(s.contact)}</td>
        <td>${esc(s.passenger)}</td>
        <td>${esc(s.route)}</td>
        <td>${esc(s.airline || "—")}</td>
        <td>${esc(s.date)}</td>
        <td>${esc(normalizeCurrency(s.currency))}</td>
        <td>${moneyByCurrency(s.airlineCost, s.currency)}</td>
        <td>${moneyByCurrency(s.companyProfit, s.currency)}</td>
        <td>${moneyByCurrency(total, s.currency)}</td>
      </tr>`;
    })
    .join("");
}

function renderExpenseMonthlyList() {
  if (!ui.expenseMonthlyTable) return;
  const m = state.selectedMonth;
  const y = state.selectedYear;
  const expenses = state.expenses
    .filter((e) => yearOf(e.date) === y && monthOf(e.date) === m)
    .filter((e) => matchesSearch([e.name, e.date, e.amount]));
  setText("expenseMonthlyTitle", `Monthly Expense List - ${MONTHS[m - 1]} ${y}`);
  const expenseTotals = sumByCurrency(expenses, (e) => e.amount);
  setText("exTotalUsd", moneyByCurrency(expenseTotals.USD, "USD"));
  setText("exTotalAfn", moneyByCurrency(expenseTotals.AFN, "AFN"));
  const sortedExpenses = expenses.slice().sort((a, b) => {
    const dA = new Date(a.date).getTime();
    const dB = new Date(b.date).getTime();
    if (Number.isFinite(dA) && Number.isFinite(dB) && dA !== dB) {
      return dB - dA;
    }
    return String(b.id).localeCompare(String(a.id));
  });
  if (!sortedExpenses.length) {
    ui.expenseMonthlyTable.innerHTML = `<tr><td colspan="5">No expenses for this period.</td></tr>`;
    return;
  }
  ui.expenseMonthlyTable.innerHTML = sortedExpenses
    .map(
      (e, index) => `<tr><td>${sortedExpenses.length - index}</td><td>${esc(e.name)}</td><td>${esc(e.date)}</td><td>${moneyByCurrency(e.amount, e.currency)}</td><td>${esc(normalizeCurrency(e.currency))}</td></tr>`
    )
    .join("");
}

function setText(idName, value) {
  const el = document.getElementById(idName);
  if (el) el.textContent = value;
}

function esc(value) {
  const d = document.createElement("div");
  d.textContent = value == null ? "" : String(value);
  return d.innerHTML;
}

function parseInvoiceSeq(numStr) {
  const cleaned = String(numStr || "")
    .replace(/^INV-?/i, "")
    .replace(/\D/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function ensureCaInvoiceState() {
  if (!Array.isArray(state.caInvoices)) state.caInvoices = [];
  if (!Number.isFinite(state.caNextInvoiceNum) || state.caNextInvoiceNum < 1) state.caNextInvoiceNum = 1;
  let maxSeq = state.caNextInvoiceNum - 1;
  state.caInvoices.forEach((inv) => {
    const seq = parseInvoiceSeq(inv?.invoiceNumber);
    if (seq > maxSeq) maxSeq = seq;
  });
  if (maxSeq >= state.caNextInvoiceNum) state.caNextInvoiceNum = maxSeq + 1;
}

function formatNextInvoiceNumber() {
  ensureCaInvoiceState();
  return `INV-${String(state.caNextInvoiceNum).padStart(5, "0")}`;
}

function setupCaInvoiceAutoGenerator() {
  ensureCaInvoiceState();
  const numberInput = document.getElementById("caInvoiceNumber");
  const nextBtn = document.getElementById("caInvoiceNextNum");
  const editIdInput = document.getElementById("caInvoiceEditId");

  if (!numberInput) return;

  const syncNextFromKnownInvoices = () => {
    ensureCaInvoiceState();
    if (Array.isArray(state.caInvoices) && state.caInvoices.length) return;
    const existingInvoiceRows = document.querySelectorAll("#caInvoiceTable tr");
    if (existingInvoiceRows.length && state.caNextInvoiceNum < existingInvoiceRows.length + 1) {
      state.caNextInvoiceNum = existingInvoiceRows.length + 1;
      saveState();
    }
  };

  const fillIfNew = () => {
    const isEdit = !!(editIdInput && editIdInput.value.trim());
    if (!isEdit && !numberInput.value.trim()) {
      numberInput.value = formatNextInvoiceNumber();
    }
  };

  syncNextFromKnownInvoices();
  fillIfNew();

  nextBtn?.addEventListener("click", () => {
    numberInput.value = formatNextInvoiceNumber();
    toast("Next invoice number filled.");
  });
}

function printMonthlyTicketSale() {
  showView("ticketSale");
  renderTicketMonthlyList();
  document.body.classList.add("print-ticketSalesMonthly");
  setTimeout(() => window.print(), 50);
}

function printMonthlyExpense() {
  showView("monthlyExpense");
  renderExpenseMonthlyList();
  document.body.classList.add("print-monthlyExpense");
  setTimeout(() => window.print(), 50);
}

function printMonthlySummary() {
  showView("monthlySummary");
  renderMonthlySummary();
  document.body.classList.add("print-monthlySummary");
  setTimeout(() => window.print(), 50);
}

function printYearlySummary() {
  showView("yearlySummary");
  renderYearlySummary();
  document.body.classList.add("print-yearlySummary");
  setTimeout(() => window.print(), 50);
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove(
    "print-ticketSalesMonthly",
    "print-monthlyExpense",
    "print-monthlySummary",
    "print-yearlySummary",
    "print-caGeneric"
  );
});