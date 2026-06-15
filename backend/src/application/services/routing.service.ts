import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface ReportLocationInfo {
  id: string;
  lng: number;
  lat: number;
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

@Injectable()
export class RoutingService {
  constructor(private dataSource: DataSource) {}

  /**
   * Genera una secuencia de visitas optimizada (TSP heurístico ponderado por prioridad)
   * @param crewId ID de la cuadrilla
   * @param reportIds Lista de IDs de reportes asignados a ordenar
   */
  async optimizeRoute(
    crewId: string,
    reportIds: string[],
  ): Promise<{
    optimizedSequence: string[];
    pathWkt: string;
    totalDistanceKm: number;
    estimatedTimeMins: number;
  }> {
    if (!reportIds || reportIds.length === 0) {
      throw new Error('Debe proporcionar al menos un reporte para generar la ruta.');
    }

    // 1. Obtener ubicación de la cuadrilla
    const crewResult = await this.dataSource.query(
      `SELECT ST_X(current_location) as lng, ST_Y(current_location) as lat FROM crews WHERE id = $1`,
      [crewId],
    );

    if (crewResult.length === 0 || !crewResult[0].lng) {
      throw new Error('La cuadrilla especificada no existe o no tiene ubicación GPS válida.');
    }

    const startLng = Number(crewResult[0].lng);
    const startLat = Number(crewResult[0].lat);

    // 2. Obtener ubicación y prioridad de todos los reportes
    const reportsResult = await this.dataSource.query(
      `
      SELECT id, ST_X(location) as lng, ST_Y(location) as lat, priority 
      FROM reports 
      WHERE id ANY($1)
      `,
      [reportIds],
    );

    const reports: ReportLocationInfo[] = reportsResult.map((r) => ({
      id: r.id,
      lng: Number(r.lng),
      lat: Number(r.lat),
      priority: r.priority,
    }));

    // 3. Algoritmo Greedy con pesos de prioridad
    // Prioridad reduce la distancia efectiva para incentivar visitas tempranas a puntos críticos
    const priorityFactors: Record<string, number> = {
      CRITICA: 1.0,  // Reduce distancia efectiva un 40%
      ALTA: 0.7,     // Reduce distancia efectiva un 25%
      MEDIA: 0.4,    // Reduce distancia efectiva un 10%
      BAJA: 0.1,     // Sin reducción
    };

    const optimizedSequence: string[] = [];
    const remaining = [...reports];
    let currentLng = startLng;
    let currentLat = startLat;
    let totalDistanceKm = 0;

    const points: [number, number][] = [[startLng, startLat]];

    while (remaining.length > 0) {
      let bestIndex = -1;
      let minCost = Infinity;
      let actualDistForBest = 0;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        // Distancia euclídea simple aproximada a metros (1 grado latitud ~ 111.32 km)
        // O usamos ST_DistanceSphere en Postgres para exactitud:
        const distResult = await this.dataSource.query(
          `SELECT ST_Distance(
            ST_GeomFromText($1, 4326)::geography, 
            ST_GeomFromText($2, 4326)::geography
          ) / 1000.0 as dist_km`,
          [`POINT(${currentLng} ${currentLat})`, `POINT(${item.lng} ${item.lat})`],
        );
        const distKm = Number(distResult[0]?.dist_km || 0.1);

        const factor = priorityFactors[item.priority] || 0.1;
        const weightedCost = distKm * (1.0 - factor * 0.4); // costo ajustado por prioridad

        if (weightedCost < minCost) {
          minCost = weightedCost;
          bestIndex = i;
          actualDistForBest = distKm;
        }
      }

      if (bestIndex !== -1) {
        const nextItem = remaining.splice(bestIndex, 1)[0];
        optimizedSequence.push(nextItem.id);
        totalDistanceKm += actualDistForBest;
        currentLng = nextItem.lng;
        currentLat = nextItem.lat;
        points.push([currentLng, currentLat]);
      }
    }

    // 4. Construir WKT LineString para el mapa
    // Formato: LINESTRING(lng lat, lng lat, ...)
    const coordsStr = points.map((p) => `${p[0]} ${p[1]}`).join(', ');
    const pathWkt = `LINESTRING(${coordsStr})`;

    // 5. Estimar tiempos
    // Asumimos velocidad promedio de 30 km/h en calles urbanas
    // + 15 minutos fijos de limpieza por reporte visitado
    const travelTimeMins = (totalDistanceKm / 30.0) * 60.0;
    const cleaningTimeMins = reports.length * 15.0;
    const estimatedTimeMins = Math.round(travelTimeMins + cleaningTimeMins);

    return {
      optimizedSequence,
      pathWkt,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100, // 2 decimales
      estimatedTimeMins,
    };
  }
}
