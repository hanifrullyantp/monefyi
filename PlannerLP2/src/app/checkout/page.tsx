import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import ConversationalCheckoutClient from './ConversationalCheckoutClient';
import { AuthHydrator } from '@/components/landing/AuthHydrator';
import { ContentHydrator } from '@/components/landing/ContentHydrator';
import { AdminSaveNotice } from '@/components/landing/AdminSaveNotice';

export const metadata: Metadata = {
  title: 'Checkout Resmi — Estimator',
  description: 'Selesaikan pemesanan lisensi Estimator secara aman dengan aktivasi otomatis.',
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialPlan =
    resolvedParams?.plan?.toLowerCase() === 'pro' ? 'pro' : 'standard';

  return (
    <>
      <AuthHydrator />
      <ContentHydrator />
      <AdminSaveNotice />
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ConversationalCheckoutClient initialPlan={initialPlan} />
      </Suspense>
    </>
  );
}

