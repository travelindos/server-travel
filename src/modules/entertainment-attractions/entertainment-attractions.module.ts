import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from '../locations/entities/country.entity';
import { State } from '../locations/entities/state.entity';
import { CategoryEntertainment } from './entities/category-entertainment.entity';
import { EntertainmentAttractionTranslation } from './entities/entertainment-attraction-translation.entity';
import { EntertainmentAttractionTicket } from './entities/entertainment-attraction-ticket.entity';
import { EntertainmentAttraction } from './entities/entertainment-attraction.entity';
import { EntertainmentAttractionsController } from './entertainment-attractions.controller';
import { EntertainmentAttractionsService } from './entertainment-attractions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EntertainmentAttraction,
      EntertainmentAttractionTicket,
      CategoryEntertainment,
      EntertainmentAttractionTranslation,
      Country,
      State,
    ]),
  ],
  controllers: [EntertainmentAttractionsController],
  providers: [EntertainmentAttractionsService],
  exports: [EntertainmentAttractionsService],
})
export class EntertainmentAttractionsModule {}
