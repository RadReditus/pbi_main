import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity()
export class LogEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() level: 'info'|'warn'|'error';
  @Column() message: string;
  @Column({ nullable: true }) flag?: string;
  @Column('jsonb', { nullable: true }) meta?: any;
  @CreateDateColumn() createdAt: Date;
}
