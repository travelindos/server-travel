import { BookTour } from '../../book-tours/entities/book-tour.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Roles } from './role.entity';
import { Session } from './session.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Profile } from './profile.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  password: string;

  @ManyToOne(() => Roles, (role) => role.users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role: Roles;

  @OneToMany(() => Session, (sessions) => sessions.user)
  sessions: Session[];

  @Column({
    default: false,
  })
  is_verified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  verify_code: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  verify_code_expires_at: Date;



  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToOne(() => Profile, (profile) => profile.user, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id', referencedColumnName: 'id' })
  profile: Profile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
