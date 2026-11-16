"use client";

import React, { useState } from 'react';
import { Sparkles, Brain, CheckCircle, AlertTriangle, Cpu, Gauge, RefreshCw } from 'lucide-react';

interface AIWasteScannerProps {
  photoUrl: string | null;
  onApplyAnalysis: (analysis: {
    category: string;
    description: string;
    priority: string;
    estimatedVolumeM3: number;
    confidence: number;
  }) => void;
}

export default function AIWasteScanner({ photoUrl, onApplyAnalysis }: AIWasteScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const runAIScan = () => {
    if (!photoUrl) return;
    setIsScanning(true);
    setAnalysisResult(null);

    // Simula procesamiento de red neuronal / visión por computadora
    setTimeout(() => {
      setIsScanning(false);
      // Detección basada en patrones de microbasurales urbanos de Tucumán
      const result = {
        primaryClass: 'BASURAL',
        confidence: 96.8,
        tags: [
          { name: 'Residuos Domiciliarios Mezclados', pct: 68 },
          { name: 'Restos de Poda y Ramas', pct: 22 },
          { name: 'Plásticos de Un Solo Uso', pct: 10 },
        ],
        estimatedVolumeM3: 2.4,
        hazardLevel: 'ALTA',
        priority: 'ALTA',
        environmentalImpact: 'Riesgo de proliferación de vectores y taponamiento pluvial.',
        suggestedDescription: 'Microbasural mixto con presencia de bolsas plásticas, restos orgánicos y ramas. Posible foco infeccioso en vía pública.',
      };
      setAnalysisResult(result);
    }, 1400);
  };

  if (!photoUrl) return null;

  return (
    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#5cb836]/20 text-[#154726] dark:text-emerald-300 flex items-center justify-center">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              EcoTuc IA • Visión Computacional
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#5cb836]/20 text-[#154726] dark:text-[#5cb836] font-bold">
                Beta
              </span>
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block -mt-0.5">
              Clasificación automática y estimación de severidad
            </span>
          </div>
        </div>

        {!analysisResult && !isScanning && (
          <button
            type="button"
            onClick={runAIScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#154726] hover:bg-[#0e331a] transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#5cb836]" />
            Analizar con IA
          </button>
        )}
      </div>

      {/* Animación de escaneo activo */}
      {isScanning && (
        <div className="py-4 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
          <div className="relative">
            <Cpu className="h-8 w-8 text-[#5cb836] animate-spin" />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            Segmentando imagen y calculando densidad de residuos...
          </span>
          <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#5cb836] animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Resultados de la Detección */}
      {analysisResult && (
        <div className="flex flex-col gap-3 pt-1 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-white dark:bg-cardLight p-2.5 rounded-xl border border-gray-200 dark:border-white/5">
              <span className="text-[10px] text-gray-400 block uppercase font-semibold">Tipo Detectado</span>
              <span className="font-bold text-[#154726] dark:text-emerald-400">Micro-basural Mixto</span>
            </div>

            <div className="bg-white dark:bg-cardLight p-2.5 rounded-xl border border-gray-200 dark:border-white/5">
              <span className="text-[10px] text-gray-400 block uppercase font-semibold">Certeza IA</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> {analysisResult.confidence}%
              </span>
            </div>

            <div className="bg-white dark:bg-cardLight p-2.5 rounded-xl border border-gray-200 dark:border-white/5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-gray-400 block uppercase font-semibold">Volumen Estimado</span>
              <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-amber-500" /> ~{analysisResult.estimatedVolumeM3} m³
              </span>
            </div>
          </div>

          {/* Etiquetas identificadas */}
          <div className="flex flex-wrap gap-1.5">
            {analysisResult.tags.map((t: any) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-cardLight border border-gray-200 dark:border-white/5 text-[11px] text-gray-700 dark:text-gray-300 font-medium"
              >
                <span>{t.name}</span>
                <strong className="text-[#5cb836] font-bold">({t.pct}%)</strong>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={runAIScan}
              className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="h-3 w-3" /> Re-analizar
            </button>
            <button
              type="button"
              onClick={() => onApplyAnalysis({
                category: analysisResult.primaryClass,
                description: analysisResult.suggestedDescription,
                priority: analysisResult.priority,
                estimatedVolumeM3: analysisResult.estimatedVolumeM3,
                confidence: analysisResult.confidence
              })}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#5cb836] hover:bg-[#489828] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Aplicar Datos al Formulario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
