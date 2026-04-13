import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Accessible Modal component with keyboard navigation, focus management, and ARIA attributes.
 * Features:
 * - role="dialog" + aria-modal for screen readers
 * - aria-labelledby when title exists
 * - Escape key closes modal
 * - Focus trapping within modal
 * - Backdrop click closes modal
 * - Focus returns to trigger on close
 */
export function Modal({ open, title, onClose, children, maxWidth = "max-w-2xl" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle Escape key and focus management
  useEffect(() => {
    if (!open) return;

    // Store previous focus
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        trapFocus(event);
      }
    };

    // Add listeners
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleKeyDown);

    // Focus first interactive element in modal
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement | null;
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!open && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  // Focus trap: keep focus within modal
  const trapFocus = (event: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = Array.from(
      modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on backdrop, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleBackdropClick}
          role="presentation"
          aria-hidden="true"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId.current : undefined}
          >
            {title && (
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 id={titleId.current} className="text-xl font-serif font-bold">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-focus-ring)]"
                  aria-label="ปิดหน้าต่าง"
                  title="ปิด (Escape)"
                >
                  <X size={24} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
