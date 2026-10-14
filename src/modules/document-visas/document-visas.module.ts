import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from '../locations/entities/country.entity';
import { DocumentVisasController } from './document-visas.controller';
import { DocumentVisasService } from './document-visas.service';
import { DocumentCategory } from './entities/document-category.entity';
import { DocumentVisaPackage } from './entities/document-visa-package.entity';
import { DocumentVisaRequirement } from './entities/document-visa-requirement.entity';
import { DocumentVisaTranslation } from './entities/document-visa-translation.entity';
import { DocumentVisa } from './entities/document-visa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentCategory,
      DocumentVisa,
      DocumentVisaTranslation,
      DocumentVisaPackage,
      DocumentVisaRequirement,
      Country,
    ]),
  ],
  controllers: [DocumentVisasController],
  providers: [DocumentVisasService],
  exports: [DocumentVisasService, TypeOrmModule],
})
export class DocumentVisasModule {}
