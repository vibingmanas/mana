import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DealerStaffRole, VerificationTier, type Dealer } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';

export type MembershipRole = 'OWNER' | DealerStaffRole;

const TIER_ORDER: VerificationTier[] = [
  VerificationTier.T0,
  VerificationTier.T1,
  VerificationTier.T2,
  VerificationTier.T3,
];

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the dealer a user can act on — as owner, or via staff membership. */
  async getByUserOrThrow(userId: string): Promise<Dealer> {
    const owned = await this.prisma.dealer.findUnique({ where: { ownerUserId: userId } });
    if (owned) return owned;
    const staff = await this.prisma.dealerStaff.findFirst({
      where: { userId },
      include: { dealer: true },
    });
    if (staff) return staff.dealer;
    throw new NotFoundException('No dealer profile; complete onboarding first');
  }

  /** Dealer + the caller's role within it (OWNER outranks staff roles). */
  async getMembershipOrThrow(userId: string): Promise<{ dealer: Dealer; role: MembershipRole }> {
    const owned = await this.prisma.dealer.findUnique({ where: { ownerUserId: userId } });
    if (owned) return { dealer: owned, role: 'OWNER' };
    const staff = await this.prisma.dealerStaff.findFirst({
      where: { userId },
      include: { dealer: true },
    });
    if (staff) return { dealer: staff.dealer, role: staff.role };
    throw new NotFoundException('No dealer profile; complete onboarding first');
  }

  /** Owner-only guard for staff/billing management. */
  async assertOwner(userId: string): Promise<Dealer> {
    const { dealer, role } = await this.getMembershipOrThrow(userId);
    if (role !== 'OWNER') throw new ForbiddenException('Only the dealer owner can do this');
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
