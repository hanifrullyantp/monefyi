import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Brain, Cloud, Layers, Shield, Sparkles, Users, Wallet,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  BarChart3,
  Cloud,
  Wallet,
  Users,
  Shield,
  Layers,
  Brain,
};

export function resolveLandingIcon(key: string): LucideIcon {
  return ICONS[key] || Sparkles;
}
