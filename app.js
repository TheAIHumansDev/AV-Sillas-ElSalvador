/* ═══════════════════════════════════════════
 WHEELCHAIR SERVICE MONITOR
   app.js · Core Application Logic
═══════════════════════════════════════════ */

'use strict';

// ── CONSTANTS ──────────────────────────────
const APP_KEY = 'avnc_sal_wc';
const USERS = {
  'agente01': { pass: 'avianca2024', name: 'Agente Rodríguez', role: 'Agente SAL' },
  'agente02': { pass: 'avianca2024', name: 'Agente Martínez', role: 'Agente SAL' },
  'supervisor': { pass: 'super2024', name: 'Supervisor García', role: 'Supervisor' },
  'demo': { pass: 'demo', name: 'Usuario Demo', role: 'Agente SAL' }
};

const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE'; // Set after deploying Apps Script

// ── THEME ──────────────────────────────────
const Theme = {
  init() {
    const saved = localStorage.getItem(`${APP_KEY}_theme`) || 'dark';
    this.set(saved);
  },
  set(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(`${APP_KEY}_theme`, mode);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.title = mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};

// ── AUTH ───────────────────────────────────
const Auth = {
  login(user, pass) {
    const userData = USERS[user.toLowerCase()];
    if (!userData || userData.pass !== pass) return false;
    const session = { user: user.toLowerCase(), name: userData.name, role: userData.role, ts: Date.now() };
    localStorage.setItem(`${APP_KEY}_session`, JSON.stringify(session));
    return true;
  },
  logout() {
    localStorage.removeItem(`${APP_KEY}_session`);
    window.location.href = 'login.html';
  },
  getSession() {
    try {
      const s = localStorage.getItem(`${APP_KEY}_session`);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },
  require() {
    const s = this.getSession();
    if (!s) { window.location.href = 'login.html'; return null; }
    return s;
  }
};

// ── SERVICES STORE ─────────────────────────
const Store = {
  _key: `${APP_KEY}_services`,

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '[]');
    } catch { return []; }
  },

  save(services) {
    localStorage.setItem(this._key, JSON.stringify(services));
  },

  create(data) {
    const services = this.getAll();
    const reportNum = this._nextReportNum(services);
    const now = new Date();
    const service = {
      id: `WC${Date.now()}`,
      reportNum,
      flight: data.flight,
      type: data.type,
      passenger: data.passenger || '',
      user: data.user,
      role: data.role,
      status: 'active',  // active | done
      progress: 0,       // 0 = none, 1 = assigned, 2 = started, 3 = done
      createdAt: now.toISOString(),
      assignedAt: null,
      startedAt: null,
      finishedAt: null,
      returnStatus: null,
      incident: null,
      sheetSynced: false
    };
    services.unshift(service);
    this.save(services);
    return service;
  },

  getById(id) {
    return this.getAll().find(s => s.id === id) || null;
  },

  update(id, patch) {
    const services = this.getAll();
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    services[idx] = { ...services[idx], ...patch };
    this.save(services);
    return services[idx];
  },

  _nextReportNum(services) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todayServices = services.filter(s => s.createdAt.startsWith(new Date().toISOString().slice(0, 10)));
    return `SAL-${today}-${String(todayServices.length + 1).padStart(3, '0')}`;
  }
};

