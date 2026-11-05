'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import ConversationalCheckout, { ProductTier } from '@/components/checkout/ConversationalCheckout';

export default function ConversationalCheckoutClient({
  initialPlan = 'standard',
}: {
  initialPlan?: ProductTier;
}) {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const activePlan: ProductTier =
    planParam?.toLowerCase() === 'pro'
      ? 'pro'
      : planParam?.toLowerCase() === 'free'
      ? 'free'
      : planParam?.toLowerCase() === 'standard'
      ? 'standard'
      : initialPlan;

  return <ConversationalCheckout initialProduct={activePlan} />;
}

