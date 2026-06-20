import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { VerificationTier, type Dealer } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';

const TIER_ORDER: VerificationTier[] = [
  VerificationTier.T0,
  VerificationTier.T1,
  VerificationTier.T2,
  VerificationTier.T3,
];

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserOrThrow(userId: string): Promise<Dealer> {
    const dealer = await this.prisma.dealer.findUnique({ where: { ownerUserId: userId } });
    if (!dealer) throw new NotFoundException('No dealer profile; complete onboarding first');
    return dealer;
  }

  hasTier(dealer: Dealer, min: VerificationTier): boolean {
    return TIER_ORDER.indexOf(dealer.verificationTier) >= TIER_ORDER.indexOf(min);
  }

  assertTier(dealer: Dealer, min: VerificationTier): void {
    if (!this.hasTier(dealer, min)) {
      throw new ForbiddenException(
        `Requires verification tier ${min}; you are ${dealer.verificationTier}`,
      );
    }
  }
}
