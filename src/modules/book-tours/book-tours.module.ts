import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddOn } from '../add-ons/entities/add-on.entity';
import { BookingAddOn } from '../add-ons/entities/booking-add-on.entity';
import { Customer } from '../customers/entities/customer.entity';
import { DestinationModule } from '../destination/destination.module';
import { Itinerary } from '../itinerary/entities/itinerary.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import { Booker } from '../bookers/entities/booker.entity';
import { BookersModule } from '../bookers/bookers.module';
import { BookToursController } from './book-tours.controller';
import { BookToursService } from './book-tours.service';
import { BookTour } from './entities/book-tour.entity';

@Module({
  controllers: [BookToursController],
  providers: [BookToursService],
  imports: [
    TypeOrmModule.forFeature([
      BookTour,
      Itinerary,
      Customer,
      Tourist,
      AddOn,
      BookingAddOn,
      Booker,
    ]),
    DestinationModule,
    BookersModule,
  ],
  exports: [BookToursService],
})
export class BookToursModule {}
