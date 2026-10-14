import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerAuthData } from '../../types/response/customers.type';

export const GetCustomer = createParamDecorator(
  (data: keyof CustomerAuthData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const customer = request.customer as CustomerAuthData;

    return data ? customer?.[data] : customer;
  },
);
