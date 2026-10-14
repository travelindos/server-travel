import Hashids from 'hashids';
import { Country } from '../../locations/entities/country.entity';
import { State } from '../../locations/entities/state.entity';
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
import { CategoryEntertainment } from './category-entertainment.entity';
import { EntertainmentAttractionTranslation } from './entertainment-attraction-translation.entity';
import { EntertainmentAttractionTicket } from './entertainment-attraction-ticket.entity';

@Entity('entertainment_attractions')
export class EntertainmentAttraction {
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
    () => CategoryEntertainment,
    (category) => category.attractions,
  )
  @JoinColumn({ name: 'category_entertainment_id' })
  category_entertainment: CategoryEntertainment;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @ManyToOne(() => State)
  @JoinColumn({ name: 'state_id' })
  state: State;

  @OneToMany(
    () => EntertainmentAttractionTranslation,
    (translation) => translation.attraction,
    { cascade: true },
  )
  translations: EntertainmentAttractionTranslation[];

  @OneToMany(
    () => EntertainmentAttractionTicket,
    (ticket) => ticket.attraction,
    { cascade: true },
  )
  tickets: EntertainmentAttractionTicket[];

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
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnail?: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  images?: string[];

  // Daily quota / maximum visitors capacity per schedule date. null = unlimited.
  @Column({ type: 'int', nullable: true })
  daily_quota?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
