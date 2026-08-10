/**
 * Admin Testing Lab — test users, scenarios, verification, impersonate.
 * @module pages/admin-test-lab
 */

import { startImpersonation, callTestLab } from '../services/test-mode-service.js';

let _selectedUserId = null;
let _lastVerifyResult = null;
let _ctx = {};

/**
 * @param {HTMLElement} body
 * @param {object} ctx
 */
export async function renderAdminTestLab(body, ctx = {}) {
  _ctx = ctx;
  body.innerHTML = '<p class="admin-muted">Memuat Testing Lab…</p>';

  try {
    const [usersRes, scenariosRes, historyRes] = await Promise.all([
      callTestLab({ action: 'list_test_users' }),
      callTestLab({ action: 'list_scenarios' }),
      callTestLab({ action: 'list_test_history', limit: 20 }),
    ]);

    const users = usersRes.users || [];
    const presets = scenariosRes.presets || [];
    const custom = scenariosRes.custom || [];
    const runs = historyRes.runs || [];

    if (!_selectedUserId && users.length) _selectedUserId = users[0].id;

    const activeSessions = usersRes.activeSessions || [];
    const scenarioCount = presets.length + custom.length;
    const selectedUser = users.find((u) => u.id === _selectedUserId);

    body.innerHTML = `
      <div class="admin-card">
        <h2>🧪 Testing Lab</h2>
        <p class="admin-muted">Buat test user, apply skenario preset, verifikasi otomatis, lalu impersonate untuk QA end-to-end.</p>
      </div>
      <div class="admin-kpi-grid">
        <div class="admin-kpi"><div class="admin-kpi-label">Test users</div><div class="admin-kpi-value">${users.length}</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Impersonasi aktif</div><div class="admin-kpi-value">${activeSessions.length}</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Skenario</div><div class="admin-kpi-value">${scenarioCount}</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Preset</div><div class="admin-kpi-value">${presets.length}</div></div>
      </div>

      <div class="admin-card" id="tlUsersCard">
        <div class="admin-toolbar">
          <h2 style="margin:0">Test Users</h2>
          <button type="button" class="admin-btn" id="tlCreateUser">+ Test User</button>
        </div>
        <div class="admin-row-list" id="tlUserList">
          ${users.length ? users.map((u) => renderUserRow(u)).join('') : '<p class="admin-muted">Belum ada test user.</p>'}
        </div>
      </div>

      <div class="admin-card">
        <h2>Skenario preset</h2>
        <p class="admin-muted">Pilih test user di atas, lalu apply preset. ${presets.length} preset tersedia.</p>
        <div class="admin-kpi-grid" style="margin-top:12px">
          ${presets.map((p) => `
            <div class="admin-kpi tl-scenario-card" data-preset="${escapeHtml(p.preset_key || '')}">
              <div class="admin-kpi-label">${escapeHtml(p.name)}</div>
              <div class="admin-kpi-sub">${escapeHtml(p.preset_key || '—')}</div>
              ${p.description ? `<p class="admin-muted" style="font-size:11px;margin:6px 0 0;line-height:1.4">${escapeHtml(p.description)}</p>` : ''}
              <button type="button" class="admin-btn ghost tl-apply-preset" data-preset="${escapeHtml(p.preset_key || '')}" style="margin-top:8px">Apply</button>
            </div>
          `).join('')}
        </div>
        ${custom.length ? `
          <h3 style="margin-top:16px;font-size:14px">Custom</h3>
          <div class="admin-row-list">${custom.map((c) => `
            <div class="admin-row">
              <span>${escapeHtml(c.name)}</span>
              <button type="button" class="admin-btn ghost tl-apply-custom" data-id="${c.id}">Apply</button>
            </div>
          `).join('')}</div>
        ` : ''}
      </div>

      <div class="admin-card" id="tlBuilderCard">
        <h2>Scenario Builder</h2>
        <div class="admin-form-grid">
          <label>Gaji bulanan (Rp)
            <input class="admin-input" id="tlIncome" type="number" value="8000000" />
          </label>
          <label>Tanggal gajian
            <input class="admin-input" id="tlPayday" type="number" min="1" max="28" value="25" />
          </label>
          <label>Bulan (comma-separated)
            <input class="admin-input" id="tlMonths" value="2026-05,2026-06,2026-07,2026-08" />
          </label>
          <label>HP anomaly amount
            <input class="admin-input" id="tlHpAmount" type="number" value="7988000" />
          </label>
          <label class="admin-check">
            <input type="checkbox" id="tlHpAnomaly" checked /> Include HP pending anomaly
          </label>
        </div>
        <div class="admin-toolbar" style="margin-top:12px">
          <button type="button" class="admin-btn ghost" id="tlPreview">Preview</button>
          <button type="button" class="admin-btn ghost" id="tlSaveScenario">Simpan skenario</button>
          <button type="button" class="admin-btn" id="tlApplyCustom">Apply custom ke user</button>
        </div>
        <pre class="admin-muted" id="tlPreviewOut" style="margin-top:8px;font-size:11px;white-space:pre-wrap">—</pre>
      </div>

      <div class="admin-card" id="tlVerifyCard">
        <div class="admin-toolbar">
          <h2 style="margin:0">Verifikasi</h2>
          <button type="button" class="admin-btn" id="tlRunVerify">Jalankan verify</button>
          <button type="button" class="admin-btn ghost" id="tlExportReport" ${_lastVerifyResult ? '' : 'disabled'}>Export QA report</button>
          <button type="button" class="admin-btn" id="tlImpersonate" ${!_selectedUserId ? 'disabled' : ''}>Mulai impersonate</button>
        </div>
        ${selectedUser?.test_scenario_label ? `<p class="admin-muted" style="margin:8px 0 0">Skenario aktif: <code>${escapeHtml(selectedUser.test_scenario_label)}</code></p>` : ''}
        <div id="tlVerifyTable"></div>
      </div>

      <div class="admin-card" id="tlHistoryCard">
        <div class="admin-toolbar">
          <h2 style="margin:0">Riwayat verifikasi</h2>
          <button type="button" class="admin-btn ghost" id="tlRefreshHistory">Refresh</button>
        </div>
        <div id="tlHistoryTable">${renderHistoryTable(runs)}</div>
      </div>

      <div class="admin-card">
        <h2>Checklist manual</h2>
        <ul class="admin-muted" style="font-size:12px;line-height:1.6">
          <li>M1 — Banner pending HP terlihat setelah impersonate</li>
          <li>M2 — Large-transaction sheet: classify as asset</li>
          <li>M3 — Logout/clear IndexedDB jika data stale</li>
          <li>M4 — Neraca page balance</li>
          <li>M5 — Digest tidak menunjukkan deficit fantasy</li>
        </ul>
      </div>
    `;

    wireTestLabEvents(body, presets, users);
  } catch (e) {
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">Gagal: ${escapeHtml(e.message)}</p>
      <p class="admin-muted">Pastikan edge function <code>monefyi-admin-test-lab</code> sudah deploy dan migrasi admin test lab sudah jalan.</p></div>`;
  }
}

function renderUserRow(u) {
  const sel = u.id === _selectedUserId ? ' is-selected' : '';
  return `
    <div class="admin-row tl-user-row${sel}" data-uid="${u.id}">
      <div style="flex:1;min-width:0">
        <div>${escapeHtml(u.email || u.name || u.id?.slice(0, 8))}</div>
        <div class="admin-muted" style="font-size:11px">${escapeHtml(u.test_scenario_label || 'belum apply skenario')}</div>
      </div>
      <div class="admin-user-actions">
        <button type="button" class="admin-btn ghost tl-reset-user" data-uid="${u.id}">Reset data</button>
        <button type="button" class="admin-btn danger tl-delete-user" data-uid="${u.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderHistoryTable(runs) {
  if (!runs?.length) return '<p class="admin-muted" style="margin-top:8px">Belum ada riwayat verify.</p>';
  return `
    <table class="admin-table" style="width:100%;font-size:12px;margin-top:8px">
      <thead><tr><th>Waktu</th><th>Skenario</th><th>Hasil</th><th>User</th></tr></thead>
      <tbody>
        ${runs.map((r) => `
          <tr>
            <td class="admin-muted">${escapeHtml(formatDt(r.created_at))}</td>
            <td>${escapeHtml(r.preset_key || r.scenario_label || '—')}</td>
            <td>${r.fail_count ? `<span class="admin-badge">${r.pass_count}/${r.total_count} pass</span>` : `<span class="admin-badge">✓ ${r.pass_count}/${r.total_count}</span>`}</td>
            <td class="admin-muted">${escapeHtml(String(r.test_user_id || '').slice(0, 8))}…</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function getBuilderConfig() {
  const months = String(document.getElementById('tlMonths')?.value || '2026-08')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return {
    monthlyIncome: Number(document.getElementById('tlIncome')?.value || 8000000),
    paydayDay: Number(document.getElementById('tlPayday')?.value || 25),
    months,
    hpAmount: Number(document.getElementById('tlHpAmount')?.value || 7988000),
    includeHpAnomaly: document.getElementById('tlHpAnomaly')?.checked !== false,
    defaultMonth: months[months.length - 1] || '2026-08',
  };
}

function exportQaReport(result, userId) {
  const lines = [
    '# Monefyi QA Report',
    `Generated: ${new Date().toISOString()}`,
    `Test user: ${userId || '—'}`,
    `Result: ${result.pass}/${result.total} passed (${result.fail} failed)`,
    '',
    '| Metric | Expected | Actual | Pass |',
    '|--------|----------|--------|------|',
  ];
  for (const r of result.rows || []) {
    lines.push(`| ${r.label} | ${r.expected} | ${r.actual} | ${r.pass ? '✓' : '✗'} |`);
  }
  lines.push('', '## Manual checklist', '- [ ] M1 Pending HP banner', '- [ ] M2 Classify asset', '- [ ] M3 IndexedDB fresh', '- [ ] M4 Neraca balance', '- [ ] M5 Digest sane');
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monefyi-qa-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function wireTestLabEvents(body, presets, users) {
  body.querySelector('#tlCreateUser')?.addEventListener('click', async () => {
    const email = prompt('Email test user:', `test-${Date.now().toString(36)}@monefyi.test`);
    if (!email) return;
    try {
      const res = await callTestLab({ action: 'create_test_user', email, name: 'Test User' });
      alert(`User dibuat.\nEmail: ${res.user.email}\nPassword: ${res.user.password}\n\nSimpan password ini.`);
      await renderAdminTestLab(body, _ctx);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelectorAll('.tl-user-row').forEach((row) => {
    row.addEventListener('click', (ev) => {
      if (ev.target.closest('.tl-reset-user') || ev.target.closest('.tl-delete-user')) return;
      _selectedUserId = row.dataset.uid;
      body.querySelectorAll('.tl-user-row').forEach((r) => r.classList.toggle('is-selected', r.dataset.uid === _selectedUserId));
      body.querySelector('#tlImpersonate')?.removeAttribute('disabled');
    });
  });

  body.querySelectorAll('.tl-reset-user').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const uid = btn.dataset.uid;
      if (!uid || !confirm('Reset semua data transaksi/budget user ini?')) return;
      try {
        btn.disabled = true;
        await callTestLab({ action: 'reset_test_user', test_user_id: uid });
        toastOk('Data test user direset');
        await renderAdminTestLab(body, _ctx);
      } catch (e) {
        toastErr(e.message);
      } finally {
        btn.disabled = false;
      }
    });
  });

  body.querySelectorAll('.tl-delete-user').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const uid = btn.dataset.uid;
      if (!uid || !confirm('Hapus test user permanen?')) return;
      try {
        btn.disabled = true;
        await callTestLab({ action: 'delete_test_user', test_user_id: uid });
        if (_selectedUserId === uid) _selectedUserId = null;
        toastOk('Test user dihapus');
        await renderAdminTestLab(body, _ctx);
      } catch (e) {
        toastErr(e.message);
      } finally {
        btn.disabled = false;
      }
    });
  });

  body.querySelectorAll('.tl-apply-preset').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!_selectedUserId) return toastErr('Pilih test user dulu');
      try {
        btn.disabled = true;
        await callTestLab({
          action: 'apply_scenario',
          test_user_id: _selectedUserId,
          preset_key: btn.dataset.preset,
        });
        toastOk(`Preset ${btn.dataset.preset} applied`);
        await renderAdminTestLab(body, _ctx);
      } catch (e) {
        toastErr(e.message);
      } finally {
        btn.disabled = false;
      }
    });
  });

  body.querySelectorAll('.tl-apply-custom').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!_selectedUserId) return toastErr('Pilih test user dulu');
      try {
        await callTestLab({
          action: 'apply_scenario',
          test_user_id: _selectedUserId,
          scenario_id: btn.dataset.id,
        });
        toastOk('Custom scenario applied');
        await renderAdminTestLab(body, _ctx);
      } catch (e) {
        toastErr(e.message);
      }
    });
  });

  body.querySelector('#tlPreview')?.addEventListener('click', async () => {
    try {
      const res = await callTestLab({ action: 'generate_preview', config: getBuilderConfig() });
      const out = document.getElementById('tlPreviewOut');
      if (out) out.textContent = JSON.stringify(res.preview, null, 2);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelector('#tlSaveScenario')?.addEventListener('click', async () => {
    const name = prompt('Nama skenario:', 'Custom test');
    if (!name) return;
    try {
      await callTestLab({
        action: 'save_scenario',
        name,
        config: getBuilderConfig(),
      });
      toastOk('Skenario disimpan');
      await renderAdminTestLab(body, _ctx);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelector('#tlApplyCustom')?.addEventListener('click', async () => {
    if (!_selectedUserId) return toastErr('Pilih test user dulu');
    try {
      await callTestLab({
        action: 'apply_scenario',
        test_user_id: _selectedUserId,
        config: getBuilderConfig(),
      });
      toastOk('Custom scenario applied');
      await renderAdminTestLab(body, _ctx);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelector('#tlRunVerify')?.addEventListener('click', async () => {
    if (!_selectedUserId) return toastErr('Pilih test user dulu');
    const selectedUser = users.find((u) => u.id === _selectedUserId);
    try {
      const res = await callTestLab({
        action: 'run_verification',
        test_user_id: _selectedUserId,
        preset_key: selectedUser?.test_scenario_label || null,
      });
      _lastVerifyResult = res;
      renderVerifyTable(body.querySelector('#tlVerifyTable'), res);
      body.querySelector('#tlExportReport')?.removeAttribute('disabled');
      if (res.fail_count > 0 || res.fail > 0) toastErr(`${res.pass}/${res.total} passed`);
      else toastOk(`${res.pass}/${res.total} passed`);
      const histRes = await callTestLab({ action: 'list_test_history', limit: 20 });
      const histEl = body.querySelector('#tlHistoryTable');
      if (histEl) histEl.innerHTML = renderHistoryTable(histRes.runs || []);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelector('#tlExportReport')?.addEventListener('click', () => {
    if (!_lastVerifyResult) return;
    exportQaReport(_lastVerifyResult, _selectedUserId);
    toastOk('Report diunduh');
  });

  body.querySelector('#tlRefreshHistory')?.addEventListener('click', async () => {
    try {
      const histRes = await callTestLab({ action: 'list_test_history', limit: 20 });
      const histEl = body.querySelector('#tlHistoryTable');
      if (histEl) histEl.innerHTML = renderHistoryTable(histRes.runs || []);
    } catch (e) {
      toastErr(e.message);
    }
  });

  body.querySelector('#tlImpersonate')?.addEventListener('click', async () => {
    if (!_selectedUserId) return toastErr('Pilih test user dulu');
    const selectedUser = users.find((u) => u.id === _selectedUserId);
    const preset = presets.find((p) => p.preset_key === selectedUser?.test_scenario_label);
    const defaultMonth = preset?.default_month || '2026-08';
    try {
      _ctx.closeAdmin?.();
      await startImpersonation(_selectedUserId, {
        defaultMonth,
        onReady: () => {
          import('../components/test-mode-banner.js').then(({ renderTestModeBanner }) => {
            renderTestModeBanner();
          });
          import('../components/test-mode-checklist.js').then(({ renderTestModeChecklist }) => {
            renderTestModeChecklist();
          });
        },
      });
      toastOk('Mode test aktif — UI sama seperti user tester');
    } catch (e) {
      toastErr(e.message);
    }
  });
}

function renderVerifyTable(el, res) {
  if (!el) return;
  const rows = res.rows || [];
  el.innerHTML = `
    <p class="admin-muted" style="margin:8px 0">${res.pass}/${res.total} passed${res.run_at ? ` · tersimpan ${formatDt(res.run_at)}` : ''}</p>
    <table class="admin-table" style="width:100%;font-size:12px">
      <thead><tr><th>Metric</th><th>Expected</th><th>Actual</th><th>PASS</th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>${escapeHtml(r.label)}</td>
            <td>${escapeHtml(String(r.expected))}</td>
            <td>${escapeHtml(String(r.actual))}</td>
            <td>${r.pass ? '✓' : '✗'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toastOk(msg) {
  if (_ctx.toast) _ctx.toast(msg, 'success');
  else if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, 'success');
}

function toastErr(msg) {
  if (_ctx.toast) _ctx.toast(msg, 'error');
  else if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, 'error');
}
