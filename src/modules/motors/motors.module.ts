import { Module } from '@nestjs/common';
import { MotorsService } from './motors.service';
import { MotorsController } from './motors.controller';
import { MereksModule } from './mereks/mereks.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Motor } from './entities/motor.entity';
import { Merek } from './entities/merek.entity';
import { State } from '../locations/entities/state.entity';
import { Country } from '../locations/entities/country.entity';
import { MotorTranslation } from './entities/motor-translation.entity';
import { Variant } from './entities/variant.entity';
import { MotorPrice } from './entities/motor-price.entity';

@Module({
  controllers: [MotorsController],
  providers: [MotorsService],
  imports: [
    TypeOrmModule.forFeature([
      Motor,
      Merek,
      State,
      Country,
      MotorTranslation,
      Variant,
      MotorPrice,
    ]),
    MereksModule,
  ],
})
export class MotorsModule {}
