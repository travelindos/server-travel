import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAuthGuard } from '../../../common/middlewares/customer-auth.guard';
import { CustomerSession } from '../entities/customer-session.entity';
import { Customer } from '../entities/customer.entity';
import { CustomerProfile } from '../entities/customer-profile.entity';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerSession, CustomerProfile])],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerAuthGuard],
  exports: [CustomerAuthService, CustomerAuthGuard],
})
export class CustomerAuthModule {}
