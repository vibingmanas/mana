import { Controller, Get, Param, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { SearchService } from '../search/search.service';
import { SearchListingsDto } from './dto';

/** Public, unauthenticated browse + listing detail. */
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly search: SearchService,
  ) {}

  @Get()
  searchListings(@Query() query: SearchListingsDto) {
    return this.search.searchListings(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.vehicles.getListing(id);
  }
}
