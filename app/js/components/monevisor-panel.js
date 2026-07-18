/**
 * Monevisor conversational panel — story-driven UI.
 * @module components/monevisor-panel
 */
import { Icon } from './icons.js';
import {
  initMonevisor,
  getState,
  onStateChange,
  generateInsights,
  sendMessage,
  applyAction,
  clearConversation,
  loadMessageHistory,
} from '../services/monevisor-client.js';

const HEALTH_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444',
};

const HEALTH_LABELS = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Perlu Perhatian',
};

const INSIGHT_ICONS = {
  achievement: 'trophy',
  warning: 'alertTriangle',
  tip: 'lightBulb',
  pattern: 'trendingUp',
  milestone: 'target',
};

let _panelEl = null;
let _unsubState = null;
let _isOpen = false;

function ensureCss() {
  if (document.getElementById('monevisor-panel-css')) return;
  const link = document.createElement('link');
  link.id = 'monevisor-panel-css';
  link.rel = 'stylesheet';
  try {
    link.href = new URL('css/monevisor-panel.css', document.baseURI).href;
  } catch (_) {
    link.href = '/app/css/monevisor-panel.css';
  }
  document.head.appendChild(link);
}

/**
 * @param {object} [options]
 * @param {string} [options.focus]
 * @param {string} [options.prefillMessage]
 * @param {string} [options.context]
 */
export async function openMonevisor(options = {}) {
  ensureCss();
  if (_isOpen) {
    if (options.prefillMessage) {
      const input = _panelEl?.querySelector('#mv-chat-input');
      if (input) {
        input.value = options.prefillMessage;
        input.focus();
      }
    }
    if (options.focus) setTimeout(() => scrollToInsight(options.focus), 300);
    return;
  }
  _isOpen = true;

  await initMonevisor();

  _panelEl = document.createElement('div');
  _panelEl.className = 'monevisor-panel-overlay';
  _panelEl.innerHTML = renderInitial();
  document.body.appendChild(_panelEl);

  requestAnimationFrame(() => _panelEl.classList.add('show'));

  _unsubState = onStateChange(render);
  render(getState());
  wireHandlers();

  loadMessageHistory().catch(() => {});

  const state = getState();
  if (!state.insights && !state.loading) {
    setTimeout(() => generateInsights(), 300);
  }

  if (options.focus) {
    setTimeout(() => scrollToInsight(options.focus), 600);
  }
  if (options.prefillMessage) {
    setTimeout(() => {
      const input = _panelEl.querySelector('#mv-chat-input');
      if (input) {
        input.value = options.prefillMessage;
        input.focus();
      }
    }, 400);
  }
  if (options.context === 'budget' || options.context === 'over_budget') {
    setTimeout(() => scrollToInsight('over'), 700);
  }
}

export function closeMonevisor() {
  if (!_isOpen || !_panelEl) return;
  _panelEl.classList.remove('show');
  setTimeout(() => {
    _panelEl?.remove();
    _panelEl = null;
    _isOpen = false;
    if (_unsubState) _unsubState();
  }, 300);
}

function renderInitial() {
  return `
    <div class="monevisor-panel" role="dialog" aria-label="Monevisor">
      <header class="mv-header">
        <div class="mv-header-brand">
          <div class="mv-logo">${Icon('sparkles', { size: 20 })}</div>
          <div>
            <div class="mv-title">Monevisor</div>
            <div class="mv-subtitle" id="mv-subtitle">Sahabat keuangan kamu</div>
          </div>
        </div>
        <div class="mv-header-actions">
          <button type="button" class="mv-icon-btn" data-action="refresh" title="Refresh insight">
            ${Icon('refresh', { size: 16 })}
          </button>
          <button type="button" class="mv-icon-btn" data-action="clear-chat" title="Clear chat">
            ${Icon('trash', { size: 16 })}
          </button>
          <button type="button" class="mv-icon-btn" data-action="close" title="Close">
            ${Icon('x', { size: 18 })}
          </button>
        </div>
      </header>

      <div class="mv-content" id="mv-content">
        <div class="mv-loading-initial">
          <div class="mv-spinner"></div>
          <div class="mv-loading-text">Membuka Monevisor...</div>
        </div>
      </div>

      <div class="mv-input-area" id="mv-input-area" style="display:none;">
        <div class="mv-quick-replies" id="mv-quick-replies"></div>
        <div class="mv-input-wrap">
          <button type="button" class="mv-icon-btn" data-action="voice" title="Voice input">
            ${Icon('bell', { size: 18 })}
          </button>
          <input
            type="text"
            id="mv-chat-input"
            placeholder="Tanya apapun tentang keuanganmu..."
            autocomplete="off"
          />
          <button type="button" class="mv-send-btn" data-action="send" title="Send">
            ${Icon('check', { size: 16 })}
          </button>
        </div>
      </div>
    </div>
  `;
}

