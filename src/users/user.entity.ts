import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Role } from './role.enum';

@Entity()
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() email: string;
  @Column({ select: false }) passwordHash: string;
  @Column({ type: 'enum', enum: Role, array: true, default: [Role.USER] }) roles: Role[];
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
