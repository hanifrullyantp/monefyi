/**
 * Mobile Beranda page composer.
 * @module pages/home-page
 */

import { buildHomePageData } from '../services/home-data.js';
import { useHomeLayoutV2 } from '../services/home-layout.js';
import { isSimpleHomeMode, saveHomeViewMode } from '../services/home-view-mode.js';
import { runHomeEngagementHooks } from '../services/engagement.js';
import { renderAccountCards } from '../components/account-cards.js';
import { renderQuickAccess } from '../components/quick-access.js';
import { renderRecentTransactionsList } from '../components/recent-transactions-list.js';
import { renderBudgetSummaryCard, renderBudgetAlertsCard } from '../components/budget-summary-card.js';
import { renderMiniChart7Day } from '../components/mini-chart-7day.js';
import { renderDailyTipCard } from '../components/daily-tip-card.js';
import { renderTargetSummaryCard } from '../components/target-summary-card.js';
import { Icon } from '../components/icons.js';

/**
 * Legacy beranda layout (pre TASK 1.3).
 */
function renderLegacyHome(container, data, ctx, callbacks, formatIDR, formatCompactIDR, masked) {
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
      <span class="neraca-home-card-sub">Lihat posisi keuangan lengkap</span>
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
 * Command-center layout (TASK 1.3).
 */
async function renderV2Home(container, data, ctx, callbacks, formatIDR, formatCompactIDR, masked) {
  try {
    const { hasOpeningBalances } = await import('../services/account-opening-balance.js');
    const userId = ctx.state?.db?.user?.id || window.STATE?.db?.user?.id;
    if (userId && !(await hasOpeningBalances(userId))) {
      const banner = document.createElement('div');
      banner.className = 'opening-balance-banner home-section';
      banner.innerHTML = `
        <span>Saldo awal per akun belum diisi — neraca bisa tidak seimbang.</span>
        <button type="button" class="tap opening-balance-banner__cta" data-action="setup-opening">Setup saldo awal</button>
      `;
      banner.querySelector('[data-action="setup-opening"]')?.addEventListener('click', () => {
        callbacks.onCompleteData?.();
      });
      container.appendChild(banner);
    }
  } catch (e) {
    console.warn('[home] opening balance banner', e);
  }

  try {
    const { renderStreakBadge } = await import('../components/streak-badge.js');
    const streakEl = renderStreakBadge(ctx.transactions || ctx.state?.transactions || []);
    if (streakEl) container.appendChild(streakEl);
  } catch (e) {
    console.warn('[home] streak badge', e);
  }

  try {
    const { renderHomeModeToggle } = await import('../components/simple-home-view.js');
    const toolbar = document.createElement('div');
    toolbar.className = 'home-page-toolbar';
    toolbar.appendChild(renderHomeModeToggle({
      onSwitchSimple: async () => {
        await saveHomeViewMode('simple');
        if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
      },
    }));
    container.appendChild(toolbar);
  } catch { /* ignore */ }

  try {
    const { buildDailySituationHero } = await import('../components/daily-situation-hero.js');
    const hero = await buildDailySituationHero(
      { ...ctx, state: ctx.state || window.STATE },
      {
        onCompleteData: callbacks.onCompleteData,
        onViewAdvisor: callbacks.onViewAdvisor,
        onViewBudget: callbacks.onViewBudget,
      },
    );
    if (hero) container.appendChild(hero);
  } catch (e) {
    console.warn('[home] daily situation hero', e);
  }

  try {
    const { renderRecurringPendingBar } = await import('../components/recurring-pending-bar.js');
    const recurringBar = await renderRecurringPendingBar({
      onConfirmed: () => callbacks.onViewTransactions?.(),
    });
    if (recurringBar) container.appendChild(recurringBar);
  } catch (e) {
    console.warn('[home] recurring pending bar', e);
  }

  try {
    const { generateWeeklyDigest } = await import('../services/weekly-digest.js');
    const digest = generateWeeklyDigest(state);
    if (digest.has_data && [0, 1].includes(new Date().getDay())) {
      state._weeklyDigest = digest;
      const { renderWeeklyDigestCard } = await import('../components/weekly-digest-card.js');
      const digestCard = renderWeeklyDigestCard(state, {
        onViewAdvisor: callbacks.onViewAdvisor,
      });
      if (digestCard) container.appendChild(digestCard);
    }
  } catch (e) {
    console.warn('[home] weekly digest', e);
  }

  try {
    const { buildFirstWeekPlanCard } = await import('../components/first-week-plan-card.js');
    const planCard = await buildFirstWeekPlanCard({
      onTaskAction: callbacks.onPlanTaskAction,
    });
    if (planCard) container.appendChild(planCard);
  } catch (e) {
    console.warn('[home] first-week plan card', e);
  }

  try {
    const { renderSmartInsightCard } = await import('../components/smart-insight-card.js');
    const insightCard = renderSmartInsightCard(state, {
      onViewAdvisor: callbacks.onViewAdvisor,
      onViewBudget: callbacks.onViewBudget,
      onViewTransactions: callbacks.onViewTransactions,
      onWhatIf: async () => {
        const { showWhatIfSimulator } = await import('../components/what-if-simulator.js');
        await showWhatIfSimulator({
          onNeedTarget: callbacks.onViewTarget,
          onSaved: () => { if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage(); },
        });
      },
    });
    if (insightCard) container.appendChild(insightCard);
  } catch (e) {
    console.warn('[home] smart insights', e);
  }

  try {
    const { loadFinancialGoals } = await import('../services/financial-goals.js');
    await loadFinancialGoals();
  } catch (e) {
    console.warn('[home] load goals', e);
  }

  const targetCard = renderTargetSummaryCard(
    data.primaryTarget || window.STATE?.db?.primaryGoalDisplay,
    {
      onClick: callbacks.onViewTarget,
      onWhatIf: async () => {
        const { showWhatIfSimulator } = await import('../components/what-if-simulator.js');
        await showWhatIfSimulator({
          onNeedTarget: callbacks.onViewTarget,
          onSaved: () => { if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage(); },
        });
      },
    },
  );
  if (targetCard) container.appendChild(targetCard);

  container.appendChild(renderQuickAccess({
    variant: 'compact',
    onActionClick: callbacks.onQuickAction,
  }));

  container.appendChild(renderRecentTransactionsList(
    ctx.transactions || data.recentTransactions,
    formatIDR,
    {
      onViewAll: callbacks.onViewTransactions,
      onTransactionClick: callbacks.onTransactionClick,
    },
    { mode: 'today', title: 'Transaksi Hari Ini' },
  ));

  const budgetAlerts = renderBudgetAlertsCard(data, formatIDR, {
    onClick: callbacks.onViewBudget,
  });
  if (budgetAlerts) {
    container.appendChild(budgetAlerts);
  } else {
    container.appendChild(renderBudgetSummaryCard(data.budgetSummary, formatIDR, {
      onClick: callbacks.onViewBudget,
    }));
  }

  container.appendChild(renderAccountCards(data.accounts, formatIDR, masked, {
    onViewAll: callbacks.onViewAccounts,
    onAccountClick: callbacks.onAccountClick,
  }));
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx - STATE + helpers from app.js
 * @param {object} [callbacks]
 */
export async function renderHomePage(container, ctx, callbacks = {}) {
  if (!container) return;

  const { formatIDR, formatCompactIDR } = ctx.helpers;

  try {
    const { loadFinancialTargets } = await import('../services/financial-targets.js');
    const { loadFinancialGoals } = await import('../services/financial-goals.js');
    await loadFinancialTargets();
    await loadFinancialGoals();
  } catch (e) {
    console.warn('[home] load targets', e);
  }

  const data = buildHomePageData(ctx);
  const masked = data.saldoMasked;
  const layoutV2 = useHomeLayoutV2(ctx.settings);
  const state = ctx.state || window.STATE || {};

  runHomeEngagementHooks().catch((e) => console.warn('[home] engagement', e));

  container.innerHTML = '';
  container.className = layoutV2 ? 'home-page home-page--v2' : 'home-page';

  if (layoutV2 && isSimpleHomeMode(state)) {
    container.className = 'home-page home-page--simple';
    const { renderSimpleHomeView } = await import('../components/simple-home-view.js');
    container.appendChild(renderSimpleHomeView(ctx, {
      onAddTransaction: () => callbacks.onQuickAction?.('add-transaction'),
      onCompleteData: () => callbacks.onCompleteData?.(),
      onExpand: async () => {
        await saveHomeViewMode('full');
        if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
      },
      onSwitchFull: async () => {
        await saveHomeViewMode('full');
        if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
      },
    }));
    return;
  }

  if (layoutV2) {
    await renderV2Home(container, data, ctx, callbacks, formatIDR, formatCompactIDR, masked);
  } else {
    try {
      const { buildDailySituationHero } = await import('../components/daily-situation-hero.js');
      const hero = await buildDailySituationHero(
        { ...ctx, state: ctx.state || window.STATE },
        {
          onCompleteData: callbacks.onCompleteData,
          onViewAdvisor: callbacks.onViewAdvisor,
          onViewBudget: callbacks.onViewBudget,
        },
      );
      if (hero) container.appendChild(hero);
    } catch (e) {
      console.warn('[home] daily situation hero', e);
    }
    try {
      const { renderRecurringPendingBar } = await import('../components/recurring-pending-bar.js');
      const recurringBar = await renderRecurringPendingBar();
      if (recurringBar) container.appendChild(recurringBar);
    } catch (e) {
      console.warn('[home] recurring pending bar', e);
    }
    renderLegacyHome(container, data, ctx, callbacks, formatIDR, formatCompactIDR, masked);
  }
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
