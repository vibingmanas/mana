import { IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 120) legalName?: string;
  @IsOptional() @IsString() @Length(2, 120) displayName?: string;
  @IsOptional() @IsString() @Length(2, 120) ownerName?: string;
  @IsOptional() @IsString() @Length(2, 80) city?: string;
  @IsOptional() @IsString() @Length(2, 80) state?: string;
  @IsOptional() @IsString() @Length(2, 250) address?: string;
  @IsOptional() @IsString() @Length(2, 40) premisesType?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) yearEstablished?: number;
}

export class EmailOtpRequestDto {
  @IsEmail() email!: string;
}

export class EmailVerifyDto {
  @IsEmail() email!: string;
  @IsString() @Length(4, 8) code!: string;
}

export class AadhaarDto {
  // Dev/mock path. Live flow is DigiLocker consent (see plan 07); number never stored raw.
  @IsString()
  @Matches(/^\d{12}$/, { message: 'aadhaar must be 12 digits' })
  aadhaarNumber!: string;
}

export class PanDto {
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'invalid PAN' })
  pan!: string;
}

export class GstDto {
  @IsString()
  @Length(15, 15, { message: 'GSTIN must be 15 characters' })
  gstin!: string;
}

export class BankDto {
  @IsString() @Length(6, 20) accountNumber!: string;
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'invalid IFSC' })
  ifsc!: string;
}
