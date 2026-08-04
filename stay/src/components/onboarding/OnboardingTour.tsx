import { useEffect, useRef, useCallback } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useNavigate } from 'react-router-dom';

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Selamat Datang di Monefyi Stay! 🎉',
      description:
        'Yuk kami tunjukkan fitur-fitur utama agar Anda cepat mahir mengelola penginapan.',
      side: 'over',
      align: 'center',
      showButtons: ['next'],
      nextBtnText: 'Mulai Tour →',
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Menu Navigasi 🧭',
      description: 'Ini menu utama untuk berpindah antar fitur aplikasi.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-front-desk"]',
    popover: {
      title: 'Front Desk 🏨',
      description:
        'Pusat operasional harian — check-in, check-out, dan status kamar real-time.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-bookings"]',
    popover: {
      title: 'Reservasi 📅',
      description: 'Kelola semua reservasi walk-in maupun online dari sini.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-reports"]',
    popover: {
      title: 'Laporan Keuangan 📊',
      description: 'Pantau pendapatan, okupansi, dan performa penginapan Anda.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-rooms"]',
    popover: {
      title: 'Manajemen Kamar 🛏️',
      description: 'Atur tipe kamar, harga, dan ketersediaan di sini.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="property-setup"]',
    popover: {
      title: 'Setup Penginapan ✨',
      description:
        'Terakhir & terpenting! Lengkapi data penginapan & kamar agar Front Desk siap digunakan.',
      side: 'bottom',
      nextBtnText: 'Lengkapi Sekarang →',
    },
  },
];

/**
 * Spotlight tour interaktif dengan driver.js.
 */
export default function OnboardingTour() {
  const driverRef = useRef<Driver | null>(null);
  const navigate = useNavigate();
  const tourActive = useOnboardingStore((s) => s.tourActive);
  const stopTour = useOnboardingStore((s) => s.stopTour);
  const openSetupModal = useOnboardingStore((s) => s.openSetupModal);
  const setOnboardingStatus = useOnboardingStore((s) => s.setOnboardingStatus);
  const persistOnboarding = useOnboardingStore((s) => s.persistOnboardingToServer);

  const finishWithSetup = useCallback(() => {
    setOnboardingStatus('started');
    void persistOnboarding({ onboardingStatus: 'started' });
    stopTour();
    openSetupModal();
    driverRef.current?.destroy();
  }, [setOnboardingStatus, persistOnboarding, stopTour, openSetupModal]);

  const handleSkip = useCallback(() => {
    setOnboardingStatus('skipped');
    void persistOnboarding({ onboardingStatus: 'skipped' });
    stopTour();
    driverRef.current?.destroy();
  }, [setOnboardingStatus, persistOnboarding, stopTour]);

  useEffect(() => {
    if (!tourActive) {
      driverRef.current?.destroy();
      driverRef.current = null;
      return;
    }

    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      navigate('/front-desk');
    }

    const steps = TOUR_STEPS.filter((step) => {
      if (!step.element) return true;
      return document.querySelector(step.element as string);
    });

    const instance = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Lanjut →',
      prevBtnText: '← Sebelumnya',
      doneBtnText: 'Lengkapi Setup →',
      allowKeyboardControl: true,
      overlayColor: 'rgba(0,0,0,0.7)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'stay-onboarding-popover',
      steps,
      onNextClick: (_element, _step, { driver: d }) => {
        if (d.isLastStep()) {
          finishWithSetup();
        } else {
          d.moveNext();
        }
      },
      onCloseClick: handleSkip,
    });

    driverRef.current = instance;

    const timer = window.setTimeout(() => {
      instance.drive();
    }, 400);

    return () => {
      clearTimeout(timer);
      instance.destroy();
    };
  }, [tourActive, navigate, finishWithSetup, handleSkip]);

  return null;
}