function render(state) {
  if (!_panelEl) return;

  const content = _panelEl.querySelector('#mv-content');
  const inputArea = _panelEl.querySelector('#mv-input-area');
  const subtitle = _panelEl.querySelector('#mv-subtitle');

  if (state.loading && !state.insights) {
    content.innerHTML = renderLoading();
    inputArea.style.display = 'none';
    return;
  }

  const parts = [];
  if (state.insights) {
    parts.push(renderStorySection(state.insights));
    parts.push(renderMetricsBar(state.insights.metrics));
    parts.push(renderInsightCards(state.insights.insights || []));
    if (state.insights.budgetRecommendations?.length > 0) {
      parts.push(renderRecommendationsSection(state.insights.budgetRecommendations));
    }
  }

  if (state.messages.length > 0) {
    parts.push(renderChatSection(state.messages));
  } else if (state.insights) {
    parts.push(renderChatStarter(state.insights.suggested_questions || []));
  }

  content.innerHTML = parts.join('') || renderLoading();
  inputArea.style.display = 'block';

  const lastMsg = state.messages[state.messages.length - 1];
  const quickRepliesEl = _panelEl.querySelector('#mv-quick-replies');
  if (lastMsg?.role === 'assistant' && lastMsg.quick_replies?.length > 0) {
    quickRepliesEl.innerHTML = lastMsg.quick_replies.map((qr) =>
      `<button type="button" class="mv-quick-reply" data-reply="${escapeHtml(qr)}">${escapeHtml(qr)}</button>`
    ).join('');
  } else {
    quickRepliesEl.innerHTML = '';
  }

  if (subtitle) {
    subtitle.textContent = state.insights?.source === 'gemini'
      ? 'AI-powered · Online'
      : state.insights?.source === 'heuristic_fallback'
        ? 'Analisis lokal · Offline'
        : 'Sahabat keuangan kamu';
  }

  if (state.messages.length > 0) {
    requestAnimationFrame(() => {
      content.scrollTop = content.scrollHeight;
    });
  }

  wireHandlers();
}

function renderLoading() {
  return `
    <div class="mv-loading-section">
      <div class="mv-spinner"></div>
      <div class="mv-loading-title">Menganalisis keuanganmu...</div>
      <div class="mv-loading-hint">Sebentar ya, aku sedang lihat pattern spending kamu.</div>
    </div>
  `;
}

function renderStorySection(insights) {
  const color = HEALTH_COLORS[insights.healthLabel] || '#3b82f6';
  const trendIcon = insights.healthTrend === 'up' ? '↗' : insights.healthTrend === 'down' ? '↘' : '→';
  const circumference = 2 * Math.PI * 25;
  const offset = circumference * (1 - (Number(insights.healthScore || 0) / 100));

  return `
    <div class="mv-story-card" style="border-color: ${color}33">
      <div class="mv-greeting">${escapeHtml(insights.greeting || 'Halo!')}</div>
      <div class="mv-story-text">${escapeHtml(insights.story || insights.summary || '')}</div>
      <div class="mv-health-strip" style="background: linear-gradient(135deg, ${color}22, ${color}08)">
        <div class="mv-health-visual">
          <svg width="60" height="60" viewBox="0 0 60 60" class="mv-health-ring">
            <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"/>
            <circle
              cx="30" cy="30" r="25"
              fill="none"
              stroke="${color}"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              transform="rotate(-90 30 30)"
              class="mv-health-progress"
            />
            <text x="30" y="35" text-anchor="middle" fill="white" font-size="16" font-weight="700">
              ${insights.healthScore || 0}
            </text>
          </svg>
        </div>
        <div class="mv-health-info">
          <div class="mv-health-label" style="color: ${color}">
            ${HEALTH_LABELS[insights.healthLabel] || 'Fair'}
            <span class="mv-health-trend">${trendIcon}</span>
          </div>
          <div class="mv-health-message">${escapeHtml(insights.healthMessage || '')}</div>
        </div>
      </div>
    </div>
  `;
}

function renderMetricsBar(metrics) {
  if (!metrics) return '';
  return `
    <div class="mv-metrics-bar">
      <div class="mv-metric">
        <div class="mv-metric-label">Income</div>
        <div class="mv-metric-value income">${fmtShort(metrics.income)}</div>
      </div>
      <div class="mv-metric">
        <div class="mv-metric-label">Expense</div>
        <div class="mv-metric-value expense">${fmtShort(metrics.expense)}</div>
      </div>
      <div class="mv-metric">
        <div class="mv-metric-label">Net</div>
        <div class="mv-metric-value ${metrics.net >= 0 ? 'positive' : 'negative'}">
          ${metrics.net >= 0 ? '+' : ''}${fmtShort(metrics.net)}
        </div>
      </div>
      <div class="mv-metric">
        <div class="mv-metric-label">Saving</div>
        <div class="mv-metric-value">${Math.round((metrics.saving_rate || 0) * 100)}%</div>
      </div>
    </div>
  `;
}

