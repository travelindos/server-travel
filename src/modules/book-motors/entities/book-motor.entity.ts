import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Booker } from '../../bookers/entities/booker.entity';
import { BookingAddOn } from '../../add-ons/entities/booking-add-on.entity';
import { BookMotorItem } from './book-motor-item.entity';
import { Tourist } from '../../tourists/entities/tourist.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum StatusBookMotor {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('book_motors')
export class BookMotor {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(
        Date.now(),
        Math.floor(Math.random() * 10000),
      );
    }
  }

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ManyToOne(() => Booker, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booker_id' })
  booker?: Booker;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: StatusBookMotor,
    default: StatusBookMotor.PENDING,
  })
  status: StatusBookMotor;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  total_price: number;

  @OneToMany(() => BookingAddOn, (bookingAddOn) => bookingAddOn.book_motor)
  booking_add_ons: BookingAddOn[];

  @OneToMany(() => BookMotorItem, (bookMotorItem) => bookMotorItem.book_motor)
  book_motor_items: BookMotorItem[];

  @OneToMany(() => Tourist, (tourist) => tourist.book_motor)
  tourists: Tourist[];

  @OneToMany(() => Payment, (payment) => payment.bookMotor)
  payments: Payment[];

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  expired_at?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at: Date;
}
