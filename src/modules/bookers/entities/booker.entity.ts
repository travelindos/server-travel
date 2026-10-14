import Hashids from 'hashids';
import { Customer } from '../../customers/entities/customer.entity';
import { BookTour } from '../../book-tours/entities/book-tour.entity';
import { BookMotor } from '../../book-motors/entities/book-motor.entity';
import { BookEntertainmentAttraction } from '../../book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { BookDocumentVisa } from '../../book-document-visas/entities/book-document-visa.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bookers')
@Index(['customer', 'email'])
@Index(['customer', 'phone_number'])
export class Booker {
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

  @ManyToOne(() => Customer, (customer) => customer.bookers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  phone_number: string;

  @OneToMany(() => BookTour, (bookTour) => bookTour.booker)
  book_tours: BookTour[];

  @OneToMany(() => BookMotor, (bookMotor) => bookMotor.booker)
  book_motors: BookMotor[];

  @OneToMany(
    () => BookEntertainmentAttraction,
    (bookEntertainment) => bookEntertainment.booker,
  )
  book_entertainment_attractions: BookEntertainmentAttraction[];

  @OneToMany(
    () => BookDocumentVisa,
    (bookDocumentVisa) => bookDocumentVisa.booker,
  )
  book_document_visas: BookDocumentVisa[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at?: Date;
}
