import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrewEntity } from './crew.entity';

@Entity('crew_members')
export class CrewMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crew_id' })
  crewId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  role: 'CHOFER' | 'RECOLECTOR';

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => CrewEntity, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crew_id' })
  crew: CrewEntity;
}
