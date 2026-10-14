import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentVisa } from './document-visa.entity';

@Entity('documents_visa_translations')
export class DocumentVisaTranslation {
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

  @ManyToOne(() => DocumentVisa, (doc) => doc.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_visa_id' })
  document_visa: DocumentVisa;

  @Column({ type: 'varchar', length: 5 })
  language_code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  terms_conditions?: string;

  @Column({ type: 'text', nullable: true })
  submission_process?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
