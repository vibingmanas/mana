import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsString } from 'class-validator';
import { CheckType, UserRole } from '@mana/db';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class RunCheckDto {
  @IsIn(['dealer', 'vehicle', 'user'])
  subjectType!: 'dealer' | 'vehicle' | 'user';

  @IsString()
  subjectId!: string;

  @IsIn(Object.values(CheckType))
  checkType!: CheckType;

  @IsObject()
  input!: Record<string, unknown>;
}

/**
 * Admin-only entry point to run a verification check directly (ops + testing).
 * Feature flows (onboarding, listing) call VerificationService in-process.
 */
@Controller('verify')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post('run')
  run(@Body() dto: RunCheckDto) {
    return this.verification.runCheck({
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      checkType: dto.checkType,
      input: dto.input,
      consent: { purpose: 'admin_manual_check' },
    });
  }
}
