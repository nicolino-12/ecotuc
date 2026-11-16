import React, { useState } from 'react';
import { 
  Sparkles, Brain, CheckCircle2, AlertTriangle, RefreshCw, 
  Check, Camera 
} from 'lucide-react';
import { WasteClassificationService, ClassificationResult } from '../services/waste-classification.service';

export const VALID_CATEGORIES = [
  { id: 'BASURAL', label: 'Basural Masivo (Residuos Sólidos Urbanos)' },
  { id: 'ALCANTARILLA', label: 'Alcantarilla Tapada / Obstrucción Pluvial' },
  { id: 'ESCOMBROS', label: 'Escombros y Restos de Construcción/Poda' },
  { id: 'PELIGROSO', label: 'Residuo Peligroso (Requiere Evidencia Verificada)' },
  { id: 'OTROS', label: 'Otros Residuos Urbanos' },
] as const;

export type ValidCategoryType = typeof VALID_CATEGORIES[number]['id'];

interface AIWasteScannerProps {
  photoUrl: string | null;
  currentCategory: string;
  currentDescription: string;
  onApplyCategory: (cat: string) => void;
  onApplyDescription: (desc: string) => void;
  onRetakePhoto?: () => void;
}

export default function AIWasteScanner({
  photoUrl,
  currentCategory,
  currentDescription,
  onApplyCategory,
  onApplyDescription,
  onRetakePhoto,
}: AIWasteScannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [userFeedbackRecorded, setUserFeedbackRecorded] = useState(false);
  const [manualSelection, setManualSelection] = useState<string>('');

  if (!photoUrl) return null;

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setUserFeedbackRecorded(false);

    try {
      const output = await WasteClassificationService.analyzeImage(photoUrl);
      setResult(output);
    } catch {
      setResult({
        status: 'MODEL_UNAVAILABLE',
        suggestedCategory: null,
        confidenceScore: null,
        confidenceLevel: 'NO_DISPONIBLE',
        isHazardousSuspect: false,
        requiresHumanReview: true,
        qualityDescription: 'El servicio de visión no está disponible en este momento. Selecciona la categoría manualmente.',
        suggestedDescription: '',
        detectedElements: [],
        explanation: 'Puedes continuar con la carga manual del reporte sin interrupciones.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = () => {
    if (result?.suggestedCategory) {
      onApplyCategory(result.suggestedCategory);
      if (result.suggestedDescription && !currentDescription) {
        onApplyDescription(result.suggestedDescription);
      }
    }
  };

  const handleRecordUserCorrection = (correctedCat: string) => {
    WasteClassificationService.recordMetricCorrection(
      result?.suggestedCategory || 'NINGUNA',
      correctedCat,
      result?.confidenceScore ?? null
    );
    setUserFeedbackRecorded(true);
  };

  return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/50 rounded-2xl p-4 flex flex-col gap-3 transition-all">
      {/* Encabezado del Módulo de Visión */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary dark:text-emerald-400 flex items-center justify-center font-bold">
            <Brain className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                EcoTuc IA • Sugerencia de Clasificación
              </span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                Asistente
              </span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold">
              La IA solo sugiere. Tú decides y confirmas antes de enviar.
            </p>
          </div>
        </div>

        {!result && !isAnalyzing && (
          <button
            type="button"
            onClick={runAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            Analizar Foto
          </button>
        )}
      </div>

      {/* Estado: Analizando */}
      {isAnalyzing && (
        <div className="p-4 rounded-xl bg-white dark:bg-cardLight border border-gray-200 dark:border-white/5 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Analizando patrones de residuos y verificando nitidez...
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            Comprobando nitidez, tipo de acumulación y ausencia de falsos positivos
          </span>
        </div>
      )}

      {/* Resultado: Calidad baja / Foto borrosa o no concluyente */}
      {result && (result.status === 'LOW_QUALITY' || result.status === 'AMBIGUOUS' || result.status === 'MODEL_UNAVAILABLE') && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Imagen ambigua o poco nítida
              </h4>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold mt-0.5">
                {result.qualityDescription || result.explanation}
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 font-bold">
                Por seguridad metodológica, no se presenta una clasificación automática forzada.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/40">
            {onRetakePhoto && (
              <button
                type="button"
                onClick={onRetakePhoto}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Tomar otra foto más nítida
              </button>
            )}
            <span className="text-[11px] text-gray-600 dark:text-gray-400 font-bold">
              O selecciona manualmente la categoría en el formulario abajo.
            </span>
          </div>
        </div>
      )}

      {/* Resultado Exitoso con Sugerencia Concreta */}
      {result && result.status === 'SUCCESS' && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-cardLight border border-gray-200 dark:border-white/10 flex flex-col gap-3 text-xs">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">
                Categoría Sugerida
              </span>
              <span className="text-sm font-bold text-primary dark:text-emerald-400 flex items-center gap-1">
                {VALID_CATEGORIES.find(c => c.id === result.suggestedCategory)?.label || result.suggestedCategory}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">
                Nivel de Confianza
              </span>
              <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                result.confidenceLevel === 'ALTA' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                {result.confidenceScore ? `${Math.round(result.confidenceScore * 100)}% (${result.confidenceLevel})` : result.confidenceLevel}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">
            {result.explanation}
          </p>

          {/* Elementos detectados */}
          {result.detectedElements.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.detectedElements.map((el, i) => (
                <span key={i} className="text-[10px] bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-bold">
                  • {el}
                </span>
              ))}
            </div>
          )}

          {/* Acciones principales: Aceptar sugerencia o corregir */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={runAnalysis}
              className="text-[11px] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1 font-bold cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Re-evaluar foto
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Aceptar Sugerencia
              </button>
            </div>
          </div>

          {/* Corrección Manual en Caso de Desacuerdo */}
          <div className="mt-1 p-2.5 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400">
              ¿La sugerencia no es correcta? Elige la categoría adecuada:
            </span>
            <div className="flex gap-2">
              <select
                value={manualSelection || currentCategory}
                onChange={(e) => {
                  setManualSelection(e.target.value);
                  handleRecordUserCorrection(e.target.value);
                  onApplyCategory(e.target.value);
                }}
                className="flex-1 bg-white dark:bg-cardLight text-xs text-black dark:text-white font-bold p-2 rounded-lg border border-gray-300 dark:border-white/10"
              >
                {VALID_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            {userFeedbackRecorded && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Corrección registrada de forma anónima para auditoría métrica local (sin fotos).
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
