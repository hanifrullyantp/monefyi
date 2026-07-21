/**
 * Notification preferences sheet.
 * @module components/notification-settings
 */

import { Icon } from './icons.js';
import {
  getNotifPrefs,
  updateNotifPrefs,
  requestPermission,
  getNotifStatus,
} from '../services/push-notification.js';

/**
 * @param {string} key
 * @param {string} label
 * @param {string} description
 * @param {object} defaults
 * @returns {string}
 */
function renderToggle(key, label, description, defaults) {
  return `
    <div class="ns-toggle-row">
      <div class="ns-toggle-info">
        <div class="ns-toggle-label">${label}</div>
        ${description ? `<div class="ns-toggle-desc">${description}</div>` : ''}
      </div>
      <label class="ns-switch">
        <input type="checkbox" data-pref="${key}" ${defaults[key] ? 'checked' : ''}>
        <span class="ns-slider"></span>
      </label>
    </div>
  `;
}

/**
 * Open notification settings modal.
 */
export async function showNotificationSettings() {
  const status = getNotifStatus();
  const prefs = getNotifPrefs();

  const defaults = {
    enabled: true,
    morningBriefing: true,
    billReminders: true,
    budgetMilestones: true,
    weeklyRecap: true,
    monthlyReport: true,
    achievements: true,
    smartTips: true,
    spendingAlerts: true,
    syncStatus: false,
    dailyLimit: 3,
    quietStart: 22,
    quietEnd: 7,
    sound: true,
    vibration: true,
    ...prefs,
  };

  document.querySelector('.notif-settings-overlay')?.remove();

  const modal = document.createElement('div');
  modal.className = 'notif-settings-overlay';
  modal.innerHTML = `
    <div class="notif-settings-modal" role="dialog" aria-modal="true" aria-label="Pengaturan Notifikasi">
      <header class="ns-header">
        <h2>${Icon('bell', { size: 18 })} Pengaturan Notifikasi</h2>
        <button type="button" class="ns-close" data-action="close" aria-label="Tutup">${Icon('x', { size: 18 })}</button>
      </header>

      <div class="ns-body">
        <div class="ns-status ${status.permission === 'granted' ? 'granted' : status.permission === 'denied' ? 'denied' : 'default'}">
          <div class="ns-status-icon">
            ${status.permission === 'granted' ? Icon('check', { size: 16 }) : Icon('bell', { size: 16 })}
          </div>
          <div class="ns-status-text">
            ${status.permission === 'granted'
    ? 'Notifikasi aktif'
    : status.permission === 'denied'
      ? 'Notifikasi diblokir browser. Aktifkan di pengaturan browser.'
      : 'Notifikasi belum diaktifkan'}
          </div>
          ${status.permission !== 'granted' && status.permission !== 'denied' ? `
            <button type="button" class="ns-enable-btn" data-action="enable">Aktifkan</button>
          ` : ''}
        </div>

        <div class="ns-section">
          <div class="ns-section-title">Jenis Notifikasi</div>
          ${renderToggle('morningBriefing', 'Morning Briefing', 'Ringkasan budget & sisa harian setiap pagi', defaults)}
          ${renderToggle('billReminders', 'Bill Reminder', 'Pengingat tagihan H-3, H-1, dan hari-H', defaults)}
          ${renderToggle('budgetMilestones', 'Budget Milestone', 'Peringatan saat budget 75%, 90%, 100%', defaults)}
          ${renderToggle('spendingAlerts', 'Spending Alert', 'Notifikasi pengeluaran besar (>Rp 500.000)', defaults)}
          ${renderToggle('weeklyRecap', 'Weekly Recap', 'Ringkasan mingguan setiap Minggu malam', defaults)}
          ${renderToggle('monthlyReport', 'Monthly Report', 'Laporan bulanan di tanggal 1', defaults)}
          ${renderToggle('achievements', 'Achievement', 'Pencapaian positif (streak, saving rate)', defaults)}
          ${renderToggle('smartTips', 'Smart Tips', 'Tips kontekstual 2-3x per minggu', defaults)}
          ${renderToggle('syncStatus', 'Sync Status', 'Notifikasi sinkronisasi data', defaults)}
        </div>

        <div class="ns-section">
          <div class="ns-section-title">Jam Tenang</div>
          <div class="ns-quiet-row">
            <label>Dari</label>
            <select class="ns-select" data-pref="quietStart">
              ${Array.from({ length: 24 }, (_, i) => `
                <option value="${i}" ${Number(defaults.quietStart) === i ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>
              `).join('')}
            </select>
            <label>Sampai</label>
            <select class="ns-select" data-pref="quietEnd">
              ${Array.from({ length: 24 }, (_, i) => `
                <option value="${i}" ${Number(defaults.quietEnd) === i ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>
              `).join('')}
            </select>
          </div>
          <div class="ns-hint">Tidak ada notifikasi di jam ini (kecuali urgent)</div>
        </div>

        <div class="ns-section">
          <div class="ns-section-title">Batas Harian</div>
          <div class="ns-limit-row">
            <label>Maksimal notifikasi per hari:</label>
            <select class="ns-select" data-pref="dailyLimit">
              ${[1, 2, 3].map((n) => `
                <option value="${n}" ${Number(defaults.dailyLimit) === n ? 'selected' : ''}>${n}</option>
              `).join('')}
            </select>
          </div>
          <div class="ns-hint">Hard max 3/hari agar tidak spam</div>
        </div>

        <div class="ns-section">
          <div class="ns-section-title">Suara & Getaran</div>
          ${renderToggle('sound', 'Suara Notifikasi', '', defaults)}
          ${renderToggle('vibration', 'Getaran', '', defaults)}
        </div>
      </div>

      <footer class="ns-footer">
        <button type="button" class="ns-save-btn" data-action="save">
          ${Icon('check', { size: 14 })} Simpan Pengaturan
        </button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));

  const close = () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 200);
  };

  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('[data-action="enable"]')?.addEventListener('click', async () => {
    const result = await requestPermission();
    if (result.granted) {
      const statusEl = modal.querySelector('.ns-status');
      if (statusEl) {
        statusEl.className = 'ns-status granted';
        const text = statusEl.querySelector('.ns-status-text');
        if (text) text.textContent = 'Notifikasi aktif';
      }
      modal.querySelector('[data-action="enable"]')?.remove();
    }
  });

  modal.querySelector('[data-action="save"]').onclick = () => {
    /** @type {Record<string, unknown>} */
    const newPrefs = {};
    modal.querySelectorAll('[data-pref]').forEach((el) => {
      const key = el.getAttribute('data-pref');
      if (!key) return;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        newPrefs[key] = el.checked;
      } else if (el instanceof HTMLSelectElement) {
        newPrefs[key] = Number.isNaN(Number(el.value)) ? el.value : Number(el.value);
      }
    });
    updateNotifPrefs(newPrefs);

    try {
      window.MonefyiUI?.showToast?.('Pengaturan notifikasi tersimpan', 'success');
    } catch { /* ignore */ }
    close();
  };
}

/**
 * Soft permission banner after engagement.
 */
export function showPermissionPrompt() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;

  const dismissedAt = Number(localStorage.getItem('monefyi_notif_dismissed') || 0);
  if (dismissedAt && Date.now() - dismissedAt < 7 * 86400000) return;
  if (document.querySelector('.notif-permission-prompt')) return;

  const prompt = document.createElement('div');
  prompt.className = 'notif-permission-prompt';
  prompt.innerHTML = `
    <div class="npp-content">
      <div class="npp-icon" aria-hidden="true">🔔</div>
      <div class="npp-text">
        <strong>Aktifkan Notifikasi</strong>
        <p>Dapatkan pengingat budget, bill reminder, dan insight keuangan.</p>
      </div>
      <div class="npp-actions">
        <button type="button" class="npp-enable" data-action="enable">Aktifkan</button>
        <button type="button" class="npp-later" data-action="later">Nanti</button>
      </div>
    </div>
  `;

  prompt.querySelector('[data-action="enable"]').onclick = async () => {
    await requestPermission();
    prompt.remove();
  };
  prompt.querySelector('[data-action="later"]').onclick = () => {
    localStorage.setItem('monefyi_notif_dismissed', String(Date.now()));
    prompt.remove();
  };

  document.body.appendChild(prompt);
}

/**
 * Wire engagement-based permission prompt (once).
 */
export function initNotifPermissionPrompt() {
  if (window.__monefyiNotifPromptWired) return;
  window.__monefyiNotifPromptWired = true;
  let interactionCount = 0;
  document.addEventListener('click', () => {
    interactionCount += 1;
    if (interactionCount === 5) showPermissionPrompt();
  }, { passive: true });
}

if (typeof window !== 'undefined') {
  window.monefyiNotifSettings = {
    showNotificationSettings,
    showPermissionPrompt,
    initNotifPermissionPrompt,
  };
}
