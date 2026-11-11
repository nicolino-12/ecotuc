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

// Migraciones versionadas
import { InitialSchema1700000000001 } from './infrastructure/migrations/1700000000001-InitialSchema';
import { SeedDemoData1700000000002 } from './infrastructure/migrations/1700000000002-SeedDemoData';

// Controladores
import { AuthController } from './presentation/controllers/auth.controller';
import { ReportsController } from './presentation/controllers/reports.controller';
import { CrewsController } from './presentation/controllers/crews.controller';
import { RoutesController } from './presentation/controllers/routes.controller';
import { HealthController } from './presentation/controllers/health.controller';

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
    
    // Conexión a Base de Datos PostgreSQL con soporte PostGIS y migraciones automáticas versionadas
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
      migrations: [
        InitialSchema1700000000001,
        SeedDemoData1700000000002,
      ],
      migrationsRun: process.env.NODE_ENV !== 'test',
      synchronize: false, // Migraciones versionadas garantizan consistencia y PostGIS sin pérdida accidental
    }),

    // Módulo JWT para Autenticación
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ecotuc-jwt-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AuthController,
    ReportsController,
    CrewsController,
    RoutesController,
    HealthController,
  ],
  providers: [
    PriorityService,
    RoutingService,
    NotificationsGateway,
  ],
})
export class AppModule {}
