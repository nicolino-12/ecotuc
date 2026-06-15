import { Controller, Post, Get, Put, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { CrewEntity } from '../../infrastructure/entities/crew.entity';
import { CrewMemberEntity } from '../../infrastructure/entities/crew-member.entity';

class CreateCrewDto {
  name: string;
  vehiclePlate: string;
}

class AddMemberDto {
  fullName: string;
  role: 'CHOFER' | 'RECOLECTOR';
}

class UpdateLocationDto {
  latitude: number;
  longitude: number;
  status?: 'ACTIVA' | 'INACTIVA' | 'EN_RUTA';
}

@ApiTags('Cuadrillas')
@Controller('crews')
export class CrewsController {
  constructor(private dataSource: DataSource) {}

  @Post()
  @ApiOperation({ summary: 'Crear una cuadrilla de limpieza' })
  async create(@Body() dto: CreateCrewDto) {
    const crewRepo = this.dataSource.getRepository(CrewEntity);
    const existing = await crewRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('El nombre de la cuadrilla ya está en uso.');
    }

    const defaultLoc = `POINT(-65.222312 -26.828372)`; // Plaza Independencia, Tucumán
    const crew = crewRepo.create({
      name: dto.name,
      vehiclePlate: dto.vehiclePlate,
      status: 'INACTIVA',
      currentLocation: defaultLoc,
    });

    return await crewRepo.save(crew);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las cuadrillas con sus integrantes' })
  async findAll() {
    const crewRepo = this.dataSource.getRepository(CrewEntity);
    const crews = await crewRepo.find({ relations: ['members'] });

    // Mapear geolocalización
    const rawLocations = await this.dataSource.query(
      `SELECT id, ST_X(current_location) as lng, ST_Y(current_location) as lat FROM crews`,
    );

    const locMap = rawLocations.reduce((acc, curr) => {
      acc[curr.id] = { longitude: Number(curr.lng), latitude: Number(curr.lat) };
      return acc;
    }, {} as Record<string, { longitude: number; latitude: number }>);

    return crews.map((c) => ({
      ...c,
      longitude: locMap[c.id]?.longitude || -65.222312,
      latitude: locMap[c.id]?.latitude || -26.828372,
    }));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Agregar un miembro a una cuadrilla' })
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    const memberRepo = this.dataSource.getRepository(CrewMemberEntity);
    const member = memberRepo.create({
      crewId: id,
      fullName: dto.fullName,
      role: dto.role,
    });
    return await memberRepo.save(member);
  }

  @Put(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación GPS actual e historial/estado del vehículo' })
  async updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    const crewRepo = this.dataSource.getRepository(CrewEntity);
    const crew = await crewRepo.findOne({ where: { id } });
    if (!crew) {
      throw new BadRequestException('Cuadrilla no encontrada.');
    }

    crew.currentLocation = `POINT(${dto.longitude} ${dto.latitude})`;
    if (dto.status) {
      crew.status = dto.status;
    }

    await crewRepo.save(crew);

    return {
      id: crew.id,
      name: crew.name,
      vehiclePlate: crew.vehiclePlate,
      status: crew.status,
      longitude: dto.longitude,
      latitude: dto.latitude,
    };
  }
}
