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
import { BookDocumentVisa } from './book-document-visa.entity';
import { DocumentVisa } from '../../document-visas/entities/document-visa.entity';
import { DocumentVisaPackage } from '../../document-visas/entities/document-visa-package.entity';

@Entity('book_document_visa_items')
export class BookDocumentVisaItem {
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

  @ManyToOne(() => BookDocumentVisa, (book) => book.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_document_visa_id' })
  book_document_visa: BookDocumentVisa;

  @ManyToOne(() => DocumentVisa, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_visa_id' })
  document_visa?: DocumentVisa;

  @ManyToOne(() => DocumentVisaPackage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'package_id' })
  package?: DocumentVisaPackage;

  @Column({ type: 'varchar', length: 255, nullable: true })
  package_name?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : 0),
    },
  })
  unit_price: number;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : 0),
    },
  })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date;
}