// ── TIME UTILS ─────────────────────────────
const TimeUtil = {
  fmt(isoStr) {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  },
  fmtDate(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  diffMin(a, b) {
    if (!a || !b) return 0;
    return Math.round((new Date(b) - new Date(a)) / 60000);
  },
  diffSec(a, b) {
    if (!a || !b) return 0;
    return Math.round((new Date(b) - new Date(a)) / 1000);
  },
  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
};

// ── TOAST ──────────────────────────────────
const Toast = {
  _container: null,
  init() {
    const existing = document.getElementById('toastContainer');
    if (existing) { this._container = existing; return; }
    this._container = document.createElement('div');
    this._container.id = 'toastContainer';
    this._container.className = 'toast-container';
    document.body.appendChild(this._container);
  },
  show(msg, type = 'info', icon = '💬') {
    if (!this._container) this.init();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    this._container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  },
  success(msg) { this.show(msg, 'success', '✅'); },
  error(msg) { this.show(msg, 'error', '❌'); },
  info(msg) { this.show(msg, 'info', '📡'); }
};

// ── STARS BACKGROUND ───────────────────────
function initStars() {
  const wrap = document.querySelector('.bg-stars');
  if (!wrap) return;
  for (let i = 0; i < 60; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${2 + Math.random() * 4}s;
      --delay: ${Math.random() * 4}s;
      opacity: ${0.1 + Math.random() * 0.5};
    `;
    wrap.appendChild(star);
  }
}

// ── APPS SCRIPT SYNC ───────────────────────
const Sync = {
  async push(service) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return;
    const now = new Date();
    const payload = {
      reportNum: service.reportNum,
      user: service.user,
      role: service.role,
      flight: service.flight,
      type: service.type,
      passenger: service.passenger,
      status: service.status === 'done' ? 'Completado' : 'En Proceso',
      createdDate: TimeUtil.fmtDate(service.createdAt),
      createdTime: TimeUtil.fmt(service.createdAt),
      assignedDate: TimeUtil.fmtDate(service.assignedAt),
      assignedTime: TimeUtil.fmt(service.assignedAt),
      minFromCreation: TimeUtil.diffMin(service.createdAt, service.assignedAt),
      startDate: TimeUtil.fmtDate(service.startedAt),
      startTime: TimeUtil.fmt(service.startedAt),
      minToStart: TimeUtil.diffMin(service.assignedAt, service.startedAt),
      endDate: TimeUtil.fmtDate(service.finishedAt),
      endTime: TimeUtil.fmt(service.finishedAt),
      minService: TimeUtil.diffMin(service.startedAt, service.finishedAt),
      incidentDesc: service.incident?.desc || '',
      hasPhoto: service.incident?.hasPhoto ? 'SÍ' : 'NO',
      incidentDate: TimeUtil.fmtDate(service.incident?.reportedAt),
      incidentTime: TimeUtil.fmt(service.incident?.reportedAt),
      returnDate: TimeUtil.fmtDate(service.returnAt),
      returnTime: TimeUtil.fmt(service.returnAt),
      minToReturn: TimeUtil.diffMin(service.finishedAt, service.returnAt),
      totalDuration: TimeUtil.diffMin(service.createdAt, service.finishedAt),
      fullCycle: TimeUtil.diffMin(service.createdAt, service.returnAt),
      estatus: service.status === 'done' ? 'Completado' : 'En Proceso'
    };
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      Store.update(service.id, { sheetSynced: true });
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  }
};

// ── QR CODE GENERATOR (simple, no lib) ─────
const QR = {
  // Uses a free QR API
  generateURL(text) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  }
};

// ── RIPPLE EFFECT ──────────────────────────
function addRipple(el, event) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple-effect';
  const rect = el.getBoundingClientRect();
  const x = (event?.clientX ?? rect.left + rect.width / 2) - rect.left - 20;
  const y = (event?.clientY ?? rect.top + rect.height / 2) - rect.top - 20;
  ripple.style.cssText = `left:${x}px; top:${y}px;`;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

// ── HEADER HELPERS ─────────────────────────
function renderHeader(opts = {}) {
  const session = Auth.getSession();
  const header = document.getElementById('appHeader');
  if (!header) return;

  header.innerHTML = `
    <div class="header-brand">
      <div class="brand-logo">AV</div>
      <div>
        <div class="brand-name">Avianca SAL</div>
        <div class="brand-sub">Wheelchair Monitor</div>
      </div>
    </div>
    <div class="header-actions">
      <div class="status-bar">
        <div class="status-dot"></div>
        <span id="headerTime"></span>
      </div>
      ${opts.backTo ? `<a href="${opts.backTo}" class="icon-btn" title="Volver">←</a>` : ''}
      ${opts.addBtn ? `<a href="sillas.html" class="icon-btn" title="Nuevo servicio">＋</a>` : ''}
      <button class="theme-toggle" id="themeToggle" onclick="Theme.toggle()" title="Cambiar tema">
        <span class="theme-icon moon">🌙</span>
        <span class="theme-icon sun">☀️</span>
      </button>
      ${session ? `<button class="icon-btn" onclick="Auth.logout()" title="Cerrar sesión">⏻</button>` : ''}
    </div>
  `;

  // Live clock
  function tick() {
    const el = document.getElementById('headerTime');
    if (el) el.textContent = new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick(); setInterval(tick, 1000);
}

// ── INIT ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Toast.init();
  initStars();
});

// Export globals
window.Theme = Theme;
window.Auth = Auth;
window.Store = Store;
window.TimeUtil = TimeUtil;
window.Toast = Toast;
window.QR = QR;
window.Sync = Sync;
window.addRipple = addRipple;
window.renderHeader = renderHeader;
