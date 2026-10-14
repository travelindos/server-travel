import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Destination } from './destination.entity';

export enum Language {
  EN = 'en',
  ID = 'id',
  TR = 'tr',
}

@Entity('destination_translations')
@Index(['slug'])
@Index(['language_code', 'slug'])
export class DestinationTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Destination, (destination) => destination.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'destination_id' })
  destination: Destination;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: Language,
  })
  language_code: Language;

  @Column({
    type: 'json',
    nullable: true,
  })
  detail_tour: string[];

  @Column({
    type: 'json',
    nullable: true,
  })
  facilities: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
