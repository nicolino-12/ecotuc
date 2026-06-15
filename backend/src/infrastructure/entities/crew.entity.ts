import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { CrewMemberEntity } from './crew-member.entity';

@Entity('crews')
export class CrewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'vehicle_plate' })
  vehiclePlate: string;

  @Column({ default: 'INACTIVA' })
  status: 'ACTIVA' | 'INACTIVA' | 'EN_RUTA';

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  currentLocation: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @OneToMany(() => CrewMemberEntity, (member) => member.crew)
  members: CrewMemberEntity[];
}
