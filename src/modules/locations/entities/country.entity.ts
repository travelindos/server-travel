import Hashids from 'hashids';
import { BookTour } from '../../book-tours/entities/book-tour.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { State } from './state.entity';
import { City } from './city.entity';

@Entity('countries')
export class Country {
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

  @Column()
  iso: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @OneToMany(() => State, (state) => state.country, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  states: State[];

  @OneToMany(() => City, (city) => city.country, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  cities: City[];



  @Column()
  flag: string;

  @Column()
  phone_code: string;

  @Column()
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
