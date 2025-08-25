import React, { useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const DEFAULT_ANIMS = {
  success: 'https://lottie.host/80a67766-7b76-4bf0-ba3e-2b07b5b0116c/DtBuvh5J2s.lottie',
  error:   'https://lottie.host/de34a0a9-29f0-4b23-94b4-94cd74b066e9/VzXdyCfpru.lottie', 
  info:    'https://lottie.host/8a55b587-6b6e-4f0a-8a7f-3f1b6a10bc9c/3T3M5WmGkR.lottie',
  warning: 'https://lottie.host/6f9c3d4e-7b2a-4e71-9f57-9c42b0a6c1a7/0u3b7nQx7C.lottie'
};

export default function ResultDialog({
  open,
  type = 'success',              // 'success' | 'error' | 'info' | 'warning'
  title,
  message,
  primaryText = 'OK',
  secondaryText,
  onPrimary,
  onSecondary,
  onClose,
  lottieSrc,                     // optional override
  autoCloseMs,                   // contoh: 2000
  disableBackdropClose = false,
}) {
  const dialogRef = useRef(null);

  // auto-close
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(() => { onClose?.(); onPrimary?.(); }, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose, onPrimary]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tone = {
    success: 'text-emerald-700',
    error: 'text-red-700',
    info: 'text-sky-700',
    warning: 'text-amber-700'
  }[type];

  const btnTone = {
    success: 'bg-emerald-600 hover:bg-emerald-700',
    error: 'bg-red-600 hover:bg-red-700',
    info: 'bg-sky-600 hover:bg-sky-700',
    warning: 'bg-amber-600 hover:bg-amber-700'
  }[type];

  const iconSrc = lottieSrc || DEFAULT_ANIMS[type] || DEFAULT_ANIMS.info;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title || type}
      onMouseDown={(e) => {
        if (disableBackdropClose) return;
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-3 animate-in fade-in zoom-in duration-150"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-28 h-28">
            <DotLottieReact src={iconSrc} loop autoplay />
          </div>

          {title && <h3 className={`mt-2 text-lg font-semibold ${tone}`}>{title}</h3>}
          {message && <p className="mt-1 text-gray-700">{message}</p>}

          <div className="mt-5 grid grid-cols-2 gap-2 w-full">
            {secondaryText ? (
              <>
                <button
                  className="px-3 py-2 border rounded-lg"
                  onClick={() => { onSecondary?.(); onClose?.(); }}
                >
                  {secondaryText}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-white ${btnTone}`}
                  onClick={() => { onPrimary?.(); onClose?.(); }}
                >
                  {primaryText}
                </button>
              </>
            ) : (
              <div className="col-span-2">
                <button
                  className={`w-full px-3 py-2 rounded-lg text-white ${btnTone}`}
                  onClick={() => { onPrimary?.(); onClose?.(); }}
                >
                  {primaryText}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* tombol close pojok */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="no-print absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
