import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { SessionService } from '../../modules/session/session.service';
import { CustomerSession } from '../../modules/customers/entities/customer-session.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    @InjectRepository(CustomerSession)
    private readonly customerSessionRepository: Repository<CustomerSession>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid token format');
    }

    // hash token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Check User/Admin Session
    const session = await this.sessionService.findValidSession(tokenHash);

    if (session) {
      request['user'] = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role?.code,
        roleLevel: session.user.role?.level,
        permissions: session.user.role?.permissions || [],
      };
      request['token'] = token;
      return true;
    }

    // 2. Check Customer Session (for customer authentication)
    const customerSession = await this.customerSessionRepository.findOne({
      where: { token: tokenHash },
      relations: ['customer'],
    });

    if (
      customerSession &&
      (!customerSession.expiresAt || new Date() <= customerSession.expiresAt)
    ) {
      if (customerSession.customer && !customerSession.customer.deletedAt) {
        request['customer'] = {
          id: customerSession.customer.id,
          name: customerSession.customer.name,
          email: customerSession.customer.email,
          phone_number: customerSession.customer.phone_number,
          is_verified: customerSession.customer.is_verified,
        };
        request['token'] = token;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid or expired session');
  }
}
