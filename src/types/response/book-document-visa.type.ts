import { StatusBookDocumentVisa } from '../../modules/book-document-visas/entities/book-document-visa.entity';
import {
  ApplicantGender,
  ApplicantStatus,
} from '../../modules/book-document-visas/entities/book-document-visa-applicant.entity';
import { FileReviewStatus } from '../../modules/book-document-visas/entities/book-document-applicant-file.entity';

export type BookDocumentApplicantFileResponse = {
  id: string;
  requirement_id: string;
  requirement_name?: string;
  file_url: string;
  file_name: string;
  file_size_bytes?: number;
  review_status: FileReviewStatus;
  rejection_note?: string;
  reviewed_at?: Date;
  created_at: Date;
};

export type BookDocumentApplicantResponse = {
  id: string;
  tourist_id?: string;
  full_name: string;
  gender: ApplicantGender;
  birth_date?: Date;
  birth_place?: string;
  nationality?: string;
  passport_number?: string;
  passport_issue_date?: Date;
  passport_expiry_date?: Date;
  occupation?: string;
  visa_document_url?: string;
  status: ApplicantStatus;
  files: BookDocumentApplicantFileResponse[];
  created_at: Date;
};

export type BookDocumentVisaItemResponse = {
  id: string;
  document_visa_id?: string;
  package_id?: string;
  package_name?: string;
  unit_price: number;
  qty: number;
  subtotal: number;
  created_at: Date;
};

export type BookDocumentVisaData = {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  booker_id?: string;
  booker_name?: string;
  booker_email?: string;
  booker_phone?: string;
  user_id?: string;
  user_name?: string;
  document_visa_id: string;
  document_visa_title?: string;
  country_name?: string;
  package_id: string;
  package_name?: string;
  processing_time_days?: number;
  applicant_count: number;
  unit_price: number;
  total_price: number;
  target_travel_date?: Date;
  status: StatusBookDocumentVisa;
  appointment_date?: Date;
  appointment_location?: string;
  embassy_application_id?: string;
  tracking_number?: string;
  shipping_address?: string;
  note?: string | null;
  rejection_reason?: string;
  admin_notes?: string;
  expired_at?: Date;
  items?: BookDocumentVisaItemResponse[];
  applicants: BookDocumentApplicantResponse[];
  created_at: Date;
  updated_at: Date;
};

export type BookDocumentVisaResponse = {
  message: string;
  data?: BookDocumentVisaData;
  datas?: BookDocumentVisaData[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
