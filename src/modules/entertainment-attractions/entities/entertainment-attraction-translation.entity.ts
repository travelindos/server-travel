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
import { EntertainmentAttraction } from './entertainment-attraction.entity';

export enum Language {
  EN = 'en',
  ID = 'id',
  TR = 'tr',
}

@Entity('entertainment_attraction_translations')
@Index(['slug'])
@Index(['language_code', 'slug'])
export class EntertainmentAttractionTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => EntertainmentAttraction,
    (attraction) => attraction.translations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'entertainment_attraction_id' })
  attraction: EntertainmentAttraction;

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
    default: Language.EN,
  })
  language_code: Language;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({
    nullable: true,
  })
  deletedAt: Date;
}
