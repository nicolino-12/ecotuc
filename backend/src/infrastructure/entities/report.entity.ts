import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { CrewEntity } from './crew.entity';

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'citizen_id', nullable: true })
  citizenId: string;

  @Column()
  category: 'BASURAL' | 'ALCANTARILLA' | 'ESCOMBROS' | 'PELIGROSO' | 'OTROS';

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string;

  @Column({ default: 'BAJA' })
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

  @Column({ name: 'priority_score', type: 'float', default: 0.0 })
  priorityScore: number;

  @Column({ default: 'PENDIENTE' })
  status: 'PENDIENTE' | 'EN_REVISION' | 'ASIGNADO' | 'EN_PROCESO' | 'RESUELTO' | 'RECHAZADO';

  @Column({ name: 'crew_id', nullable: true })
  crewId: string;

  @Column({ nullable: true })
  observations: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'citizen_id' })
  citizen: UserEntity;

  @ManyToOne(() => CrewEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'crew_id' })
  crew: CrewEntity;
}
