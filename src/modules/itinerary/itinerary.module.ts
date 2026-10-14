import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { DestinationModule } from '../destination/destination.module';
import { ItineraryItem } from './entities/itinerary-item.entity';
import { Itinerary } from './entities/itinerary.entity';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Itinerary, ItineraryItem, Customer]),
    DestinationModule,
  ],
  controllers: [ItineraryController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
