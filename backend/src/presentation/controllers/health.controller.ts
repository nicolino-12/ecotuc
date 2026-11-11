import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Response } from 'express';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Comprobar el estado de salud del backend y de la base de datos' })
  @ApiResponse({ status: 200, description: 'Servidor y base de datos operativos.' })
  @ApiResponse({ status: 503, description: 'Servidor o base de datos no disponible.' })
  async check(@Res() res: Response) {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const responseTimeMs = Date.now() - startTime;

      return res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'connected',
          engine: 'PostgreSQL + PostGIS',
          responseTimeMs,
        },
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'disconnected',
          engine: 'PostgreSQL + PostGIS',
          error: err?.message || 'Error de conexión a la base de datos',
        },
        environment: process.env.NODE_ENV || 'development',
      });
    }
  }
}
