import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrewEntity } from './crew.entity';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crew_id' })
  crewId: string;

  @Column({ default: 'PENDIENTE' })
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';

  @Column({ type: 'jsonb', name: 'optimized_sequence' })
  optimizedSequence: string[]; // Array de IDs de reportes

  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  path: string; // WKT LineString

  @Column({ name: 'total_distance_km', type: 'float' })
  totalDistanceKm: number;

  @Column({ name: 'estimated_time_mins', type: 'float' })
  estimatedTimeMins: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => CrewEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crew_id' })
  crew: CrewEntity;
}
