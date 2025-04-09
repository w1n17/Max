// widgets/common/Modal/Modal.jsx
import React, { memo, useEffect, useCallback } from "react";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";

export const Modal = memo(
  ({ isOpen, onClose, title, children, isLoading = false, className = "" }) => {
    const handleEscape = useCallback(
      (e) => {
        if (e.key === "Escape" && !isLoading) {
          onClose();
        }
      },
      [onClose, isLoading]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex min-h-screen items-center justify-center p-4 text-center"
          onClick={!isLoading ? onClose : undefined}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

          <div
            className={`
            relative 
            transform 
            overflow-hidden 
            rounded-3xl 
            bg-[#1F1F1F]/90 
            p-8 
            text-left 
            shadow-xl 
            transition-all
            w-full 
            max-w-md
            ${className}
          `}
            onClick={(e) => e.stopPropagation()}
          >
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl"
                aria-label="Закрыть"
              >
                &times;
              </button>
            )}

            {title && (
              <h2
                className="text-2xl font-bold text-white mb-6"
                id="modal-title"
              >
                {title}
              </h2>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    );
  }
);
