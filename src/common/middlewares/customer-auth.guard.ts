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
import { CustomerSession } from '../../modules/customers/entities/customer-session.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
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

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await this.customerSessionRepository.findOne({
      where: { token: tokenHash },
      relations: ['customer'],
    });

    if (!session || (session.expiresAt && new Date() > session.expiresAt)) {
      throw new UnauthorizedException('Access token tidak valid atau sudah kedaluwarsa');
    }

    if (!session.customer || session.customer.deletedAt) {
      throw new UnauthorizedException('Customer account disabled or not found');
    }

    request['customer'] = {
      id: session.customer.id,
      name: session.customer.name,
      email: session.customer.email,
      phone_number: session.customer.phone_number,
      is_verified: session.customer.is_verified,
    };

    request['token'] = token;

    return true;
  }
}
