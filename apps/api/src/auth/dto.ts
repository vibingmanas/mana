import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const E164 = /^\+[1-9]\d{7,14}$/;

export class RequestOtpDto {
  @IsString()
  @Matches(E164, { message: 'phone must be E.164, e.g. +919000000001' })
  phone!: string;

  @IsOptional()
  @IsString()
  @IsIn(['login', 'onboarding'])
  purpose?: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(E164)
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  @IsOptional()
  @IsString()
  @IsIn(['login', 'onboarding'])
  purpose?: string;

  /** Role for a brand-new user. Restricted to self-serviceable roles. */
  @IsOptional()
  @IsIn(['BUYER', 'DEALER_OWNER'])
  role?: 'BUYER' | 'DEALER_OWNER';
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class RequestEmailOtpDto {
  @IsEmail()
  email!: string;
}

export class VerifyEmailOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(4, 8)
  code!: string;
}
