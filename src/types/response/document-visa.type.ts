import { EntryType, VisaType } from '../../modules/document-visas/entities/document-visa.entity';

export type DocumentCategoryResponse = {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  order_priority: number;
  is_active: boolean;
};

export type DocumentVisaTranslationResponse = {
  id: string;
  language_code: string;
  title: string;
  slug: string;
  description: string;
  terms_conditions?: string;
  submission_process?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentVisaPackageResponse = {
  id: string;
  name: Record<string, string> | string;
  name_i18n?: Record<string, string>;
  processing_time_days: number;
  embassy_fee: number;
  service_fee: number;
  total_price: number;
  description?: Record<string, string> | string;
  description_i18n?: Record<string, string>;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentVisaRequirementResponse = {
  id: string;
  name: Record<string, string> | string;
  name_i18n?: Record<string, string>;
  description?: Record<string, string> | string;
  description_i18n?: Record<string, string>;
  allowed_file_types: string;
  max_file_size_mb: number;
  is_mandatory: boolean;
  example_file_url?: string;
  order_priority: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentVisaData = {
  id: string;
  category_id: string;
  category_name?: string;
  country_id: string;
  country_name?: string;
  country?: {
    id: string;
    name: string;
    code?: string;
  };
  origin_country_id?: string;
  origin_country_name?: string;
  visa_type: VisaType;
  entry_type: EntryType;
  validity_days?: number;
  validity?: string;
  max_stay_days?: number;
  processing_time_days?: number;
  processing_time?: string;
  thumbnail?: string;
  images?: string[];
  is_interview_required: boolean;
  is_biometric_required: boolean;
  starting_price: number;
  is_active: boolean;
  title?: string;
  slug?: string;
  description?: string;
  terms_conditions?: string;
  submission_process?: string;
  translations?: DocumentVisaTranslationResponse[];
  packages?: DocumentVisaPackageResponse[];
  requirements?: DocumentVisaRequirementResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentVisaResponse = {
  message: string;
  data?: DocumentVisaData;
  datas?: DocumentVisaData[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
