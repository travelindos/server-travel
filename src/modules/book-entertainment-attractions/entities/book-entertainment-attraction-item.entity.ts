import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookEntertainmentAttraction } from './book-entertainment-attraction.entity';
import { EntertainmentAttraction } from '../../entertainment-attractions/entities/entertainment-attraction.entity';
import { EntertainmentAttractionTicket } from '../../entertainment-attractions/entities/entertainment-attraction-ticket.entity';

@Entity('book_entertainment_attraction_items')
export class BookEntertainmentAttractionItem {
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

  @ManyToOne(
    () => BookEntertainmentAttraction,
    (booking) => booking.book_entertainment_attraction_items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'book_entertainment_attraction_id' })
  book_entertainment_attraction: BookEntertainmentAttraction;

  @ManyToOne(() => EntertainmentAttraction)
  @JoinColumn({ name: 'entertainment_attraction_id' })
  entertainment_attraction: EntertainmentAttraction;

  @ManyToOne(() => EntertainmentAttractionTicket, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'entertainment_attraction_ticket_id' })
  ticket?: EntertainmentAttractionTicket;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ticket_name?: string;

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
  unit_price: number;

  @Column({ type: 'int', default: 1 })
  qty: number;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at: Date;
}
