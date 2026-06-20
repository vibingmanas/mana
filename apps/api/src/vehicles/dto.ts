import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MediaType, VehicleStatus } from '@mana/db';

const REG = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;

export class CreateVehicleDto {
  @IsString()
  @Matches(REG, { message: 'invalid registration number' })
  regNumber!: string;

  @IsOptional() @IsString() @Length(2, 3) regState?: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() @Length(1, 60) make?: string;
  @IsOptional() @IsString() @Length(1, 60) model?: string;
  @IsOptional() @IsString() @Length(1, 60) variant?: string;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @IsString() transmission?: string;
  @IsOptional() @IsString() bodyType?: string;
  @IsOptional() @IsInt() @Min(1980) @Max(2100) manufactureYear?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) odometerKm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) ownersCount?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() @Min(10_000) @Max(100_000_000) price?: number;
  @IsOptional() @IsString() @Length(2, 80) city?: string;
}

export class AddMediaDto {
  @IsIn(Object.values(MediaType)) type!: MediaType;
  @IsUrl({ require_tld: false }) url!: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

const DEALER_SETTABLE: VehicleStatus[] = [
  VehicleStatus.LIVE,
  VehicleStatus.PAUSED,
  VehicleStatus.RESERVED,
  VehicleStatus.SOLD,
  VehicleStatus.REMOVED,
];

export class SetStatusDto {
  @IsIn(DEALER_SETTABLE) status!: VehicleStatus;
}

export class SearchListingsDto {
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
