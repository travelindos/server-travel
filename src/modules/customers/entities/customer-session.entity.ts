import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_sessions')
export class CustomerSession {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET || 'travel_secret', 10).encode(
        Date.now(),
        Math.floor(Math.random() * 10000),
      );
    }
  }

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  token: string; // access_token hash (short-lived)

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refresh_token: string; // refresh_token hash (long-lived, stored in cookie)

  @ManyToOne(() => Customer, (customer) => customer.sessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  customer: Customer;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  ip: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  expiresAt: Date; // access token expiry (1 hour)

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  refreshExpiresAt: Date; // refresh token expiry (7 days)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
