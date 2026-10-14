import Hashids from 'hashids';
import { BookMotor } from '../../../modules/book-motors/entities/book-motor.entity';
import { BookTour } from '../../../modules/book-tours/entities/book-tour.entity';
import { BookEntertainmentAttraction } from '../../../modules/book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum Gender {
  MR = 'Mr',
  MISS = 'Miss',
  MRS = 'Mrs',
}

export enum AgeGroup {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT = 'infant',
}

@Entity('tourists')
export class Tourist {
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

  @ManyToOne(() => BookTour, (bookTour) => bookTour.tourists)
  @JoinColumn({ name: 'book_tour_id' })
  bookTour: BookTour;

  @ManyToOne(() => BookMotor, (bookMotor) => bookMotor.tourists)
  @JoinColumn({ name: 'book_motor_id' })
  book_motor: BookMotor;

  @ManyToOne(
    () => BookEntertainmentAttraction,
    (bookEntertainment) => bookEntertainment.tourists,
    { onDelete: 'CASCADE', nullable: true },
  )
  @JoinColumn({ name: 'book_entertainment_attraction_id' })
  book_entertainment_attraction?: BookEntertainmentAttraction;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({
    nullable: true,
  })
  phone_number?: string;

  @Column()
  nationality: string;

  @Column()
  passport_number: string;

  @Column({ type: 'date', nullable: true })
  birth_date?: Date;

  @Column({
    type: 'enum',
    enum: AgeGroup,
    nullable: true,
  })
  age_group?: AgeGroup;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at: Date;
}
