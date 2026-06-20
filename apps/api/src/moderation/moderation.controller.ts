import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, Length } from 'class-validator';
import { DisputesService } from './disputes.service';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class RaiseDisputeDto {
  @IsString() @Length(2, 40) type!: string;
  @IsString() @Length(3, 2000) message!: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() dealerId?: string;
}

@Controller()
export class ModerationPublicController {
  constructor(
    private readonly disputes: DisputesService,
    private readonly flags: FeatureFlagsService,
  ) {}

  /** Any signed-in user can raise a dispute. */
  @Post('disputes')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  raise(@CurrentUser() user: AuthUser, @Body() dto: RaiseDisputeDto) {
    return this.disputes.raise(user.userId, dto);
  }

  /** Public feature-flag map for clients. */
  @Get('feature-flags')
  flagsMap() {
    return this.flags.publicMap();
  }
}
