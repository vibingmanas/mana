import { Controller, Get, Param, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { SearchListingsDto } from './dto';

/** Public, unauthenticated browse + listing detail. */
@Controller('listings')
export class ListingsController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  search(@Query() query: SearchListingsDto) {
    return this.vehicles.search(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.vehicles.getListing(id);
  }
}
