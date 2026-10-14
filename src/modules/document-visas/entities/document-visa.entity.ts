import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country } from '../../locations/entities/country.entity';
import { DocumentCategory } from './document-category.entity';
import { DocumentVisaPackage } from './document-visa-package.entity';
import { DocumentVisaRequirement } from './document-visa-requirement.entity';
import { DocumentVisaTranslation } from './document-visa-translation.entity';

export enum VisaType {
  TOURIST = 'tourist',
  BUSINESS = 'business',
  STUDY = 'study',
  TRANSIT = 'transit',
  UMRAH_HAJJ = 'umrah_hajj',
  PASSPORT_NEW = 'passport_new',
  PASSPORT_RENEWAL = 'passport_renewal',
  OTHER = 'other',
}

export enum EntryType {
  SINGLE_ENTRY = 'single_entry',
  MULTIPLE_ENTRY = 'multiple_entry',
  NOT_APPLICABLE = 'not_applicable',
}

@Entity('documents_visa')
export class DocumentVisa {
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

  @ManyToOne(() => DocumentCategory, (cat) => cat.document_visas)
  @JoinColumn({ name: 'category_id' })
  category: DocumentCategory;

  // Destination country
  @ManyToOne(() => Country)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  // Citizen / Passport origin country (optional, default Indonesia)
  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'origin_country_id' })
  origin_country?: Country;

  @Column({
    type: 'enum',
    enum: VisaType,
    default: VisaType.TOURIST,
  })
  visa_type: VisaType;

  @Column({
    type: 'enum',
    enum: EntryType,
    default: EntryType.SINGLE_ENTRY,
  })
  entry_type: EntryType;

  @Column({ type: 'int', nullable: true })
  validity_days?: number;

  @Column({ type: 'int', nullable: true })
  max_stay_days?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'boolean', default: false })
  is_interview_required: boolean;

  @Column({ type: 'boolean', default: false })
  is_biometric_required: boolean;

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
  starting_price: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => DocumentVisaTranslation, (trans) => trans.document_visa, {
    cascade: true,
  })
  translations: DocumentVisaTranslation[];

  @OneToMany(() => DocumentVisaPackage, (pkg) => pkg.document_visa, {
    cascade: true,
  })
  packages: DocumentVisaPackage[];

  @OneToMany(() => DocumentVisaRequirement, (req) => req.document_visa, {
    cascade: true,
  })
  requirements: DocumentVisaRequirement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
