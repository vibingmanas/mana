import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@mana/db';
import { OnboardingService, type ConsentMeta } from './onboarding.service';
import {
  AadhaarDto,
  BankDto,
  EmailOtpRequestDto,
  EmailVerifyDto,
  GstDto,
  PanDto,
  UpdateProfileDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEALER_OWNER)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  private meta(ip?: string, ua?: string): ConsentMeta {
    return { ip, userAgent: ua };
  }

  @Post('start')
  @HttpCode(200)
  start(@CurrentUser() user: AuthUser) {
    return this.onboarding.start(user.userId);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.onboarding.status(user.userId);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.onboarding.updateProfile(user.userId, dto);
  }

  @Post('email/request-otp')
  @HttpCode(200)
  requestEmailOtp(@Body() dto: EmailOtpRequestDto) {
    return this.onboarding.requestEmailOtp(dto.email);
  }

  @Post('email/verify')
  @HttpCode(200)
  verifyEmail(@CurrentUser() user: AuthUser, @Body() dto: EmailVerifyDto) {
    return this.onboarding.verifyEmail(user.userId, dto.email, dto.code);
  }

  @Post('aadhaar')
  @HttpCode(200)
  verifyAadhaar(
    @CurrentUser() user: AuthUser,
    @Body() dto: AadhaarDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.onboarding.verifyAadhaar(user.userId, dto.aadhaarNumber, this.meta(ip, ua));
  }

  @Post('pan')
  @HttpCode(200)
  verifyPan(
    @CurrentUser() user: AuthUser,
    @Body() dto: PanDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.onboarding.verifyPan(user.userId, dto.pan, this.meta(ip, ua));
  }

  @Post('gst')
  @HttpCode(200)
  verifyGst(
    @CurrentUser() user: AuthUser,
    @Body() dto: GstDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.onboarding.verifyGst(user.userId, dto.gstin, this.meta(ip, ua));
  }

  @Post('bank')
  @HttpCode(200)
  verifyBank(
    @CurrentUser() user: AuthUser,
    @Body() dto: BankDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.onboarding.verifyBank(user.userId, dto.accountNumber, dto.ifsc, this.meta(ip, ua));
  }
}
