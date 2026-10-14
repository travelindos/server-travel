import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthGuard } from '../../common/middlewares/auth.guard';
import { RolesGuard } from '../../common/middlewares/role.guard';
import { SalesService } from './sales.service';
import { FilterSaleDto, FilterSalesReportDto } from './dto/filter-sale.dto';

@Controller('sales')
@UseGuards(AuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * GET /api/v1/sales
   * List all sales with pagination and filters
   */
  @Get()
  @Permissions('sales:read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: FilterSaleDto) {
    return this.salesService.findAll(query);
  }

  /**
   * GET /api/v1/sales/summary
   * High-level KPI metrics
   */
  @Get('summary')
  @Permissions('sales:read')
  @HttpCode(HttpStatus.OK)
  async getSummary(@Query() query: FilterSaleDto) {
    return this.salesService.getSummary(query);
  }

  /**
   * GET /api/v1/sales/reports?period=daily|weekly|monthly|yearly
   * Unified sales analytics and periodic aggregation
   */
  @Get('reports')
  @Permissions('sales:read')
  @HttpCode(HttpStatus.OK)
  async getReports(@Query() query: FilterSalesReportDto) {
    return this.salesService.getReports(query);
  }

  /**
   * GET /api/v1/sales/:id
   * Get single sale details
   */
  @Get(':id')
  @Permissions('sales:read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
