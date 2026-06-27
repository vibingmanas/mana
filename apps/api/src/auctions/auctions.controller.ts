import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { AuctionSource, UserRole } from '@mana/db';
import { AuctionsService, type AuctionInput } from './auctions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class AlertDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsIn(Object.values(AuctionSource)) source?: string;
}
class CsvDto {
  @IsString() @Length(1, 500_000) csv!: string;
}
class CreateAuctionDto {
  @IsString() regNumber!: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1980) manufactureYear?: number;
  @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsIn(Object.values(AuctionSource)) source!: AuctionSource;
  @IsOptional() @IsString() sourceName?: string;
  @IsOptional() @IsInt() @Min(0) guidePrice?: number;
  @IsString() startsAt!: string;
}

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Get()
  list(
    @Query('source') source?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
  ) {
    return this.auctions.list({ source, state, city, status });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.auctions.get(id);
  }

  @Post('alerts')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  setAlert(@CurrentUser() user: AuthUser, @Body() dto: AlertDto) {
    return this.auctions.setAlert(user.userId, dto);
  }

  @Get('alerts/mine')
  @UseGuards(JwtAuthGuard)
  myAlerts(@CurrentUser() user: AuthUser) {
    return this.auctions.myAlerts(user.userId);
  }
}

@Controller('admin/auctions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAuctionDto) {
    return this.auctions.create(dto as AuctionInput);
  }

  @Post('import')
  @HttpCode(200)
  importCsv(@Body() dto: CsvDto) {
    return this.auctions.importCsv(dto.csv);
  }
}
