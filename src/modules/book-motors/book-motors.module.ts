import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookMotorsService } from './book-motors.service';
import { BookMotorsController } from './book-motors.controller';
import { BookMotor } from './entities/book-motor.entity';
import { BookMotorItem } from './entities/book-motor-item.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import { Motor } from '../motors/entities/motor.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Booker } from '../bookers/entities/booker.entity';
import { AddOn } from '../add-ons/entities/add-on.entity';
import { BookingAddOn } from '../add-ons/entities/booking-add-on.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookMotor,
      BookMotorItem,
      Tourist,
      Motor,
      Customer,
      Booker,
      AddOn,
      BookingAddOn,
    ]),
  ],
  controllers: [BookMotorsController],
  providers: [BookMotorsService],
  exports: [BookMotorsService],
})
export class BookMotorsModule {}
