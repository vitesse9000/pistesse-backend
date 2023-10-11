import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { InfoType } from '../events/AuditableEvent';

@Entity({ name: 'audit' })
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column()
  type: string;

  @Column()
  name: string;

  @Column({ type: 'json' })
  info: InfoType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
