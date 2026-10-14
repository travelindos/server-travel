import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint without @Roles or @Permissions -> allow
    if (!requiredRoles && !requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    const userPermissions: string[] = user.permissions || [];

    // Full access wildcard check ('*') or top-level role
    if (
      userPermissions.includes('*') ||
      user.role === 'owner' ||
      user.role === 'developer'
    ) {
      return true;
    }

    // Role check
    if (requiredRoles && requiredRoles.includes(user.role)) {
      return true;
    }

    // Permission check
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every((requiredPerm) =>
        userPermissions.some((userPerm) => {
          if (userPerm === '*') return true;
          if (userPerm === requiredPerm) return true;
          if (userPerm.endsWith(':*')) {
            const prefix = userPerm.slice(0, -2);
            return requiredPerm.startsWith(prefix);
          }
          return false;
        }),
      );

      if (hasPermission) return true;
    }

    throw new ForbiddenException(`Access denied for role '${user.role}'`);
  }
}
