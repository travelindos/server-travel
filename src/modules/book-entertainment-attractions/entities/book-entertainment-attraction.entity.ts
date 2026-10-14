import Hashids from 'hashids';
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
  VersionColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Booker } from '../../bookers/entities/booker.entity';
import { User } from '../../users/entities/user.entity';
import { BookEntertainmentAttractionItem } from './book-entertainment-attraction-item.entity';
import { Tourist } from '../../tourists/entities/tourist.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum StatusBookEntertainmentAttraction {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('book_entertainment_attractions')
export class BookEntertainmentAttraction {
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
    enum: StatusBookEntertainmentAttraction,
    default: StatusBookEntertainmentAttraction.DRAFT,
  })
  status: StatusBookEntertainmentAttraction;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : 0),
    },
  })
  subtotal: number;

  @Column({ type: 'date', nullable: true })
  booking_date?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expired_at?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(
    () => BookEntertainmentAttractionItem,
    (item) => item.book_entertainment_attraction,
    { cascade: true },
  )
  book_entertainment_attraction_items: BookEntertainmentAttractionItem[];

  @OneToMany(
    () => Tourist,
    (tourist) => tourist.book_entertainment_attraction,
    { cascade: true },
  )
  tourists: Tourist[];

  @OneToMany(
    () => Payment,
    (payment) => payment.bookEntertainmentAttraction,
  )
  payments: Payment[];

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
