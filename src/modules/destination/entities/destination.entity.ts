import Hashids from 'hashids';
import { State } from '../../../modules/locations/entities/state.entity';
import { City } from '../../../modules/locations/entities/city.entity';
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
import { CategoryDestination } from './category_destination.entity';
import { DestinationTranslation } from './destination-translation.entity';

@Entity('destinations')
export class Destination {
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
    () => CategoryDestination,
    (categoryDestination) => categoryDestination.destinations,
  )
  @JoinColumn({ name: 'category_destination_id' })
  category_destination: CategoryDestination;

  @ManyToOne(() => State, (state) => state.destinations)
  @JoinColumn({ name: 'state_id' })
  state: State;

  @ManyToOne(() => City, (city) => city.destinations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'city_id' })
  city?: City;

  @OneToMany(
    () => DestinationTranslation,
    (destinationTranslation) => destinationTranslation.destination,
  )
  translations: DestinationTranslation[];

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
