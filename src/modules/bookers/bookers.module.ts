import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booker } from './entities/booker.entity';
import { BookersController } from './bookers.controller';
import { BookersService } from './bookers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booker])],
  controllers: [BookersController],
  providers: [BookersService],
  exports: [BookersService],
})
export class BookersModule {}
