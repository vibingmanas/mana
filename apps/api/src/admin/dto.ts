import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { DealerStatus, VerificationTier } from '@mana/db';

export class SetTierDto {
  @IsIn(Object.values(VerificationTier)) tier!: VerificationTier;
  @IsString() @Length(3, 500) reason!: string;
}

export class SetDealerStatusDto {
  @IsIn(Object.values(DealerStatus)) status!: DealerStatus;
  @IsString() @Length(3, 500) reason!: string;
}

export class ModerateListingDto {
  @IsIn(['hold', 'remove', 'approve']) action!: 'hold' | 'remove' | 'approve';
  @IsString() @Length(3, 500) reason!: string;
}

export class ListDealersQuery {
  @IsOptional() @IsIn(Object.values(DealerStatus)) status?: DealerStatus;
}
