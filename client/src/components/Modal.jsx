import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // optional; remove and use plain JSX if not installed

export default function Modal({ isOpen, onClose, title, children }) {
  const contentRef = useRef(null);

  // prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // close on escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // If you don't have framer-motion installed, replace <AnimatePresence> + <motion.div> with simple divs
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        {/* backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden="true"
        />

        {/* modal content */}
        <motion.div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Dialog"}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-xl overflow-hidden ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
