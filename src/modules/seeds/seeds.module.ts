import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryDestination } from '../destination/entities/category_destination.entity';
import { LocationsModule } from '../locations/locations.module';
import { Merek } from '../motors/entities/merek.entity';
import { Motor } from '../motors/entities/motor.entity';
import { MotorTranslation } from '../motors/entities/motor-translation.entity';
import { Variant } from '../motors/entities/variant.entity';
import { MotorPrice } from '../motors/entities/motor-price.entity';
import { State } from '../locations/entities/state.entity';
import { Country } from '../locations/entities/country.entity';
import { Permission } from '../users/entities/permission.entity';
import { Roles } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { DocumentCategory } from '../document-visas/entities/document-category.entity';
import { SeedsService } from './seeds.service';

@Module({
  imports: [
    LocationsModule,
    TypeOrmModule.forFeature([
      Roles,
      Permission,
      User,
      CategoryDestination,
      Merek,
      Motor,
      MotorTranslation,
      Variant,
      MotorPrice,
      State,
      Country,
      DocumentCategory,
    ]),
  ],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}
