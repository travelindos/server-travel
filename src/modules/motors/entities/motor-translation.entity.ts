import Hashids from 'hashids';
import { BeforeInsert, Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Motor } from './motor.entity';

@Entity('motor_translations')
export class MotorTranslation {
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

  @ManyToOne(() => Motor, (motor) => motor.translations)
  @JoinColumn({ name: 'motor_id' })
  motor: Motor;

  @Index()
  @Column()
  language_code: string;

  @Column()
  name_motor: string;

  @Index()
  @Column()
  slug: string;

  @Column()
  description: string;

  @CreateDateColumn()
  created_at:Date;

  @UpdateDateColumn()
  updated_at:Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deleted_at:Date;
}
