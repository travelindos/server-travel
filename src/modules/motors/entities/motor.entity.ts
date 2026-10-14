import Hashids from 'hashids';
import { BookMotorItem } from '../../../modules/book-motors/entities/book-motor-item.entity';
import { State } from '../../../modules/locations/entities/state.entity';
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
import { Merek } from './merek.entity';
import { MotorPrice } from './motor-price.entity';
import { MotorTranslation } from './motor-translation.entity';
import { Variant } from './variant.entity';

@Entity('motors')
export class Motor {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(
        Date.now(),
        Math.floor(Math.random() * 10000),
      );
    }
  }

  @ManyToOne(() => State, (state) => state.motors)
  @JoinColumn({ name: 'state_id' })
  state: State;

  @ManyToOne(() => Merek, (merek) => merek.motors)
  @JoinColumn({ name: 'merek_id' })
  merek: Merek;

  @OneToMany(
    () => MotorTranslation,
    (motorTranslation) => motorTranslation.motor,
  )
  translations: MotorTranslation[];

  @Column()
  engine_cc: number;

  @Column()
  thumbnail: string;

  @Index()
  @Column()
  is_available: boolean;

  @OneToMany(() => Variant, (variant) => variant.motor)
  variants: Variant[];

  @OneToMany(() => MotorPrice, (motorPrice) => motorPrice.motor)
  motor_prices: MotorPrice[];

  @OneToMany(() => BookMotorItem, (bookMotorItem) => bookMotorItem.motor)
  book_motor_items: BookMotorItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at: Date;
}
