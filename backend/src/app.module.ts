import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

// Entidades
import { UserEntity } from './infrastructure/entities/user.entity';
import { ReportEntity } from './infrastructure/entities/report.entity';
import { CrewEntity } from './infrastructure/entities/crew.entity';
import { CrewMemberEntity } from './infrastructure/entities/crew-member.entity';
import { InstitutionEntity } from './infrastructure/entities/institution.entity';
import { RouteEntity } from './infrastructure/entities/route.entity';

// Controladores
import { AuthController } from './presentation/controllers/auth.controller';
import { ReportsController } from './presentation/controllers/reports.controller';
import { CrewsController } from './presentation/controllers/crews.controller';
import { RoutesController } from './presentation/controllers/routes.controller';

// Gateways
import { NotificationsGateway } from './presentation/gateways/notifications.gateway';

// Servicios
import { PriorityService } from './application/services/priority.service';
import { RoutingService } from './application/services/routing.service';

@Module({
  imports: [
    // Variables de entorno con fallbacks configurados
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Conexión a Base de Datos PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'ecotuc',
      entities: [
        UserEntity,
        ReportEntity,
        CrewEntity,
        CrewMemberEntity,
        InstitutionEntity,
        RouteEntity,
      ],
      synchronize: false, // Usamos init.sql para consistencia y PostGIS
    }),

    // Módulo JWT para Autenticación
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ecotuc-jwt-secret-key-2026-dynamic',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AuthController,
    ReportsController,
    CrewsController,
    RoutesController,
  ],
  providers: [
    PriorityService,
    RoutingService,
    NotificationsGateway,
  ],
})
export class AppModule {}
