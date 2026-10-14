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
import { EntertainmentAttraction } from './entertainment-attraction.entity';

export enum TicketType {
  FLAT = 'flat',
  PACKAGE = 'package',
}

@Entity('entertainment_attraction_tickets')
export class EntertainmentAttractionTicket {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET || 'travel_secret', 10).encode(
        Date.now(),
        process.hrtime()[1],
        Math.floor(Math.random() * 100000),
      );
    }
  }

  @ManyToOne(
    () => EntertainmentAttraction,
    (attraction) => attraction.tickets,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'entertainment_attraction_id' })
  attraction: EntertainmentAttraction;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.FLAT,
  })
  ticket_type: TicketType;

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
  price: number;

  @Column({
    type: 'int',
    default: 1,
  })
  pax_count: number;

  // Age validation: min age to qualify for this ticket (inclusive). null = no minimum.
  @Column({ type: 'int', nullable: true })
  min_age?: number;

  // Age validation: max age to qualify for this ticket (inclusive). null = no maximum.
  @Column({ type: 'int', nullable: true })
  max_age?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
