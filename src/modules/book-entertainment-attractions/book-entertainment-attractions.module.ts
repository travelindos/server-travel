import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntertainmentAttractionsController } from './book-entertainment-attractions.controller';
import { BookEntertainmentAttractionsService } from './book-entertainment-attractions.service';
import { AutoCancelExpiredBookingsJob } from './jobs/auto-cancel-expired-bookings.job';
import { BookEntertainmentAttraction } from './entities/book-entertainment-attraction.entity';
import { BookEntertainmentAttractionItem } from './entities/book-entertainment-attraction-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Booker } from '../bookers/entities/booker.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import { User } from '../users/entities/user.entity';
import { EntertainmentAttraction } from '../entertainment-attractions/entities/entertainment-attraction.entity';
import { EntertainmentAttractionTicket } from '../entertainment-attractions/entities/entertainment-attraction-ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookEntertainmentAttraction,
      BookEntertainmentAttractionItem,
      EntertainmentAttraction,
      EntertainmentAttractionTicket,
      Customer,
      Booker,
      Tourist,
      User,
    ]),
  ],
  controllers: [BookEntertainmentAttractionsController],
  providers: [
    BookEntertainmentAttractionsService,
    AutoCancelExpiredBookingsJob,
  ],
  exports: [BookEntertainmentAttractionsService],
})
export class BookEntertainmentAttractionsModule {}
