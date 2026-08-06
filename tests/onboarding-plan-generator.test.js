/**
 * Onboarding plan generator unit tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFirstWeekPlan,
  pickPrimaryProblem,
  FINANCIAL_PROBLEMS,
} from '../app/js/services/onboarding-plan-generator.js';

describe('generateFirstWeekPlan - always 7 tasks with unique days', () => {
  for (const problem of FINANCIAL_PROBLEMS) {
    it(`problem ${problem.id} yields 7 day tasks`, () => {
      const tasks = generateFirstWeekPlan({ financial_problems: [problem.id] });
      assert.equal(tasks.length, 7);
      const days = tasks.map((t) => t.day);
      assert.deepEqual(days, [1, 2, 3, 4, 5, 6, 7]);
      tasks.forEach((t) => {
        assert.ok(t.id);
        assert.ok(t.title);
        assert.ok(t.auto_key);
        assert.equal(t.completed, false);
      });
    });
  }
});

describe('pickPrimaryProblem - priority order', () => {
  it('prefers salary_gone_early when multiple selected', () => {
    const id = pickPrimaryProblem(['invest_confused', 'salary_gone_early', 'has_debt']);
    assert.equal(id, 'salary_gone_early');
  });

  it('defaults to salary_gone_early when empty', () => {
    assert.equal(pickPrimaryProblem([]), 'salary_gone_early');
  });
});

describe('generateFirstWeekPlan - debt goal customization', () => {
  it('includes debt name in day 7 title when pay_off_debt goal', () => {
    const tasks = generateFirstWeekPlan({
      financial_problems: ['has_debt'],
      near_term_goal: 'pay_off_debt',
      debt_name: 'Motor',
      has_debt: true,
    });
    const day7 = tasks.find((t) => t.day === 7);
    assert.ok(day7.title.includes('Motor'));
  });
});
