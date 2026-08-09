/**
 * Admin Feature Flags tab (Sprint 5).
 * @module pages/admin-feature-flags
 */

/**
 * @param {HTMLElement} body
 * @param {object} helpers
 */
export async function renderAdminFeatureFlags(body, helpers = {}) {
  const toast = helpers.toast || (() => {});
  const escapeHtml = helpers.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = helpers.fmtNum || ((n) => String(n));

  const client = window.STATE?.db?.supa;
  if (!client) {
    body.innerHTML = '<div class="admin-card"><p class="admin-muted">Supabase belum terhubung.</p></div>';
    return;
  }

  body.innerHTML = '<p class="admin-muted">Memuat feature flags…</p>';

  const { data: flags, error } = await client.from('feature_flags').select('*').order('key');
  if (error) {
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">${escapeHtml(error.message)}. Apply migration sprint5.</p></div>`;
    return;
  }

  body.innerHTML = `
    <div class="admin-card">
      <h2>Feature Flags (${fmtNum(flags?.length || 0)})</h2>
      <p class="admin-muted">Toggle fitur & rollout % tanpa deploy. User bucket deterministik by user ID.</p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Feature</th><th>Status</th><th>Rollout %</th><th>Aktif</th><th></th></tr></thead>
          <tbody>
            ${(flags || []).map((f) => `
              <tr data-flag="${escapeHtml(f.key)}">
                <td>
                  <strong>${escapeHtml(f.name || f.key)}</strong>
                  <div class="admin-muted" style="font-size:11px">${escapeHtml(f.description || f.key)}</div>
                </td>
                <td>
                  <select class="admin-input admin-input--sm" data-f-status>
                    ${['active', 'beta', 'testing', 'off'].map((s) => `
                      <option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>
                    `).join('')}
                  </select>
                </td>
                <td><input class="admin-input admin-input--sm" type="number" data-f-rollout min="0" max="100" value="${f.rollout_pct ?? 100}" style="width:70px" /></td>
                <td><input type="checkbox" data-f-enabled ${f.enabled ? 'checked' : ''} /></td>
                <td><button type="button" class="admin-btn ghost admin-input--sm" data-f-save>Simpan</button></td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="admin-muted">Belum ada flag</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  body.querySelectorAll('tr[data-flag]').forEach((row) => {
    row.querySelector('[data-f-save]')?.addEventListener('click', async () => {
      const key = row.getAttribute('data-flag');
      const { saveFeatureFlag, syncFeatureFlagsFromRemote } = await import('../services/feature-flag-store.js');
      try {
        await saveFeatureFlag(key, {
          enabled: !!row.querySelector('[data-f-enabled]')?.checked,
          rollout_pct: Number(row.querySelector('[data-f-rollout]')?.value) || 0,
          status: row.querySelector('[data-f-status]')?.value || 'active',
        });
        await syncFeatureFlagsFromRemote();
        toast(`Flag ${key} tersimpan`, 'success');
      } catch (e) {
        toast(e.message || 'Gagal', 'error');
      }
    });
  });
}
