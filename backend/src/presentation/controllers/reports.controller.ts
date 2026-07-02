import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { ReportEntity } from '../../infrastructure/entities/report.entity';
import { PriorityService } from '../../application/services/priority.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

class CreateReportDto {
  citizenId?: string;
  category: 'BASURAL' | 'ALCANTARILLA' | 'ESCOMBROS' | 'PELIGROSO' | 'OTROS';
  description?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string; // Si se envía una URL directa o se usa el simulador
}

class UpdateStatusDto {
  status: 'PENDIENTE' | 'EN_REVISION' | 'ASIGNADO' | 'EN_PROCESO' | 'RESUELTO' | 'RECHAZADO';
  observations?: string;
  crewId?: string;
}

@ApiTags('Reportes')
@Controller('reports')
export class ReportsController {
  constructor(
    private dataSource: DataSource,
    private priorityService: PriorityService,
    private notificationsGateway: NotificationsGateway,
  ) {
    // Asegurar que exista carpeta uploads
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crear un reporte de basura' })
  async create(@Body() dto: CreateReportDto) {
    const reportRepo = this.dataSource.getRepository(ReportEntity);

    // 1. Calcular prioridad automatizada
    const { score, priority } = await this.priorityService.calculatePriority(
      dto.longitude,
      dto.latitude,
      dto.category,
    );

    // 2. Crear registro
    const wktLocation = `POINT(${dto.longitude} ${dto.latitude})`;
    const report = reportRepo.create({
      citizenId: dto.citizenId || null,
      category: dto.category,
      description: dto.description,
      imageUrl: dto.imageUrl || '/uploads/placeholder.jpg',
      location: wktLocation,
      priority,
      priorityScore: score,
      status: 'PENDIENTE',
    });

    const saved = await reportRepo.save(report);

    // Retornar objeto legible convirtiendo el Point de vuelta a coords
    const result = {
      ...saved,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };

    // Emitir por WebSockets
    this.notificationsGateway.broadcastNewReport(result);

    return result;
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOperation({ summary: 'Subir una fotografía para el reporte' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido.');
    }
    // Retorna la ruta accesible estáticamente
    return { imageUrl: `/uploads/${file.filename}` };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los reportes con filtros' })
  async findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const reportRepo = this.dataSource.getRepository(ReportEntity);
    const queryBuilder = reportRepo.createQueryBuilder('report');

    // Mapear geometría de PostGIS a lat/lng legibles en el select
    queryBuilder.select([
      'report.id',
      'report.citizenId',
      'report.category',
      'report.description',
      'report.imageUrl',
      'report.priority',
      'report.priorityScore',
      'report.status',
      'report.crewId',
      'report.observations',
      'report.createdAt',
      'report.resolvedAt',
      'ST_X(report.location) AS longitude',
      'ST_Y(report.location) AS latitude',
    ]);

    if (category) {
      queryBuilder.andWhere('report.category = :category', { category });
    }
    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }
    if (priority) {
      queryBuilder.andWhere('report.priority = :priority', { priority });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');

    const rawResults = await queryBuilder.getRawMany();

    // Mapear estructura plana de TypeORM getRawMany a objeto anidado limpio
    return rawResults.map((r) => ({
      id: r.report_id,
      citizenId: r.report_citizenId,
      category: r.report_category,
      description: r.report_description,
      imageUrl: r.report_imageUrl,
      priority: r.report_priority,
      priorityScore: Number(r.report_priorityScore),
      status: r.report_status,
      crewId: r.report_crewId,
      observations: r.report_observations,
      createdAt: r.report_createdAt,
      resolvedAt: r.report_resolvedAt,
      longitude: Number(r.longitude),
      latitude: Number(r.latitude),
    }));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas globales para el Dashboard' })
  async getStats() {
    const reportRepo = this.dataSource.getRepository(ReportEntity);

    const counts = await reportRepo
      .createQueryBuilder('report')
      .select('report.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.status')
      .getRawMany();

    const priorities = await reportRepo
      .createQueryBuilder('report')
      .select('report.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where("report.status IN ('PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO')")
      .groupBy('report.priority')
      .getRawMany();

    const activeCrewsResult = await this.dataSource.query(
      `SELECT COUNT(*) as active FROM crews WHERE status != 'INACTIVA'`,
    );

    const total = await reportRepo.count();

    const openCount = counts
      .filter((c) => ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(c.status))
      .reduce((sum, c) => sum + parseInt(c.count, 10), 0);

    const closedCount = counts
      .filter((c) => ['RESUELTO', 'RECHAZADO'].includes(c.status))
      .reduce((sum, c) => sum + parseInt(c.count, 10), 0);

    const urgentCount = priorities
      .filter((p) => ['CRITICA', 'ALTA'].includes(p.priority))
      .reduce((sum, p) => sum + parseInt(p.count, 10), 0);

    return {
      total,
      open: openCount,
      closed: closedCount,
      urgent: urgentCount,
      activeCrews: parseInt(activeCrewsResult[0]?.active || '0', 10),
      statusStats: counts.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count, 10);
        return acc;
      }, {}),
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar estado y asignación de un reporte' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const reportRepo = this.dataSource.getRepository(ReportEntity);
    const report = await reportRepo.findOne({ where: { id } });

    if (!report) {
      throw new BadRequestException('Reporte no encontrado.');
    }

    report.status = dto.status;
    if (dto.observations !== undefined) {
      report.observations = dto.observations;
    }
    if (dto.crewId !== undefined) {
      report.crewId = dto.crewId || null;
    }

    if (dto.status === 'RESUELTO') {
      report.resolvedAt = new Date();
    }

    await reportRepo.save(report);
    return report;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un reporte por ID' })
  async deleteReport(@Param('id') id: string) {
    const reportRepo = this.dataSource.getRepository(ReportEntity);
    const report = await reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new BadRequestException('Reporte no encontrado.');
    }
    await reportRepo.remove(report);
    return { success: true };
  }
}
