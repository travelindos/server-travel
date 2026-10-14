import { BeforeInsert, Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { BookMotor } from "./book-motor.entity";
import Hashids from "hashids";
import { Motor } from '../../motors/entities/motor.entity';

@Entity('book_motor_items')
export class BookMotorItem {
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

  @ManyToOne(() => BookMotor, (bookMotor) => bookMotor.book_motor_items)
  @JoinColumn({ name: 'book_motor_id' })
  book_motor: BookMotor;

  @ManyToOne(() => Motor, (motor) => motor.book_motor_items)
  @JoinColumn({ name: 'motor_id' })
  motor: Motor;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  price: number;

  @Column()
  qty: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
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
