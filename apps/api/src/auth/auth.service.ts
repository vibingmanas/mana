import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { UserRole, type User } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: { id: string; role: UserRole; phone: string; name: string | null };
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
  ) {}

  async requestPhoneOtp(phone: string, purpose = 'login') {
    return this.otp.request('phone', phone, purpose);
  }

  async verifyPhoneOtp(
    phone: string,
    code: string,
    purpose = 'login',
    role: 'BUYER' | 'DEALER_OWNER' = 'BUYER',
  ): Promise<AuthResult> {
    const ok = await this.otp.verify('phone', phone, code, purpose);
    if (!ok) throw new UnauthorizedException('Invalid or expired OTP');

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { phoneVerifiedAt: new Date() },
      create: {
        phone,
        role: role === 'DEALER_OWNER' ? UserRole.DEALER_OWNER : UserRole.BUYER,
        phoneVerifiedAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: { id: user.id, role: user.role, phone: user.phone, name: user.name },
    };
  }

  /** Admin-only: mint a short-lived access token to act as another user (audited by caller). */
  async impersonate(
    targetUserId: string,
  ): Promise<{ accessToken: string; user: { id: string; role: UserRole } }> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new UnauthorizedException('Target user not found');
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, imp: true },
      { expiresIn: '15m' as unknown as JwtSignOptions['expiresIn'] },
    );
    return { accessToken, user: { id: user.id, role: user.role } };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotate: revoke old, issue new.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const expiresIn = (process.env.JWT_EXPIRES_IN ??
      '15m') as unknown as JwtSignOptions['expiresIn'];
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn });
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
