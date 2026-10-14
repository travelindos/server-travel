import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { BookToursModule } from './modules/book-tours/book-tours.module';
import { BookMotorsModule } from './modules/book-motors/book-motors.module';
import { BookEntertainmentAttractionsModule } from './modules/book-entertainment-attractions/book-entertainment-attractions.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DestinationModule } from './modules/destination/destination.module';
import { MotorsModule } from './modules/motors/motors.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SalesModule } from './modules/sales/sales.module';
import { SeedsModule } from './modules/seeds/seeds.module';
import { TouristsModule } from './modules/tourists/tourists.module';
import { RolesModule } from './modules/users/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { CustomerAuthModule } from './modules/customers/auth/customer-auth.module';
import { PermissionsModule } from './modules/users/permissions/permissions.module';
import { MereksModule } from './modules/motors/mereks/mereks.module';
import { CorrelationIdMiddleware } from './common/middlewares/correlation-id.middleware';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { BookersModule } from './modules/bookers/bookers.module';
import { EntertainmentAttractionsModule } from './modules/entertainment-attractions/entertainment-attractions.module';
import { DocumentVisasModule } from './modules/document-visas/document-visas.module';
import { BookDocumentVisasModule } from './modules/book-document-visas/book-document-visas.module';

import { IdempotencyModule } from './common/idempotency/idempotency.module';

@Module({
  imports: [
    CommonModule,
    IdempotencyModule,
    UsersModule,
    CustomerAuthModule,
    PermissionsModule,
    SeedsModule,
    LocationsModule,
    DestinationModule,
    EntertainmentAttractionsModule,
    DocumentVisasModule,
    ItineraryModule,
    BookersModule,
    BookToursModule,
    BookMotorsModule,
    BookEntertainmentAttractionsModule,
    BookDocumentVisasModule,
    TouristsModule,
    PaymentsModule,
    SalesModule,
    RolesModule,
    MotorsModule,
    MereksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply Correlation ID to ALL routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
