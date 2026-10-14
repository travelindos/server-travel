import Hashids from 'hashids';
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
  VersionColumn,
} from 'typeorm';
import { Booker } from '../../bookers/entities/booker.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { DocumentVisaPackage } from '../../document-visas/entities/document-visa-package.entity';
import { DocumentVisa } from '../../document-visas/entities/document-visa.entity';
import { User } from '../../users/entities/user.entity';
import { BookDocumentVisaApplicant } from './book-document-visa-applicant.entity';
import { BookDocumentVisaItem } from './book-document-visa-item.entity';
import { BookDocumentVisaLog } from './book-document-visa-log.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum StatusBookDocumentVisa {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  DOCUMENTS_SUBMITTED = 'documents_submitted',
  UNDER_REVIEW = 'under_review',
  REVISION_REQUIRED = 'revision_required',
  SUBMITTED_TO_EMBASSY = 'submitted_to_embassy',
  APPOINTMENT_SCHEDULED = 'appointment_scheduled',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('book_documents_visa')
@Index(['customer', 'status'])
@Index(['customer', 'createdAt'])
@Index(['user', 'status'])
@Index(['status', 'createdAt'])
export class BookDocumentVisa {
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

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ManyToOne(() => Booker, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booker_id' })
  booker?: Booker;

  // PIC Admin / Visa Consultant handling this case
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => DocumentVisa)
  @JoinColumn({ name: 'document_visa_id' })
  document_visa: DocumentVisa;

  @ManyToOne(() => DocumentVisaPackage)
  @JoinColumn({ name: 'package_id' })
  package: DocumentVisaPackage;

  @Column({ type: 'int', default: 1 })
  applicant_count: number;

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
  total_price: number;

  @Column({ type: 'date', nullable: true })
  target_travel_date?: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: StatusBookDocumentVisa,
    default: StatusBookDocumentVisa.DRAFT,
  })
  status: StatusBookDocumentVisa;

  @Column({ type: 'datetime', nullable: true })
  appointment_date?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appointment_location?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  embassy_application_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number?: string;

  @Column({ type: 'text', nullable: true })
  shipping_address?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  @Column({ type: 'text', nullable: true })
  admin_notes?: string;

  @Index()
  @Column({ type: 'datetime', nullable: true })
  expired_at?: Date;

  @VersionColumn({ default: 1 })
  version: number;

  @OneToMany(() => BookDocumentVisaItem, (item) => item.book_document_visa, {
    cascade: true,
  })
  items: BookDocumentVisaItem[];

  @OneToMany(() => BookDocumentVisaApplicant, (app) => app.book_document_visa, {
    cascade: true,
  })
  applicants: BookDocumentVisaApplicant[];

  @OneToMany(() => BookDocumentVisaLog, (log) => log.book_document_visa, {
    cascade: true,
  })
  logs: BookDocumentVisaLog[];

  @OneToMany(() => Payment, (payment) => payment.bookDocumentVisa)
  payments: Payment[];

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
