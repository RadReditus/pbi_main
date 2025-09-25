import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('mssql_change_tracker')
@Index(['databaseName', 'tableName'], { unique: true })
export class MssqlChangeTracker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  databaseName: string;

  @Column({ type: 'varchar', length: 255 })
  tableName: string;

  @Column({ type: 'bigint', default: 0 })
  lastProcessedRecordId: number;

  @Column({ type: 'timestamp', nullable: true })
  lastProcessedTimestamp: Date;

  @Column({ type: 'text', nullable: true })
  lastProcessedHash: string;

  @Column({ type: 'bigint', default: 0 })
  totalRecordsCount: number;

  @Column({ type: 'bigint', default: 0 })
  processedRecordsCount: number;

  @Column({ type: 'varchar', length: 50, default: 'id' })
  primaryKeyColumn: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timestampColumn: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
