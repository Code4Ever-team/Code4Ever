import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Sparkles, X, ArrowRight, HardDrive } from 'lucide-react';
import { FileSizeValidationResult } from '../utils/fileUploadHelper';

interface FileUploadWarningBannerProps {
  onOpenSupportTab?: () => void;
}

export const FileUploadWarningBanner: React.FC<FileUploadWarningBannerProps> = ({
  onOpenSupportTab
}) => {
  const [warningData, setWarningData] = useState<FileSizeValidationResult | null>(null);

  useEffect(() => {
    const handleWarningEvent = (event: Event) => {
      const customEvent = event as CustomEvent<FileSizeValidationResult>;
      if (customEvent.detail) {
        setWarningData(customEvent.detail);
      }
    };

    window.addEventListener('c4e:file_size_exceeded', handleWarningEvent);
    return () => {
      window.removeEventListener('c4e:file_size_exceeded', handleWarningEvent);
    };
  }, []);

  useEffect(() => {
    if (warningData) {
      const timer = setTimeout(() => {
        setWarningData(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [warningData]);

  return (
    <AnimatePresence>
      {warningData && (
        <motion.aside
          aria-label="Dosya Boyutu Uyarısı"
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4 pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl border border-red-500/50 bg-[#140b0d]/95 backdrop-blur-xl p-4 md:p-5 shadow-2xl shadow-red-950/60 ring-2 ring-red-500/20">
            {/* Top red glow accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse" />

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    <span>
                      {warningData.isSpark
                        ? "Bu dosya 250MB'dan büyük!"
                        : "Bu dosya 15MB'dan büyük!"}
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 font-mono text-[10px] font-bold">
                    {warningData.fileSizeMB} MB / Max {warningData.maxAllowedMB} MB
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {warningData.isSpark ? (
                    <>
                      Seçilen <span className="font-mono text-zinc-100 font-bold break-all">"{warningData.fileName}"</span> dosyası <strong>250MB</strong> sınırını aşıyor. Lütfen daha küçük bir dosya seçin veya sıkıştırın.
                    </>
                  ) : (
                    <>
                      Normal kullanıcılar için tek seferlik yükleme sınırı <strong>15MB</strong>'dır. Projeye destek verip <strong>Spark</strong> rolü alarak tek seferde <strong>250MB</strong>'a kadar dosya yükleyebilirsiniz!
                    </>
                  )}
                </p>

                {!warningData.isSpark && onOpenSupportTab && (
                  <div className="pt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setWarningData(null);
                        onOpenSupportTab();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-950 fill-zinc-950" />
                      <span>Projeye Destek Ol (Spark Rolü & 250MB)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline-flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-amber-400" />
                      15MB ➔ 250MB
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setWarningData(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto dismiss progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 9, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500/40 origin-left"
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
