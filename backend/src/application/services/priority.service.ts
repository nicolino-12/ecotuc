import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PriorityService {
  constructor(private dataSource: DataSource) {}

  /**
   * Calcula el puntaje de prioridad (0-100) y clasifica el reporte.
   * @param longitude Longitud de la incidencia
   * @param latitude Latitud de la incidencia
   * @param category Categoría del reporte
   * @param createdAt Fecha de creación (para reportes ya guardados)
   */
  async calculatePriority(
    longitude: number,
    latitude: number,
    category: string,
    createdAt: Date = new Date(),
  ): Promise<{ score: number; priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' }> {
    const pointWkt = `POINT(${longitude} ${latitude})`;
    let score = 0;

    // 1. Peso por Tipo de Incidencia (Máx 25 pts)
    const categoryWeights: Record<string, number> = {
      PELIGROSO: 25,
      BASURAL: 20,
      ALCANTARILLA: 18,
      ESCOMBROS: 10,
      OTROS: 5,
    };
    score += categoryWeights[category] || 5;

    // 2. Cercanía a Instituciones Críticas (Máx 40 pts)
    // Buscamos escuelas y hospitales en un radio de 500 metros usando PostGIS
    const nearbyInstitutions = await this.dataSource.query(
      `
      SELECT type, 
             ST_Distance(location::geography, ST_GeomFromText($1, 4326)::geography) as dist_m
      FROM institutions
      WHERE ST_DWithin(location::geography, ST_GeomFromText($1, 4326)::geography, 500)
      `,
      [pointWkt],
    );

    let hospitalPoints = 0;
    let schoolPoints = 0;
    let drainPoints = 0;

    for (const inst of nearbyInstitutions) {
      const dist = Number(inst.dist_m);
      if (inst.type === 'HOSPITAL') {
        // A menor distancia, más puntos. Máx 20 pts por hospital cercano.
        hospitalPoints = Math.max(hospitalPoints, Math.round(20 * (1 - dist / 500)));
      } else if (inst.type === 'ESCUELA') {
        // Máx 15 pts por escuela cercana.
        schoolPoints = Math.max(schoolPoints, Math.round(15 * (1 - dist / 500)));
      } else if (inst.type === 'DESAGUE') {
        // Máx 10 pts por desagüe/boca de tormenta cercano.
        drainPoints = Math.max(drainPoints, Math.round(10 * (1 - dist / 500)));
      }
    }
    score += hospitalPoints + schoolPoints + drainPoints;

    // 3. Densidad de Reportes similares en un radio de 300m (Máx 20 pts)
    const nearbyReportsCountResult = await this.dataSource.query(
      `
      SELECT COUNT(*) as cnt
      FROM reports
      WHERE category = $1
        AND status IN ('PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO')
        AND ST_DWithin(location::geography, ST_GeomFromText($2, 4326)::geography, 300)
      `,
      [category, pointWkt],
    );
    const nearbyCount = parseInt(nearbyReportsCountResult[0]?.cnt || '0', 10);
    // Suma 4 puntos por cada reporte cercano similar, tope 20
    score += Math.min(20, nearbyCount * 4);

    // 4. Antigüedad del reporte (Máx 15 pts)
    const diffMs = new Date().getTime() - createdAt.getTime();
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    // Suma 3 puntos por cada día de antigüedad, tope 15
    score += Math.min(15, Math.round(diffDays * 3));

    // Determinar la categoría final
    let priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'BAJA';
    if (score >= 80) {
      priority = 'CRITICA';
    } else if (score >= 60) {
      priority = 'ALTA';
    } else if (score >= 40) {
      priority = 'MEDIA';
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      priority,
    };
  }
}
