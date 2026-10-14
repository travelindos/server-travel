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

@Entity('document_visa_requirements')
export class DocumentVisaRequirement {
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

  @ManyToOne(() => DocumentVisa, (doc) => doc.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_visa_id' })
  document_visa: DocumentVisa;

  @Column({ type: 'json' })
  name: any;

  @Column({ type: 'json', nullable: true })
  description?: any;

  @Column({ type: 'varchar', length: 100, default: 'pdf,jpg,jpeg,png' })
  allowed_file_types: string;

  @Column({ type: 'int', default: 5 })
  max_file_size_mb: number;

  @Column({ type: 'boolean', default: true })
  is_mandatory: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  example_file_url?: string;

  @Column({ type: 'int', default: 0 })
  order_priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
