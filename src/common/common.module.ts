import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookTour } from '../modules/book-tours/entities/book-tour.entity';
import { Booker } from '../modules/bookers/entities/booker.entity';
import { Country } from '../modules/locations/entities/country.entity';
import { State } from '../modules/locations/entities/state.entity';
import { City } from '../modules/locations/entities/city.entity';
import { CategoryDestination } from '../modules/destination/entities/category_destination.entity';
import { DestinationTranslation } from '../modules/destination/entities/destination-translation.entity';
import { Destination } from '../modules/destination/entities/destination.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { BookEntertainmentAttraction } from '../modules/book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { BookEntertainmentAttractionItem } from '../modules/book-entertainment-attractions/entities/book-entertainment-attraction-item.entity';
import { EntertainmentAttraction } from '../modules/entertainment-attractions/entities/entertainment-attraction.entity';
import { EntertainmentAttractionTicket } from '../modules/entertainment-attractions/entities/entertainment-attraction-ticket.entity';
import { EntertainmentAttractionTranslation } from '../modules/entertainment-attractions/entities/entertainment-attraction-translation.entity';
import { CategoryEntertainment } from '../modules/entertainment-attractions/entities/category-entertainment.entity';
import { Tourist } from '../modules/tourists/entities/tourist.entity';
import { Profile } from '../modules/users/entities/profile.entity';
import { Roles } from '../modules/users/entities/role.entity';
import { Session } from '../modules/users/entities/session.entity';
import { User } from '../modules/users/entities/user.entity';
import { SessionModule } from '../modules/session/session.module';
import { EmailService } from './emails/emails.service';
import { ErrorsService } from './errors/errors.service';
import { AuthGuard } from './middlewares/auth.guard';
import { RolesGuard } from './middlewares/role.guard';
import { Motor } from '../modules/motors/entities/motor.entity';
import { Merek } from '../modules/motors/entities/merek.entity';
import { Variant } from '../modules/motors/entities/variant.entity';
import { MotorTranslation } from '../modules/motors/entities/motor-translation.entity';
import { MotorPrice } from '../modules/motors/entities/motor-price.entity';
import { AddOn } from '../modules/add-ons/entities/add-on.entity';
import { BookMotor } from '../modules/book-motors/entities/book-motor.entity';
import { BookingAddOn } from '../modules/add-ons/entities/booking-add-on.entity';
import { LoggerModule } from './logger/logger.module';
import { BookMotorItem } from '../modules/book-motors/entities/book-motor-item.entity';

import { Permission } from '../modules/users/entities/permission.entity';
import { Customer } from '../modules/customers/entities/customer.entity';
import { CustomerSession } from '../modules/customers/entities/customer-session.entity';
import { CustomerAuthGuard } from './middlewares/customer-auth.guard';
import { LoggingInterceptor } from './middlewares/logging.interceptor';
import { Itinerary } from '../modules/itinerary/entities/itinerary.entity';
import { ItineraryItem } from '../modules/itinerary/entities/itinerary-item.entity';

@Global()
@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: Number(configService.get<string>('DATABASE_PORT')),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        charset: 'utf8mb4',
        ssl: false,
        extra: {
          connectionLimit: 10,
          collation: 'utf8mb4_0900_ai_ci',
          ssl: false,
        },
        connectTimeout: 60000,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Session,
      Roles,
      Permission,
      Customer,
      CustomerSession,
      Country,
      State,
      City,
      Destination,
      CategoryDestination,
      DestinationTranslation,
      BookTour,
      Booker,
      Tourist,
      Payment,
      EntertainmentAttraction,
      EntertainmentAttractionTicket,
      EntertainmentAttractionTranslation,
      CategoryEntertainment,
      BookEntertainmentAttraction,
      BookEntertainmentAttractionItem,
      Profile,
      Motor,
      Merek,
      Variant,
      MotorTranslation,
      MotorPrice,
      AddOn,
      BookMotor,
      BookingAddOn,
      BookMotorItem,
      Itinerary,
      ItineraryItem,
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    SessionModule,
  ],
  providers: [ErrorsService, EmailService, AuthGuard, RolesGuard, CustomerAuthGuard, LoggingInterceptor],
  exports: [
    TypeOrmModule,
    ThrottlerModule,
    EmailService,
    AuthGuard,
    RolesGuard,
    CustomerAuthGuard,
    ErrorsService,
    LoggingInterceptor,
  ],
})
export class CommonModule {}
