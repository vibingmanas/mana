import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from '@mana/db';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class ApplyFinanceDto {
  @IsString() vehicleId!: string;
  @IsInt() @Min(10000) amount!: number;
  @IsInt() @Min(0) downPayment!: number;
  @IsInt() @Min(1) tenureMonths!: number;
}
class QuoteDto {
  @IsString() vehicleId!: string;
}
class RcOpenDto {
  @IsString() vehicleId!: string;
}
class EmiQuery {
  @Type(() => Number) @IsInt() price!: number;
  @Type(() => Number) @IsOptional() @IsInt() downPayment?: number;
  @Type(() => Number) @IsOptional() rate?: number;
  @Type(() => Number) @IsOptional() @IsInt() tenure?: number;
}

@Controller()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  // Public EMI calculator.
  @Get('finance/emi')
  emi(@Query() q: EmiQuery) {
    return this.finance.emiCalc(q.price, q.downPayment ?? 0, q.rate ?? 11.99, q.tenure ?? 60);
  }

  // ── Buyer ──
  @Post('finance/applications')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyFinanceDto) {
    return this.finance.applyFinance(
      user.userId,
      dto.vehicleId,
      dto.amount,
      dto.downPayment,
      dto.tenureMonths,
    );
  }

  @Get('finance/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  listFinance(@CurrentUser() user: AuthUser) {
    return this.finance.listFinance(user.userId);
  }

  @Post('insurance/quotes')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return this.finance.quoteInsurance(user.userId, dto.vehicleId);
  }

  @Post('insurance/policies/:id/purchase')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  purchase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.finance.purchaseInsurance(user.userId, id);
  }

  @Post('rc-transfer')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  openRc(@CurrentUser() user: AuthUser, @Body() dto: RcOpenDto) {
    return this.finance.openRcTransfer(user.userId, dto.vehicleId);
  }

  // ── Dealer ──
  @Post('rc-transfer/:id/advance')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  advanceRc(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.finance.advanceRcTransfer(user.userId, id);
  }

  @Get('dealer/rc-transfers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  listRc(@CurrentUser() user: AuthUser) {
    return this.finance.listRcForDealer(user.userId);
  }

  // ── Admin ──
  @Get('admin/referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  referrals() {
    return this.finance.referrals();
  }
}
