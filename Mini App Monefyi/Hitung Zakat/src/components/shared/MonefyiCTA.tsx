'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GradientText } from '@/components/ui/GradientText';
import { Smartphone, Check, ArrowRight } from 'lucide-react';

export function MonefyiCTA() {
  const features = [
    'Track pengeluaran harian',
    'Budget otomatis',
    'Alokasi zakat & sedekah',
    'Financial planning syariah',
  ];

  return (
    <section className="py-12">
      <Card variant="glow" className="text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Mau Kelola Keuangan{' '}
            <GradientText>Lengkap?</GradientText>
          </h2>

          <p className="text-green-100/70 mb-8">
            Monefyi bantu kamu kelola keuangan termasuk alokasi zakat dan
            sedekah dengan mudah
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left max-w-md mx-auto">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-100/80">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-5 h-5" />}
            onClick={() => window.open('https://monefyi.com', '_blank')}
          >
            Coba Monefyi GRATIS
          </Button>

          <p className="mt-4 text-sm text-green-100/50">
            Sekali bayar Rp 99.000, pakai selamanya
          </p>
        </div>
      </Card>
    </section>
  );
}
