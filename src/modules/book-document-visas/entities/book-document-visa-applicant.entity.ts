import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tourist } from '../../tourists/entities/tourist.entity';
import { BookDocumentApplicantFile } from './book-document-applicant-file.entity';
import { BookDocumentVisa } from './book-document-visa.entity';

export enum ApplicantGender {
  MR = 'Mr',
  MRS = 'Mrs',
  MS = 'Ms',
}

export enum ApplicantStatus {
  PENDING_DOCUMENT = 'pending_document',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('book_document_visa_applicants')
export class BookDocumentVisaApplicant {
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

  @ManyToOne(() => BookDocumentVisa, (book) => book.applicants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_document_visa_id' })
  book_document_visa: BookDocumentVisa;

  @ManyToOne(() => Tourist, { nullable: true })
  @JoinColumn({ name: 'tourist_id' })
  tourist?: Tourist;

  @Column({ type: 'varchar', length: 150 })
  full_name: string;

  @Column({
    type: 'enum',
    enum: ApplicantGender,
    default: ApplicantGender.MR,
  })
  gender: ApplicantGender;

  @Column({ type: 'date', nullable: true })
  birth_date?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  birth_place?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  passport_number?: string;

  @Column({ type: 'date', nullable: true })
  passport_issue_date?: Date;

  @Column({ type: 'date', nullable: true })
  passport_expiry_date?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  visa_document_url?: string;

  @Column({
    type: 'enum',
    enum: ApplicantStatus,
    default: ApplicantStatus.PENDING_DOCUMENT,
  })
  status: ApplicantStatus;

  @OneToMany(() => BookDocumentApplicantFile, (file) => file.applicant, {
    cascade: true,
  })
  files: BookDocumentApplicantFile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
