import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('institutions')
export class InstitutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: 'ESCUELA' | 'HOSPITAL' | 'DESAGUE';

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string;
}
