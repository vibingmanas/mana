import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { DisputeStatus, UserRole } from '@mana/db';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { ListDealersQuery, ModerateListingDto, SetDealerStatusDto, SetTierDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { BlocklistService } from '../moderation/blocklist.service';
import { FeatureFlagsService } from '../moderation/feature-flags.service';
import { DisputesService } from '../moderation/disputes.service';
import { AuthService } from '../auth/auth.service';
import { SearchService } from '../search/search.service';

class BlocklistAddDto {
  @IsIn(['phone', 'pan', 'gstin', 'reg_number']) kind!: string;
  @IsString() @Length(2, 60) value!: string;
  @IsOptional() @IsString() reason?: string;
}
class FlagDto {
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() description?: string;
}
class ResolveDisputeDto {
  @IsIn([DisputeStatus.RESOLVED, DisputeStatus.REJECTED]) status!: DisputeStatus;
  @IsString() @Length(2, 1000) resolution!: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly blocklist: BlocklistService,
    private readonly flags: FeatureFlagsService,
    private readonly disputes: DisputesService,
    private readonly auth: AuthService,
    private readonly search: SearchService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('dealers')
  listDealers(@Query() q: ListDealersQuery) {
    return this.admin.listDealers(q.status);
  }

  @Get('dealers/:id')
  getDealer(@Param('id') id: string) {
    return this.admin.getDealer(id);
  }

  @Post('dealers/:id/tier')
  setTier(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetTierDto,
    @Ip() ip: string,
  ) {
    return this.admin.setDealerTier(id, dto.tier, dto.reason, { actorUserId: user.userId, ip });
  }

  @Post('dealers/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetDealerStatusDto,
    @Ip() ip: string,
  ) {
    return this.admin.setDealerStatus(id, dto.status, dto.reason, { actorUserId: user.userId, ip });
  }

  @Post('listings/:id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateListingDto,
    @Ip() ip: string,
  ) {
    return this.admin.moderateListing(id, dto.action, dto.reason, { actorUserId: user.userId, ip });
  }

  @Get('audit-log')
  auditLog() {
    return this.admin.auditLog();
  }

  // ── Blocklist ──
  @Get('blocklist')
  listBlocklist() {
    return this.blocklist.list();
  }

  @Post('blocklist')
  @HttpCode(201)
  async addBlock(@CurrentUser() user: AuthUser, @Body() dto: BlocklistAddDto, @Ip() ip: string) {
    const row = await this.blocklist.add(dto.kind, dto.value, dto.reason, user.userId);
    await this.audit.record({
      actorUserId: user.userId,
      action: 'blocklist.add',
      entityType: 'blocklist',
      entityId: row.id,
      after: { kind: dto.kind, value: dto.value },
      reason: dto.reason,
      ip,
    });
    return row;
  }

  @Delete('blocklist/:id')
  async removeBlock(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    await this.audit.record({
      actorUserId: user.userId,
      action: 'blocklist.remove',
      entityType: 'blocklist',
      entityId: id,
      ip,
    });
    return this.blocklist.remove(id);
  }

  // ── Feature flags ──
  @Get('feature-flags')
  listFlags() {
    return this.flags.list();
  }

  @Put('feature-flags/:key')
  async setFlag(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: FlagDto,
    @Ip() ip: string,
  ) {
    const row = await this.flags.set(key, dto.enabled, dto.description);
    await this.audit.record({
      actorUserId: user.userId,
      action: 'feature_flag.set',
      entityType: 'feature_flag',
      entityId: key,
      after: { enabled: dto.enabled },
      ip,
    });
    return row;
  }

  // ── Disputes ──
  @Get('disputes')
  listDisputes(@Query('status') status?: DisputeStatus) {
    return this.disputes.listForAdmin(status);
  }

  @Post('disputes/:id/resolve')
  @HttpCode(200)
  async resolveDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Ip() ip: string,
  ) {
    const row = await this.disputes.resolve(id, dto.status, dto.resolution);
    await this.audit.record({
      actorUserId: user.userId,
      action: 'dispute.resolve',
      entityType: 'dispute',
      entityId: id,
      after: { status: dto.status },
      reason: dto.resolution,
      ip,
    });
    return row;
  }

  // ── Search index ──
  @Post('search/reindex')
  @HttpCode(200)
  async reindex(@CurrentUser() user: AuthUser, @Ip() ip: string) {
    const res = await this.search.reindexAll();
    await this.audit.record({
      actorUserId: user.userId,
      action: 'search.reindex',
      entityType: 'search',
      entityId: 'listings',
      after: res,
      ip,
    });
    return res;
  }

  // ── Impersonation (time-boxed, audited) ──
  @Post('impersonate/:userId')
  @HttpCode(200)
  async impersonate(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Ip() ip: string,
  ) {
    const res = await this.auth.impersonate(userId);
    await this.audit.record({
      actorUserId: user.userId,
      action: 'user.impersonate',
      entityType: 'user',
      entityId: userId,
      ip,
    });
    return res;
  }
}
