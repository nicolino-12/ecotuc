"use client";

import React, { useState } from 'react';
import { X, CheckCircle2, Calendar, Users, Scale, ArrowLeftRight } from 'lucide-react';

interface BeforeAfterModalProps {
  report: any;
  onClose: () => void;
}

export default function BeforeAfterModal({ report, onClose }: BeforeAfterModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Imágenes de muestra con alta calidad si no cuenta con foto de resolución específica
  const beforeImage = report.imageUrl || 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&auto=format&fit=crop';
  const afterImage = report.cleanedImageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop';

  const handleSliderMove = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleSliderMove(e.clientX, rect);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleSliderMove(e.touches[0].clientX, rect);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121826] text-gray-900 dark:text-gray-100 max-w-2xl w-full rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="p-4 md:p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-cardLight/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#5cb836]/20 border border-[#5cb836]/40 flex items-center justify-center text-[#154726] dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Auditoría de Saneamiento: Antes y Después</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Incidencia #{report.id} • {report.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visor Interactivo Slider Antes y Después */}
        <div className="p-4 md:p-6 flex flex-col gap-4">
          <div
            className="relative h-72 md:h-80 w-full rounded-xl overflow-hidden select-none cursor-ew-resize border border-gray-300 dark:border-white/10 shadow-inner"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          >
            {/* Imagen DESPUÉS (Fondo completo) */}
            <img
              src={afterImage}
              alt="Lugar saneado (Después)"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-sm pointer-events-none flex items-center gap-1">
              <span>DESPUÉS (Saneado)</span>
            </div>

            {/* Imagen ANTES (Clip con posición del slider) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={beforeImage}
                alt="Microbasural original (Antes)"
                className="absolute inset-0 w-full h-full object-cover max-w-none"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-sm pointer-events-none">
                <span>ANTES (Microbasural)</span>
              </div>
            </div>

            {/* Línea divisoria y manija del slider */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-ew-resize pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 text-[#154726] dark:text-[#5cb836] shadow-lg flex items-center justify-center border-2 border-[#5cb836]">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Selector rápido y ayuda */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
            <span>Arrastra la barra para comparar visualmente</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSliderPosition(100)}
                className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-cardLight dark:hover:bg-gray-700 text-[11px] font-semibold"
              >
                Solo Antes
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(50)}
                className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-cardLight dark:hover:bg-gray-700 text-[11px] font-semibold"
              >
                50 / 50
              </button>
              <button
                type="button"
                onClick={() => setSliderPosition(0)}
                className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-cardLight dark:hover:bg-gray-700 text-[11px] font-semibold"
              >
                Solo Después
              </button>
            </div>
          </div>

          {/* Ficha Técnica de la Intervención */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 dark:bg-cardLight/40 rounded-xl border border-gray-200 dark:border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#5cb836]" />
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Resolución</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString('es-AR') : 'Reciente'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Cuadrilla</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {report.crewId ? `Cuadrilla #${report.crewId}` : 'Cuadrilla Municipal'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Scale className="h-4 w-4 text-amber-500" />
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Carga Retirada</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">~380 kg estimados</span>
              </div>
            </div>
          </div>

          {report.observations && (
            <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
              <strong>Observación de Cuadrilla:</strong> {report.observations}
            </p>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end bg-gray-50 dark:bg-cardLight/30">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-[#154726] hover:bg-[#0e331a] transition-all shadow-md"
          >
            Cerrar Comparador
          </button>
        </div>
      </div>
    </div>
  );
}
