# Reporte de Evaluación de Clasificación con IA (EcoTuc)

## 1. Justificación y Causas de Errores Identificadas
Los modelos de visión por computadora para residuos urbanos suelen cometer errores críticos cuando:
1. **Confunden tipo de residuo con nivel de prioridad**: Un microbasural no es "crítico" solo por su aspecto visual; la prioridad depende del volumen, proximidad a escuelas/hospitales y taponamiento de drenajes (separado explícitamente en el sistema).
2. **Falsos positivos de residuos peligrosos**: Cualquier líquido derramado o envase industrial suele ser categorizado erróneamente como residuo patógeno o tóxico. **Regla adoptada**: No se declara "PELIGROSO" sin evidencia verificable; los casos dudosos se derivan a inspección humana presencial.
3. **Calidad de captura móvil en vía pública**: Imágenes desenfocadas, con contraluz o de noche inducen alucinaciones cuando la IA está obligada a forzar una respuesta segura. **Regla adoptada**: Si la confianza es menor a 0.70 o la imagen está borrosa, se muestra el estado ambiguo y se permite al ciudadano elegir manualmente o retomar la toma.

---

## 2. Comparativa: Antes vs. Después

| Métrica | Enfoque Anterior (Ingenuo) | Enfoque Nuevo (Auditable + Fallback Humano) |
|---|---|---|
| Precisión sin salvaguardas | 80.0% (con 2 errores forzados) | **100% de sugerencias válidas** (en muestras claras) |
| Falsos positivos de Peligroso | 1 caso (líquido dudoso marcado peligroso) | **0 casos** (derivado a revisión) |
| Manejo de fotos borrosas | Forzaba "Basural" al 96.8% ficticio | **Salvaguarda manual activada** (pide retomar foto) |
| Intervención humana obligatoria | Inexistente (envío no supervisado) | **Garantizada**: La IA nunca envía por sí sola |
| Privacidad | Riesgo de subida de fotos privadas | **Estricta**: Cero almacenamiento de imágenes para entrenamiento |

---

## 3. Matriz de Confusión del Nuevo Modelo

Columnas: Predicción del Modelo (o Derivación a Selección Manual)
Filas: Categoría Real (Ground Truth)

```
Real \ Pred        BASURAL  ALCANTARILLA  ESCOMBROS  PELIGROSO  OTROS  MANUAL_FALLBACK
BASURAL                 2            0          0          0      0          1 (Foto borrosa)
ALCANTARILLA            0            2          0          0      0          0
ESCOMBROS               0            0          2          0      0          0
PELIGROSO               0            0          0          1      0          0
OTROS                   0            0          0          0      1          1 (Líquido ambiguo)
```

### Interpretación:
- **Tasa de sugerencias correctas sobre imágenes nítidas**: 8/8 (100%).
- **Tasa de derivación a selección manual en fotos complejas/ambiguas**: 2/10 (20%), protegiendo al operador de datos falsos.
- **Tasa de falsos positivos en residuos peligrosos**: 0%.
