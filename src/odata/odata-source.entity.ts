import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity()
export class OdataSource {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() baseUrl: string;
  @Column() username: string;
  @Column() password: string;
  @Column({ default: true }) enabled: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
