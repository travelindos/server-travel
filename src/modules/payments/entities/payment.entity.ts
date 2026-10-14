import Hashids from 'hashids';
import { BookTour } from '../../book-tours/entities/book-tour.entity';
import { BookMotor } from '../../book-motors/entities/book-motor.entity';
import { BookEntertainmentAttraction } from '../../book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { BookDocumentVisa } from '../../book-document-visas/entities/book-document-visa.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { ServiceType } from './service-type.enum';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCES = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('payments')
@Index(['user'])
@Index(['transactionId'])
export class Payment {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(
        process.env.ID_SECRET || 'travel_secret',
        10,
      ).encode(Date.now(), Math.floor(Math.random() * 10000));
    }
  }

  @ManyToOne(() => User, (user) => user.payments, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Customer, (customer) => customer.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ManyToOne(() => BookTour, (bookTour) => bookTour.payments)
  @JoinColumn({ name: 'book_tour_id' })
  bookTour: BookTour;

  @ManyToOne(() => BookMotor)
  @JoinColumn({ name: 'book_motor_id' })
  bookMotor: BookMotor;

  @ManyToOne(() => BookEntertainmentAttraction, (bookEntertainment) => bookEntertainment.payments, {
    nullable: true,
  })
  @JoinColumn({ name: 'book_entertainment_attraction_id' })
  bookEntertainmentAttraction?: BookEntertainmentAttraction;

  @ManyToOne(() => BookDocumentVisa, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'book_document_visa_id' })
  bookDocumentVisa?: BookDocumentVisa;

  @Column()
  invoice_code: string;

  @Column({
    nullable: true,
  })
  total_tourists: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : 0),
    },
  })
  amount: number;

  @Column()
  currency: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
    default: ServiceType.TOUR,
  })
  service_type: ServiceType;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  payer_email: string;

  @Column({ nullable: true })
  redirect_url: string;

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