function renderInsightCards(insights) {
  if (!insights.length) return '';
  return `
    <div class="mv-section">
      <div class="mv-section-title">
        ${Icon('lightBulb', { size: 14 })}
        <span>Insight untuk kamu</span>
      </div>
      <div class="mv-insights-list">
        ${insights.map((ins, i) => renderInsightCard(ins, i)).join('')}
      </div>
    </div>
  `;
}

function renderInsightCard(insight, index) {
  const iconName = INSIGHT_ICONS[insight.type] || 'sparkles';
  const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const color = severityColors[insight.severity] || '#3b82f6';

  return `
    <div class="mv-insight-card severity-${insight.severity || 'low'}"
         data-insight-id="${escapeHtml(insight.id || '')}"
         style="border-left-color: ${color}; animation-delay: ${index * 0.05}s">
      <div class="mv-insight-icon" style="color: ${color}">
        ${Icon(iconName, { size: 18 })}
      </div>
      <div class="mv-insight-body">
        <div class="mv-insight-title">${escapeHtml(insight.title)}</div>
        <div class="mv-insight-text">${escapeHtml(insight.body)}</div>
        ${insight.action ? `
          <div class="mv-insight-actions">
            <button type="button" class="mv-apply-btn"
                    data-action="apply-insight"
                    data-insight-index="${index}">
              ${Icon('check', { size: 12 })}
              <span>${escapeHtml(insight.action.label || 'Terapkan')}</span>
            </button>
            <button type="button" class="mv-ask-btn"
                    data-action="ask-about"
                    data-question="Ceritakan lebih detail tentang: ${escapeHtml(insight.title)}">
              Tanya
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderRecommendationsSection(recs) {
  return `
    <div class="mv-section">
      <div class="mv-section-title">
        ${Icon('target', { size: 14 })}
        <span>Rekomendasi Budget</span>
      </div>
      <div class="mv-recs-list">
        ${recs.map((rec, i) => `
          <div class="mv-rec-card">
            <div class="mv-rec-header">
              <div class="mv-rec-category">${escapeHtml(rec.category)}</div>
              <div class="mv-rec-priority priority-${rec.priority || 'penting'}">${(rec.priority || 'Penting').toUpperCase()}</div>
            </div>
            <div class="mv-rec-comparison">
              <div class="mv-rec-current">
                <div class="mv-rec-label">Saat ini</div>
                <div class="mv-rec-value">Rp ${fmt(rec.current)}</div>
              </div>
              <div class="mv-rec-arrow">→</div>
              <div class="mv-rec-suggested">
                <div class="mv-rec-label">Saran</div>
                <div class="mv-rec-value highlight">Rp ${fmt(rec.suggested ?? rec.planned)}</div>
              </div>
            </div>
            <div class="mv-rec-reason">${escapeHtml(rec.reason || '')}</div>
            ${rec.impact ? `<div class="mv-rec-impact">${Icon('trendingUp', { size: 10 })} ${escapeHtml(rec.impact)}</div>` : ''}
            ${rec.action ? `
              <button type="button" class="mv-apply-btn full-width"
                      data-action="apply-rec"
                      data-rec-index="${i}">
                Terapkan Rekomendasi
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderChatStarter(questions) {
  return `
    <div class="mv-section mv-chat-starter">
      <div class="mv-section-title">
        ${Icon('sparkles', { size: 14 })}
        <span>Yuk tanya aku</span>
      </div>
      <div class="mv-starter-questions">
        ${(questions || []).map((q) => `
          <button type="button" class="mv-starter-question" data-action="ask-starter" data-question="${escapeHtml(q)}">
            ${escapeHtml(q)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderChatSection(messages) {
  return `
    <div class="mv-section mv-chat-section">
      <div class="mv-messages-list">
        ${messages.map((m) => renderMessage(m)).join('')}
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  if (msg.role === 'user') {
    return `
      <div class="mv-msg mv-msg-user">
        <div class="mv-msg-bubble">${escapeHtml(msg.content)}</div>
      </div>
    `;
  }
  return `
    <div class="mv-msg mv-msg-assistant ${msg.isError ? 'error' : ''}">
      <div class="mv-msg-avatar">${Icon('sparkles', { size: 14 })}</div>
      <div class="mv-msg-content">
        <div class="mv-msg-bubble">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
        ${msg.suggested_actions?.length ? `
          <div class="mv-msg-actions">
            ${msg.suggested_actions.map((a, i) => `
              <button type="button" class="mv-msg-action-btn"
                      data-action="apply-msg-action"
                      data-msg-id="${escapeHtml(msg.id)}"
                      data-action-index="${i}">
                ${Icon('check', { size: 12 })}
                <span>${escapeHtml(a.label || 'Terapkan')}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function wireHandlers() {
  if (!_panelEl) return;

  _panelEl.querySelectorAll('[data-action="close"]').forEach((btn) => {
    btn.onclick = closeMonevisor;
  });

  _panelEl.querySelectorAll('[data-action="refresh"]').forEach((btn) => {
    btn.onclick = () => generateInsights();
  });

  _panelEl.querySelectorAll('[data-action="clear-chat"]').forEach((btn) => {
    btn.onclick = () => {
      if (confirm('Hapus riwayat chat?')) clearConversation();
    };
  });

  _panelEl.onclick = (e) => {
    if (e.target === _panelEl) closeMonevisor();
  };

  const input = _panelEl.querySelector('#mv-chat-input');
  const sendBtn = _panelEl.querySelector('[data-action="send"]');

  const doSend = async () => {
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    await sendMessage(msg);
  };

  if (sendBtn) sendBtn.onclick = doSend;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    };
  }

  _panelEl.querySelectorAll('[data-action="voice"]').forEach((btn) => {
    btn.onclick = () => startVoiceInput(input);
  });

  _panelEl.querySelectorAll('[data-action="apply-insight"]').forEach((btn) => {
    btn.onclick = async () => {
      const index = parseInt(btn.dataset.insightIndex, 10);
      const insight = getState().insights?.insights?.[index];
      if (!insight?.action) return;
      if (insight.action.type === 'view_category' || insight.action.type === 'ask_deeper') {
        input.value = `Ceritakan lebih detail tentang: ${insight.title}`;
        doSend();
        return;
      }
      btn.disabled = true;
      btn.innerHTML = `<div class="mv-spinner-mini"></div><span>Menerapkan...</span>`;
      try {
        await applyAction(insight.action, { source: 'insight' });
        showToast('✓ Berhasil diterapkan');
        btn.innerHTML = `${Icon('check', { size: 12 })}<span>Diterapkan</span>`;
      } catch (e) {
        showToast(`❌ Gagal: ${e.message}`);
        btn.disabled = false;
      }
    };
  });

  _panelEl.querySelectorAll('[data-action="apply-rec"]').forEach((btn) => {
    btn.onclick = async () => {
      const index = parseInt(btn.dataset.recIndex, 10);
      const rec = getState().insights?.budgetRecommendations?.[index];
      if (!rec?.action) return;
      btn.disabled = true;
      try {
        await applyAction(rec.action, { source: 'insight' });
        showToast('✓ Rekomendasi diterapkan');
      } catch (e) {
        showToast(`❌ Gagal: ${e.message}`);
        btn.disabled = false;
      }
    };
  });

  _panelEl.querySelectorAll('[data-action="apply-msg-action"]').forEach((btn) => {
    btn.onclick = async () => {
      const msgId = btn.dataset.msgId;
      const actionIndex = parseInt(btn.dataset.actionIndex, 10);
      const msg = getState().messages.find((m) => m.id === msgId);
      const action = msg?.suggested_actions?.[actionIndex];
      if (!action) return;
      btn.disabled = true;
      try {
        await applyAction(action, { source: 'chat', messageId: msgId });
        showToast('✓ Diterapkan');
      } catch (e) {
        showToast(`❌ Gagal: ${e.message}`);
        btn.disabled = false;
      }
    };
  });

  _panelEl.querySelectorAll('[data-action="ask-about"], [data-action="ask-starter"]').forEach((btn) => {
    btn.onclick = () => {
      const q = btn.dataset.question;
      if (!input) return;
      input.value = q;
      doSend();
    };
  });

  _panelEl.querySelectorAll('.mv-quick-reply').forEach((btn) => {
    btn.onclick = () => {
      if (!input) return;
      input.value = btn.dataset.reply || '';
      doSend();
    };
  });
}

function startVoiceInput(input) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Browser tidak support voice input');
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  showToast('Mendengarkan...');
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (input) input.value = transcript;
    showToast(`Terdeteksi: ${transcript}`);
  };
  recognition.onerror = (event) => {
    showToast(`Voice error: ${event.error}`);
  };
  recognition.start();
}

function scrollToInsight(focus) {
  if (!_panelEl || !focus) return;
  const insights = _panelEl.querySelectorAll('.mv-insight-card');
  for (const el of insights) {
    if (String(el.dataset.insightId || '').includes(String(focus))) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-flash');
      setTimeout(() => el.classList.remove('highlight-flash'), 2000);
      break;
    }
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'action-toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10001;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(num || 0)));
}

function fmtShort(num) {
  const n = Math.abs(num || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisorPanel = { openMonevisor, closeMonevisor };
}
