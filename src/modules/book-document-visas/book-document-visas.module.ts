import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booker } from '../bookers/entities/booker.entity';
import { BookersModule } from '../bookers/bookers.module';
import { Customer } from '../customers/entities/customer.entity';
import { DocumentVisaPackage } from '../document-visas/entities/document-visa-package.entity';
import { DocumentVisaRequirement } from '../document-visas/entities/document-visa-requirement.entity';
import { DocumentVisa } from '../document-visas/entities/document-visa.entity';
import { BookDocumentApplicantFile } from './entities/book-document-applicant-file.entity';
import { BookDocumentVisaApplicant } from './entities/book-document-visa-applicant.entity';
import { BookDocumentVisaItem } from './entities/book-document-visa-item.entity';
import { BookDocumentVisaLog } from './entities/book-document-visa-log.entity';
import { BookDocumentVisa } from './entities/book-document-visa.entity';
import { BookDocumentVisasController } from './book-document-visas.controller';
import { BookDocumentVisasService } from './book-document-visas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookDocumentVisa,
      BookDocumentVisaItem,
      BookDocumentVisaApplicant,
      BookDocumentApplicantFile,
      BookDocumentVisaLog,
      DocumentVisa,
      DocumentVisaPackage,
      DocumentVisaRequirement,
      Customer,
      Booker,
    ]),
    BookersModule,
  ],
  controllers: [BookDocumentVisasController],
  providers: [BookDocumentVisasService],
  exports: [BookDocumentVisasService, TypeOrmModule],
})
export class BookDocumentVisasModule {}
