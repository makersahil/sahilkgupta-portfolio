import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = usePortfolio();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none font-mono text-xs">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-black/95 border-[#00ff41]/50 text-white'
                : toast.type === 'error'
                ? 'bg-black/95 border-[#ff4100]/50 text-white'
                : 'bg-[#111114]/95 border-white/20 text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#00ff41] shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#ff4100] shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#00d4ff] shrink-0" />}
              <span className="leading-snug text-xs">{toast.message}</span>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-3 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
