import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getVariantBucket,
  pickOfferVariant,
  applyVariantToOffer,
} from '../app/js/services/marketing-ab.js';
import {
  aggregateOfferMetrics,
  buildFunnelSteps,
  metricsByOfferId,
} from '../app/js/services/marketing-analytics.js';

describe('marketing-ab', () => {
  it('pickOfferVariant is deterministic per user', () => {
    const variants = [
      { id: '1', variant_key: 'A', weight: 50, active: true, content_json: { headline: 'A' } },
      { id: '2', variant_key: 'B', weight: 50, active: true, content_json: { headline: 'B' } },
    ];
    const a = pickOfferVariant(variants, 'user-1', 'offer-1');
    const b = pickOfferVariant(variants, 'user-1', 'offer-1');
    assert.equal(a?.variant_key, b?.variant_key);
  });

  it('applyVariantToOffer merges content', () => {
    const offer = { id: 'o1', content_json: { headline: 'Base', body: 'x' } };
    const merged = applyVariantToOffer(offer, { id: 'v1', variant_key: 'B', content_json: { headline: 'Test B' } });
    assert.equal(merged.content_json.headline, 'Test B');
    assert.equal(merged.content_json.body, 'x');
    assert.equal(merged._variant_key, 'B');
  });

  it('getVariantBucket returns 0-99', () => {
    const b = getVariantBucket('u', 'o');
    assert.ok(b >= 0 && b < 100);
  });
});

describe('marketing-analytics', () => {
  it('aggregateOfferMetrics computes CTR', () => {
    const m = aggregateOfferMetrics([
      { action: 'viewed' },
      { action: 'viewed' },
      { action: 'clicked' },
      { action: 'dismissed' },
    ]);
    assert.equal(m.viewed, 2);
    assert.equal(m.clicked, 1);
    assert.equal(m.ctr, 50);
  });

  it('buildFunnelSteps orders funnel', () => {
    const steps = buildFunnelSteps([
      { action: 'viewed' },
      { action: 'clicked' },
    ]);
    assert.equal(steps[0].step, 'Shown');
    assert.equal(steps[2].step, 'Clicked');
  });

  it('metricsByOfferId groups by offer', () => {
    const map = metricsByOfferId([
      { offer_id: 'a', action: 'viewed' },
      { offer_id: 'b', action: 'viewed' },
      { offer_id: 'a', action: 'clicked' },
    ]);
    assert.equal(map.a.viewed, 1);
    assert.equal(map.a.clicked, 1);
    assert.equal(map.b.viewed, 1);
  });
});
