import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookToursModule } from '../book-tours/book-tours.module';
import { BookMotorsModule } from '../book-motors/book-motors.module';
import { BookEntertainmentAttractionsModule } from '../book-entertainment-attractions/book-entertainment-attractions.module';
import { BookDocumentVisasModule } from '../book-document-visas/book-document-visas.module';
import { Customer } from '../customers/entities/customer.entity';
import { TouristsModule } from '../tourists/tourists.module';
import { UsersModule } from '../users/users.module';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaypalService } from './paypal.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaypalService],
  imports: [
    TypeOrmModule.forFeature([Payment, Customer]),
    BookToursModule,
    BookMotorsModule,
    BookEntertainmentAttractionsModule,
    BookDocumentVisasModule,
    UsersModule,
    TouristsModule,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
