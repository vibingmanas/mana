import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { LeadIntent, UserRole } from '@mana/db';
import { BuyersService } from './buyers.service';
import { CreateLeadDto, SavedSearchDto, WishlistDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class BuyersController {
  constructor(private readonly buyers: BuyersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.buyers.me(user.userId);
  }

  @Post('leads')
  @HttpCode(201)
  createLead(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.buyers.createLead(
      user.userId,
      dto.vehicleId,
      dto.intent ?? LeadIntent.ENQUIRY,
      dto.note,
    );
  }

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser) {
    return this.buyers.listLeads(user.userId);
  }

  @Post('wishlist')
  @HttpCode(200)
  addWishlist(@CurrentUser() user: AuthUser, @Body() dto: WishlistDto) {
    return this.buyers.addWishlist(user.userId, dto.vehicleId);
  }

  @Delete('wishlist/:vehicleId')
  removeWishlist(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.buyers.removeWishlist(user.userId, vehicleId);
  }

  @Get('wishlist')
  listWishlist(@CurrentUser() user: AuthUser) {
    return this.buyers.listWishlist(user.userId);
  }

  @Post('saved-searches')
  @HttpCode(201)
  createSavedSearch(@CurrentUser() user: AuthUser, @Body() dto: SavedSearchDto) {
    return this.buyers.createSavedSearch(user.userId, dto.query, dto.alertChannel ?? 'none');
  }

  @Get('saved-searches')
  listSavedSearches(@CurrentUser() user: AuthUser) {
    return this.buyers.listSavedSearches(user.userId);
  }

  @Delete('saved-searches/:id')
  deleteSavedSearch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buyers.deleteSavedSearch(user.userId, id);
  }

  // ── Account, Pro, reports ──
  @Get('account')
  account(@CurrentUser() user: AuthUser) {
    return this.buyers.account(user.userId);
  }

  @Get('pro')
  pro(@CurrentUser() user: AuthUser) {
    return this.buyers.getSubscription(user.userId);
  }

  @Post('pro/subscribe')
  @HttpCode(200)
  subscribePro(@CurrentUser() user: AuthUser) {
    return this.buyers.subscribePro(user.userId);
  }

  @Post('pro/cancel')
  @HttpCode(200)
  cancelPro(@CurrentUser() user: AuthUser) {
    return this.buyers.cancelPro(user.userId);
  }

  @Get('reports')
  reports(@CurrentUser() user: AuthUser) {
    return this.buyers.listReports(user.userId);
  }

  @Get('reports/:vehicleId/access')
  reportAccess(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.buyers.reportAccess(user.userId, vehicleId);
  }

  @Post('reports/:vehicleId')
  @HttpCode(201)
  purchaseReport(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.buyers.purchaseReport(user.userId, vehicleId);
  }
}
