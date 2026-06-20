import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { UserRole } from '@mana/db';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class SubscribeDto {
  @IsIn(['starter', 'growth', 'pro']) planKey!: string;
}

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('billing/plans')
  plans() {
    return this.billing.listPlans();
  }

  @Post('billing/subscribe')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.billing.subscribe(user.userId, dto.planKey);
  }

  @Get('billing/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  subscription(@CurrentUser() user: AuthUser) {
    return this.billing.mySubscription(user.userId);
  }

  @Get('billing/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  invoices(@CurrentUser() user: AuthUser) {
    return this.billing.invoices(user.userId);
  }

  @Post('billing/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  cancel(@CurrentUser() user: AuthUser) {
    return this.billing.cancel(user.userId);
  }

  @Get('admin/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  revenue() {
    return this.billing.revenue();
  }
}
