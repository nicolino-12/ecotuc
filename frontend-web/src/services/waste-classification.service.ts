import { ValidCategoryType } from '../components/AIWasteScanner';

export interface ClassificationResult {
  status: 'SUCCESS' | 'AMBIGUOUS' | 'LOW_QUALITY' | 'MODEL_UNAVAILABLE';
  suggestedCategory: ValidCategoryType | null;
  confidenceScore: number | null;
  confidenceLevel: 'ALTA' | 'MEDIA' | 'BAJA' | 'NO_DISPONIBLE';
  isHazardousSuspect: boolean;
  requiresHumanReview: boolean;
  qualityIssue?: 'BLURRY' | 'DARK' | 'NO_WASTE_DETECTED' | null;
  qualityDescription?: string;
  suggestedDescription: string;
  detectedElements: string[];
  explanation: string;
}

export class WasteClassificationService {
  /**
   * Analiza una imagen para determinar la naturaleza del residuo respetando el protocolo estricto:
   * 1. No declara residuo peligroso sin evidencia científica contrastada.
   * 2. Detecta imágenes borrosas o ambiguas e invita a la selección manual.
   * 3. Nunca envía ni clasifica sin confirmación humana previa.
   */
  public static async analyzeImage(photoUrl: string): Promise<ClassificationResult> {
    // Simulación más realista de inferencia: usamos heurísticas simples basadas en la URL
    // para devolver diferentes categorías y niveles de confianza.
    // En un proyecto real se reemplazaría por un modelo TensorFlow.js o una llamada a API.
    await new Promise((resolve) => setTimeout(resolve, 850));

    // Verificación básica de integridad de la imagen
    if (!photoUrl || (photoUrl.length < 500 && !photoUrl.startsWith('data:image'))) {
      return {
        status: 'LOW_QUALITY',
        suggestedCategory: null,
        confidenceScore: 0.25,
        confidenceLevel: 'BAJA',
        isHazardousSuspect: false,
        requiresHumanReview: true,
        qualityIssue: 'BLURRY',
        qualityDescription: 'La resolución de la captura es insuficiente o está fuera de foco para un diagnóstico automatizado.',
        suggestedDescription: '',
        detectedElements: ['Baja nitidez', 'Patrón difuso'],
        explanation: 'La IA no puede asegurar el tipo de residuo con la precisión requerida. Puedes seleccionar la categoría manualmente o tomar una fotografía más nítida.',
      };
    }

    // Heurística de muestra: buscar palabras clave en la URL para decidir categoría
    const lowerUrl = photoUrl.toLowerCase();
    let category: ValidCategoryType = 'OTROS';
    let description = '';
    let confidence = 0.78;
    let confidenceLevel: ClassificationResult['confidenceLevel'] = 'ALTA';
    const elements: string[] = [];

    if (lowerUrl.includes('plastic') || lowerUrl.includes('botellas')) {
      category = 'BASURAL';
      description = 'Acumulación de residuos plásticos y bolsas en la vía pública.';
      elements.push('Bolsas plásticas', 'Envases PET');
    } else if (lowerUrl.includes('tree') || lowerUrl.includes('rama') || lowerUrl.includes('poda')) {
      category = 'ESCOMBROS';
      description = 'Restos de poda y ramas vegetales mezclados con basura urbana.';
      elements.push('Ramas', 'Hojas secas');
      confidence = 0.72;
      confidenceLevel = 'MEDIA';
    } else if (lowerUrl.includes('drain') || lowerUrl.includes('alcantarilla') || lowerUrl.includes('obstru')) {
      category = 'ALCANTARILLA';
      description = 'Obstrucción parcial de alcantarilla con basura y sedimentos.';
      elements.push('Obstrucción', 'Sedimento');
      confidence = 0.81;
    } else if (lowerUrl.includes('hazard') || lowerUrl.includes('peligroso') || lowerUrl.includes('chemical')) {
      category = 'PELIGROSO';
      description = 'Posible residuo peligroso, requiere verificación humana.';
      elements.push('Sustancia sospechosa');
      confidence = 0.65;
      confidenceLevel = 'MEDIA';
    } else {
      // Categoría genérica de microbasural mixto
      category = 'BASURAL';
      description = 'Acumulación de residuos sólidos mixtos en la vereda.';
      elements.push('Bolsas plásticas', 'Residuos mixtos', 'Restos vegetales ligeros');
    }

    return {
      status: 'SUCCESS',
      suggestedCategory: category,
      confidenceScore: confidence,
      confidenceLevel: confidenceLevel,
      isHazardousSuspect: category === 'PELIGROSO',
      requiresHumanReview: false,
      qualityIssue: null,
      suggestedDescription: description,
      detectedElements: elements,
      explanation: `Se detectó patrón que coincide con la categoría "${category}". Revisar la foto para confirmar la clasificación.`,
    };
  }
    // Simulación de latencia de inferencia de visión artificial
    await new Promise((resolve) => setTimeout(resolve, 950));

    // Verificación de integridad básica de la imagen
    if (!photoUrl || (photoUrl.length < 500 && !photoUrl.startsWith('data:image'))) {
      return {
        status: 'LOW_QUALITY',
        suggestedCategory: null,
        confidenceScore: 0.25,
        confidenceLevel: 'BAJA',
        isHazardousSuspect: false,
        requiresHumanReview: true,
        qualityIssue: 'BLURRY',
        qualityDescription: 'La resolución de la captura es insuficiente o está fuera de foco para un diagnóstico automatizado.',
        suggestedDescription: '',
        detectedElements: ['Baja nitidez', 'Patrón difuso'],
        explanation: 'La IA no puede asegurar el tipo de residuo con la precisión requerida. Puedes seleccionar la categoría manualmente o tomar una fotografía más nítida.',
      };
    }

    // Inferencia contextual representativa de microbasurales en Tucumán
    return {
      status: 'SUCCESS',
      suggestedCategory: 'BASURAL',
      confidenceScore: 0.86,
      confidenceLevel: 'ALTA',
      isHazardousSuspect: false,
      requiresHumanReview: false,
      qualityIssue: null,
      suggestedDescription: 'Acumulación de residuos sólidos mixtos domiciliarios en vereda pública con bolsas y restos orgánicos.',
      detectedElements: ['Bolsas plásticas', 'Residuos mixtos', 'Restos vegetales ligeros'],
      explanation: 'Se detecta patrón característico de microbasural mixto. Se sugiere categoría "Basural Masivo", sujeta a tu confirmación manual.',
    };
  }

  /**
   * Registra discrepancias métricas de forma estrictamente anónima (sin fotos)
   */
  public static recordMetricCorrection(suggested: string, chosen: string, confidence: number | null): void {
    try {
      if (typeof window === 'undefined') return;
      const metrics = JSON.parse(localStorage.getItem('ecotuc_ai_audit_metrics') || '[]');
      metrics.push({
        timestamp: new Date().toISOString(),
        suggested,
        chosen,
        confidence,
        privacy: 'ANONYMOUS_METRICS_NO_PICTURE_UPLOADED',
      });
      localStorage.setItem('ecotuc_ai_audit_metrics', JSON.stringify(metrics.slice(-50)));
    } catch {
      // Ignorar fallos de cuota
    }
  }
}
