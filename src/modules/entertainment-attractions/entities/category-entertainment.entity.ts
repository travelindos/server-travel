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
import { EntertainmentAttraction } from './entertainment-attraction.entity';
import Hashids from 'hashids';

@Entity('category_entertainments')
export class CategoryEntertainment {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET || 'travel_secret', 10).encode(
        Date.now(),
        process.hrtime()[1],
        Math.floor(Math.random() * 10000),
      );
    }
  }

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @OneToMany(
    () => EntertainmentAttraction,
    (attraction) => attraction.category_entertainment,
  )
  attractions: EntertainmentAttraction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
