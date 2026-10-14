import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BookEntertainmentAttraction,
  StatusBookEntertainmentAttraction,
} from '../entities/book-entertainment-attraction.entity';

@Injectable()
export class AutoCancelExpiredBookingsJob
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AutoCancelExpiredBookingsJob.name);
  private timer: NodeJS.Timeout | null = null;

  // Interval execution: every 15 minutes (900,000 ms)
  private readonly INTERVAL_MS = 15 * 60 * 1000;

  constructor(
    @InjectRepository(BookEntertainmentAttraction)
    private readonly bookingRepository: Repository<BookEntertainmentAttraction>,
  ) {}

  onApplicationBootstrap() {
    this.logger.log(
      'Initializing AutoCancelExpiredBookingsJob (Interval: 15 minutes)...',
    );

    // Initial run on boot
    this.executeCleanup().catch((err) => {
      this.logger.error(`Error during initial cleanup: ${err.message}`);
    });

    // Schedule periodic execution
    this.timer = setInterval(() => {
      this.executeCleanup().catch((err) => {
        this.logger.error(`Error during scheduled cleanup: ${err.message}`);
      });
    }, this.INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('AutoCancelExpiredBookingsJob stopped.');
    }
  }

  /**
   * Scans and cancels bookings in DRAFT or PENDING status whose expired_at <= NOW()
   */
  async executeCleanup(): Promise<number> {
    try {
      const result = await this.bookingRepository
        .createQueryBuilder()
        .update(BookEntertainmentAttraction)
        .set({ status: StatusBookEntertainmentAttraction.CANCELLED })
        .where('status IN (:...statuses)', {
          statuses: [
            StatusBookEntertainmentAttraction.DRAFT,
            StatusBookEntertainmentAttraction.PENDING,
          ],
        })
        .andWhere('expired_at IS NOT NULL AND expired_at <= NOW()')
        .execute();

      const affected = result.affected || 0;
      if (affected > 0) {
        this.logger.log(
          `Auto-cancelled ${affected} expired booking(s) successfully.`,
        );
      }
      return affected;
    } catch (error: any) {
      this.logger.error(
        `Failed to auto-cancel expired bookings: ${error?.message}`,
      );
      return 0;
    }
  }
}
