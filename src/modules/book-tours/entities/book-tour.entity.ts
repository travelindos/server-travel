import Hashids from 'hashids';
import { Customer } from '../../customers/entities/customer.entity';
import { Itinerary } from '../../itinerary/entities/itinerary.entity';
import { Tourist } from '../../tourists/entities/tourist.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { BookingAddOn } from '../../add-ons/entities/booking-add-on.entity';
import { Booker } from '../../bookers/entities/booker.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StatusBookTour {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('book_tours')
export class BookTour {
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
    length: 100,
    unique: true,
    nullable: false,
  })
  code: string;

  @ManyToOne(() => Itinerary)
  @JoinColumn({ name: 'itinerary_id' })
  itinerary: Itinerary;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Booker, (booker) => booker.book_tours, { cascade: true })
  @JoinColumn({ name: 'booker_id' })
  booker: Booker;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => (val ? parseFloat(val) : 0),
    },
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => (val ? parseFloat(val) : 0),
    },
  })
  tax: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => (val ? parseFloat(val) : 0),
    },
  })
  total: number;

  @Column({
    type: 'enum',
    enum: StatusBookTour,
    default: StatusBookTour.PENDING,
  })
  status: StatusBookTour;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => Tourist, (tourist) => tourist.bookTour, { cascade: true })
  tourists: Tourist[];

  @OneToMany(() => Payment, (payment) => payment.bookTour)
  payments: Payment[];

  @OneToMany(() => BookingAddOn, (bookingAddOn) => bookingAddOn.book_tour)
  add_ons: BookingAddOn[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at?: Date;
}
