import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Session } from '../users/entities/session.entity';

@Injectable()
export class SessionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async findValidSession(tokenHash: string): Promise<any> {
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
      relations: ['user', 'user.role'],
    });

    if (!session) {
      this.logger.error('SessionService: Token not found in DB');
      return null;
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      this.logger.error(
        'SessionService: Session expired. Current:',
        new Date(),
        'Expires:',
        session.expiresAt,
      );
      await this.sessionRepository.remove(session);
      return null;
    }
    return session;
  }

  async createSession(
    user: any,
    tokenHash: string,
    expiresAt: Date,
    ip: string,
  ): Promise<any> {
    const session = this.sessionRepository.create({
      token: tokenHash,
      user: user,
      expiresAt: expiresAt,
      ip: ip,
    });
    return this.sessionRepository.save(session);
  }

  async removeSession(tokenHash: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
    });

    if (!session) {
      this.logger.error('SessionService: Token not found in DB');
      return;
    }
    await this.sessionRepository.remove(session);
  }
}
