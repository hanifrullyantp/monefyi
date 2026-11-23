import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUiStore } from '../store/uiStore';

export default function ToastHost() {
  const { toast, clearToast } = useUiStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  const Icon = toast?.type === 'success' ? CheckCircle : toast?.type === 'error' ? AlertCircle : Info;
  const colors =
    toast?.type === 'success'
      ? 'bg-emerald-600'
      : toast?.type === 'error'
        ? 'bg-rose-600'
        : 'bg-slate-800';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${colors} max-w-sm`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
