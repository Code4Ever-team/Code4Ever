import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, Check, Move, Sparkles, Image as ImageIcon } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  aspectRatio?: 'square' | 'banner';
  language: 'tr' | 'en';
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  aspectRatio = 'square',
  language,
  onClose,
  onCropComplete
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = (angleDelta: number) => {
    setRotation((prev) => (prev + angleDelta + 360) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const targetSize = aspectRatio === 'banner' ? { width: 800, height: 300 } : { width: 400, height: 400 };

    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with rich dark tone
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Calculate source dimensions
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedResult = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'tr' ? 'Fotoğrafı Kırp & Düzenle' : 'Crop & Edit Photo'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {language === 'tr' ? 'Sürükleyerek konumlandırın ve yakınlaştırın' : 'Drag to position and zoom'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Crop Box */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative mx-auto overflow-hidden bg-black/90 border-2 border-zinc-700/80 cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center ${
            aspectRatio === 'banner'
              ? 'w-full h-44 rounded-2xl'
              : 'w-64 h-64 rounded-full ring-4 ring-zinc-800/80'
          }`}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To crop"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: 'none',
              userSelect: 'none'
            }}
            className="max-w-none max-h-none pointer-events-none object-cover"
          />

          {/* Overlay Grid lines for precision */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 opacity-30">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-zinc-400 pointer-events-none flex items-center gap-1">
            <Move className="w-3 h-3" />
            <span>{language === 'tr' ? 'Sürükle' : 'Drag'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 pt-1">
          {/* Zoom Slider */}
          <div className="space-y-1.5 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <ZoomOut className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Yakınlaştırma:' : 'Zoom:'}</span>
              </span>
              <span className="text-zinc-200 font-bold">{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
            />
          </div>

          {/* Action Buttons: Rotate & Reset */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRotate(-90)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={language === 'tr' ? 'Sola Döndür (-90°)' : 'Rotate Left'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>-90°</span>
              </button>
              <button
                type="button"
                onClick={() => handleRotate(90)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={language === 'tr' ? 'Sağa Döndür (+90°)' : 'Rotate Right'}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>+90°</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition-colors"
            >
              {language === 'tr' ? 'Sıfırla' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
          >
            {language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-zinc-950" />
            <span>{language === 'tr' ? 'Kırp ve Kaydet' : 'Crop & Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
