import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentType } from '@mana/db';

export class AvailabilityWindowDto {
  @IsInt() @Min(0) @Max(6) weekday!: number;
  @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @IsInt() @Min(1) @Max(1440) endMinute!: number;
  @IsOptional() @IsInt() @Min(10) @Max(240) slotMinutes?: number;
  @IsOptional() @IsBoolean() doorstepEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(100) doorstepRadiusKm?: number;
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowDto)
  windows!: AvailabilityWindowDto[];
}

export class BookAppointmentDto {
  @IsString() vehicleId!: string;
  @IsOptional() @IsIn(Object.values(AppointmentType)) type?: AppointmentType;
  @IsString() scheduledStart!: string; // ISO
  @IsOptional() @IsObject() location?: Record<string, unknown>;
}

export class CompleteAppointmentDto {
  @IsBoolean() showed!: boolean;
  @IsOptional() @IsString() outcome?: string;
}
