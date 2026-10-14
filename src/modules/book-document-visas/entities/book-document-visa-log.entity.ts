import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BookDocumentVisa } from './book-document-visa.entity';

@Entity('book_document_visa_logs')
export class BookDocumentVisaLog {
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

  @ManyToOne(() => BookDocumentVisa, (book) => book.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_document_visa_id' })
  book_document_visa: BookDocumentVisa;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'boolean', default: true })
  is_visible_to_customer: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
