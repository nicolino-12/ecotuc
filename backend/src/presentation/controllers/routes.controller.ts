import { Controller, Post, Get, Put, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RouteEntity } from '../../infrastructure/entities/route.entity';
import { ReportEntity } from '../../infrastructure/entities/report.entity';
import { RoutingService } from '../../application/services/routing.service';

class GenerateRouteDto {
  crewId: string;
  reportIds: string[];
}

@ApiTags('Rutas')
@Controller('routes')
export class RoutesController {
  constructor(
    private dataSource: DataSource,
    private routingService: RoutingService,
  ) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Generar y guardar una ruta optimizada para una cuadrilla' })
  async optimize(@Body() dto: GenerateRouteDto) {
    const routeRepo = this.dataSource.getRepository(RouteEntity);
    const reportRepo = this.dataSource.getRepository(ReportEntity);

    // 1. Ejecutar el algoritmo TSP
    const result = await this.routingService.optimizeRoute(dto.crewId, dto.reportIds);

    // 2. Crear registro de ruta en base de datos
    const route = routeRepo.create({
      crewId: dto.crewId,
      status: 'PENDIENTE',
      optimizedSequence: result.optimizedSequence,
      path: result.pathWkt,
      totalDistanceKm: result.totalDistanceKm,
      estimatedTimeMins: result.estimatedTimeMins,
    });

    const savedRoute = await routeRepo.save(route);

    // 3. Actualizar estado de los reportes incluidos a ASIGNADO y asociar cuadrilla
    await reportRepo
      .createQueryBuilder()
      .update(ReportEntity)
      .set({ status: 'ASIGNADO', crewId: dto.crewId })
      .whereInIds(dto.reportIds)
      .execute();

    // Responder con coordenadas decodificadas
    const coordinates = this.parseWktLineString(result.pathWkt);

    return {
      id: savedRoute.id,
      crewId: savedRoute.crewId,
      status: savedRoute.status,
      totalDistanceKm: savedRoute.totalDistanceKm,
      estimatedTimeMins: savedRoute.estimatedTimeMins,
      optimizedSequence: savedRoute.optimizedSequence,
      coordinates, // [[lat, lng], [lat, lng]...] para Leaflet
    };
  }

  @Get('crew/:crewId/active')
  @ApiOperation({ summary: 'Obtener la ruta activa actual de una cuadrilla' })
  async getActiveRoute(@Param('crewId') crewId: string) {
    const routeRepo = this.dataSource.getRepository(RouteEntity);
    
    // Obtenemos la última ruta que esté pendiente o en proceso
    const queryBuilder = routeRepo.createQueryBuilder('route');
    queryBuilder.select([
      'route.id',
      'route.crewId',
      'route.status',
      'route.optimizedSequence',
      'route.totalDistanceKm',
      'route.estimatedTimeMins',
      'ST_AsText(route.path) AS path_wkt',
    ]);
    queryBuilder.where('route.crewId = :crewId', { crewId });
    queryBuilder.andWhere("route.status IN ('PENDIENTE', 'EN_PROCESO')");
    queryBuilder.orderBy('route.createdAt', 'DESC');

    const rawResult = await queryBuilder.getRawOne();
    if (!rawResult) {
      throw new NotFoundException('No hay rutas activas para esta cuadrilla.');
    }

    const coordinates = this.parseWktLineString(rawResult.path_wkt);

    return {
      id: rawResult.route_id,
      crewId: rawResult.route_crewId,
      status: rawResult.route_status,
      totalDistanceKm: Number(rawResult.route_totalDistanceKm),
      estimatedTimeMins: Number(rawResult.route_estimatedTimeMins),
      optimizedSequence: rawResult.route_optimizedSequence,
      coordinates,
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de la ruta' })
  async updateRouteStatus(
    @Param('id') id: string,
    @Body('status') status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA',
  ) {
    const routeRepo = this.dataSource.getRepository(RouteEntity);
    const reportRepo = this.dataSource.getRepository(ReportEntity);
    const route = await routeRepo.findOne({ where: { id } });

    if (!route) {
      throw new NotFoundException('Ruta no encontrada.');
    }

    route.status = status;
    await routeRepo.save(route);

    // Si la ruta se completa, marcamos todos los reportes asociados como RESUELTOS
    if (status === 'COMPLETADA') {
      await reportRepo
        .createQueryBuilder()
        .update(ReportEntity)
        .set({ status: 'RESUELTO', resolvedAt: new Date() })
        .whereInIds(route.optimizedSequence)
        .execute();
    }

    return route;
  }

  /**
   * Helper para parsear WKT LINESTRING(lng lat, lng lat) a [[lat, lng]...]
   */
  private parseWktLineString(wkt: string): [number, number][] {
    if (!wkt || !wkt.startsWith('LINESTRING')) return [];
    try {
      const clean = wkt.replace('LINESTRING(', '').replace(')', '');
      return clean.split(',').map((pair) => {
        const [lng, lat] = pair.trim().split(' ');
        return [Number(lat), Number(lng)]; // Retornamos [lat, lng] para Leaflet
      });
    } catch {
      return [];
    }
  }
}
