import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentVisaRequirement } from '../../document-visas/entities/document-visa-requirement.entity';
import { User } from '../../users/entities/user.entity';
import { BookDocumentVisaApplicant } from './book-document-visa-applicant.entity';

export enum FileReviewStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('book_document_applicant_files')
export class BookDocumentApplicantFile {
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

  @ManyToOne(() => BookDocumentVisaApplicant, (app) => app.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicant_id' })
  applicant: BookDocumentVisaApplicant;

  @ManyToOne(() => DocumentVisaRequirement)
  @JoinColumn({ name: 'requirement_id' })
  requirement: DocumentVisaRequirement;

  @Column({ type: 'varchar', length: 500 })
  file_url: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'bigint', nullable: true })
  file_size_bytes?: number;

  @Column({
    type: 'enum',
    enum: FileReviewStatus,
    default: FileReviewStatus.PENDING,
  })
  review_status: FileReviewStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rejection_note?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  @Column({ type: 'datetime', nullable: true })
  reviewed_at?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
