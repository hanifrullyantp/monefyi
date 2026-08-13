'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

interface ShareButtonProps {
  zakatType: string;
  amount: number;
  amountMonthly?: number;
}

export function ShareButton({ zakatType, amount, amountMonthly }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getShareText = () => {
    let text = `🌙 Hasil Perhitungan Zakat Saya\n\n`;
    text += `Jenis: ${zakatType}\n`;
    text += `Total: ${formatRupiah(amount)}/tahun\n`;
    if (amountMonthly) {
      text += `(${formatRupiah(amountMonthly)}/bulan)\n`;
    }
    text += `\nHitung zakatmu juga di:\nhttps://zakat.monefyi.com\n\n`;
    text += `#ZakatMonefyi #KalkulatorZakat`;
    return text;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={shareToWhatsApp}
        leftIcon={<MessageCircle className="w-4 h-4" />}
      >
        WhatsApp
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      >
        {copied ? 'Tersalin!' : 'Salin'}
      </Button>
    </div>
  );
}
