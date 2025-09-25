import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
export class TableCounter {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Index() @Column() tableName: string;
  
  @Index() @Column() baseUrl: string;
  
  @Column() collectionName: string;
  
  @Column({ type: 'int', default: 0 }) currentCount: number;
  
  @Column({ type: 'int', default: 0 }) lastSyncedCount: number;
  
  @Column({ type: 'boolean', default: false }) needsUpdate: boolean;
  
  @Column({ type: 'timestamp', nullable: true }) lastCheckedAt: Date;
  
  @Column({ type: 'timestamp', nullable: true }) lastUpdatedAt: Date;
  
  @CreateDateColumn() createdAt: Date;
  
  @UpdateDateColumn() updatedAt: Date;
}




