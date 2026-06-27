import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { SellService } from './sell.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class EstimateDto {
  @IsOptional() @IsString() regNumber?: string;
  @IsString() @Length(1, 60) make!: string;
  @IsString() @Length(1, 60) model!: string;
  @IsInt() @Min(1980) @Max(2100) manufactureYear!: number;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @IsString() transmission?: string;
  @IsInt() @Min(0) @Max(1_000_000) odometerKm!: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) ownersCount?: number;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsBoolean() accidentDamage?: boolean;
}
class BookDto {
  @IsOptional() @IsString() when?: string;
}
class RenegotiateDto {
  @IsInt() @Min(1000) @Max(100_000_000) counterAmount!: number;
  @IsOptional() @IsString() @Length(0, 500) comment?: string;
}
class RejectDto {
  @IsOptional() @IsString() @Length(0, 500) comment?: string;
}

@Controller('sell')
@UseGuards(JwtAuthGuard)
export class SellController {
  constructor(private readonly sell: SellService) {}

  @Post('estimate')
  @HttpCode(201)
  estimate(@CurrentUser() user: AuthUser, @Body() dto: EstimateDto) {
    return this.sell.estimate(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.sell.listMine(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sell.get(user.userId, id);
  }

  @Post(':id/book-inspection')
  @HttpCode(200)
  book(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: BookDto) {
    return this.sell.bookInspection(user.userId, id, dto.when);
  }

  @Post(':id/offers/:offerId/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
  ) {
    return this.sell.acceptOffer(user.userId, id, offerId);
  }

  @Post(':id/offers/:offerId/renegotiate')
  @HttpCode(200)
  renegotiate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: RenegotiateDto,
  ) {
    return this.sell.renegotiateOffer(user.userId, id, offerId, dto.counterAmount, dto.comment);
  }

  @Post(':id/offers/:offerId/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: RejectDto,
  ) {
    return this.sell.rejectOffer(user.userId, id, offerId, dto.comment);
  }
}
