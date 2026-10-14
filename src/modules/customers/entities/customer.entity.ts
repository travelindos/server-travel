import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerSession } from './customer-session.entity';
import { CustomerProfile } from './customer-profile.entity';
import { Itinerary } from '../../itinerary/entities/itinerary.entity';
import { Booker } from '../../bookers/entities/booker.entity';
import { BookMotor } from '../../book-motors/entities/book-motor.entity';
import { BookEntertainmentAttraction } from '../../book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { BookDocumentVisa } from '../../book-document-visas/entities/book-document-visa.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('customers')
export class Customer {
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
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  password: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  phone_number?: string;

  @Column({
    default: false,
  })
  is_verified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  verify_code?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  verify_code_expires_at?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  reset_password_token?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  reset_password_expires_at?: Date;

  @OneToMany(() => CustomerSession, (session) => session.customer)
  sessions: CustomerSession[];

  @OneToOne(() => CustomerProfile, (profile) => profile.customer, { cascade: true })
  profile: CustomerProfile;

  @OneToMany(() => Itinerary, (itinerary) => itinerary.customer)
  itineraries: Itinerary[];

  @OneToMany(() => Booker, (booker) => booker.customer)
  bookers: Booker[];

  @OneToMany(() => BookMotor, (bookMotor) => bookMotor.customer)
  book_motors: BookMotor[];

  @OneToMany(
    () => BookEntertainmentAttraction,
    (bookEntertainment) => bookEntertainment.customer,
  )
  book_entertainment_attractions: BookEntertainmentAttraction[];

  @OneToMany(
    () => BookDocumentVisa,
    (bookDocumentVisa) => bookDocumentVisa.customer,
  )
  book_document_visas: BookDocumentVisa[];

  @OneToMany(() => Payment, (payment) => payment.customer)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt?: Date;
}
