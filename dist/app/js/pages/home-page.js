/**
 * Mobile Beranda page composer.
 * @module pages/home-page
 */

import { buildHomePageData } from '../services/home-data.js';
import { renderAccountCards } from '../components/account-cards.js';
import { renderQuickAccess } from '../components/quick-access.js';
import { renderRecentTransactionsList } from '../components/recent-transactions-list.js';
import { renderBudgetSummaryCard } from '../components/budget-summary-card.js';
import { renderMiniChart7Day } from '../components/mini-chart-7day.js';
import { renderDailyTipCard } from '../components/daily-tip-card.js';
import { Icon } from '../components/icons.js';

/**
 * @param {HTMLElement} container
 * @param {object} ctx - STATE + helpers from app.js
 * @param {object} [callbacks]
 */
export function renderHomePage(container, ctx, callbacks = {}) {
  if (!container) return;

  const { formatIDR, formatCompactIDR } = ctx.helpers;
  const data = buildHomePageData(ctx);
  const masked = data.saldoMasked;

  container.innerHTML = '';
  container.className = 'home-page';

  container.appendChild(renderAccountCards(data.accounts, formatIDR, masked, {
    onViewAll: callbacks.onViewAccounts,
    onAccountClick: callbacks.onAccountClick,
  }));
  container.appendChild(renderQuickAccess({ onActionClick: callbacks.onQuickAction }));

  const neracaCard = document.createElement('button');
  neracaCard.type = 'button';
  neracaCard.className = 'neraca-home-card tap';
  neracaCard.innerHTML = `
    <span class="neraca-home-card-icon">${Icon('bank', { size: 20 })}</span>
    <span>
      <span class="neraca-home-card-title">Neraca Keuangan</span>
      <span class="neraca-home-card-sub">Lihat struktur Aktiva &amp; Pasiva</span>
    </span>
    <span style="margin-left:auto;opacity:.6">${Icon('chevronRight', { size: 16 })}</span>
  `;
  neracaCard.addEventListener('click', () => callbacks.onViewNeraca?.());
  container.appendChild(neracaCard);

  container.appendChild(renderRecentTransactionsList(data.recentTransactions, formatIDR, {
    onViewAll: callbacks.onViewTransactions,
    onTransactionClick: callbacks.onTransactionClick,
  }));
  container.appendChild(renderBudgetSummaryCard(data.budgetSummary, formatIDR, {
    onClick: callbacks.onViewBudget,
  }));
  container.appendChild(renderMiniChart7Day(data.chartData, formatCompactIDR, {
    onViewFullChart: callbacks.onViewAdvisor,
  }));
  container.appendChild(renderDailyTipCard(data.dailyTip, {
    onActionClick: callbacks.onTipAction,
  }));
}

/**
 * @param {HTMLElement} container
 */
export function renderHomePageSkeleton(container) {
  if (!container) return;
  container.className = 'home-page home-page--loading';
  container.innerHTML = `
    <div class="home-skeleton">
      <div class="home-skeleton__bar"></div>
      <div class="home-skeleton__bar home-skeleton__bar--short"></div>
      <div class="home-skeleton__card"></div>
      <div class="home-skeleton__card"></div>
    </div>
  `;
}
