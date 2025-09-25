import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity()
export class OnecRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() uid: string;
  @Index() @Column() type: string;
  @Column('jsonb') payload: any;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
export default OnecRecord;
