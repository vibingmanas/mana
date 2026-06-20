import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { LeadIntent } from '@mana/db';

export class CreateLeadDto {
  @IsString() vehicleId!: string;
  @IsOptional() @IsIn(Object.values(LeadIntent)) intent?: LeadIntent;
  @IsOptional() @IsString() @Length(0, 500) note?: string;
}

export class WishlistDto {
  @IsString() vehicleId!: string;
}

export class SavedSearchDto {
  @IsObject() query!: Record<string, unknown>;
  @IsOptional() @IsIn(['none', 'push', 'whatsapp', 'email']) alertChannel?: string;
}
