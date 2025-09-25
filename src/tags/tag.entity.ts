import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity()
export class Tag {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ default: 'ALLOW' }) action: 'ALLOW'|'IGNORE'|'MASK';
  @Column('jsonb', { nullable: true }) conditions?: any;
  @Column('jsonb', { nullable: true }) masks?: any;
  @Column({ default: true }) enabled: boolean;
}
