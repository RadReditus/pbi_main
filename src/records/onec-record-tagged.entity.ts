import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
@Entity()
export class OnecRecordTagged {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() uid: string;
  @Index() @Column() type: string;
  @Column('jsonb') payload: any;
  @Column('jsonb', { nullable: true }) masks?: any;
  @Column('text', { array: true, default: '{}' }) appliedTags: string[];
  @CreateDateColumn() createdAt: Date;
}
export default OnecRecordTagged;
