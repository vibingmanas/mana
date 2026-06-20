import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, AppointmentType, LeadIntent, Prisma, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import {
  isValidSlotStart,
  slotStartsForWindow,
  windowForDate,
  type AvailabilityWindow,
} from './slots';

const ACTIVE: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

export interface AvailabilityInput {
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes?: number;
  doorstepEnabled?: boolean;
  doorstepRadiusKm?: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  private async ensureBuyer(userId: string): Promise<string> {
    const buyer = await this.prisma.buyer.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return buyer.id;
  }

  // ─── Dealer: availability ─────────────────────────────────
  async setAvailability(userId: string, windows: AvailabilityInput[]) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    for (const w of windows) {
      if (w.startMinute >= w.endMinute)
        throw new BadRequestException('startMinute must be < endMinute');
      if (w.weekday < 0 || w.weekday > 6) throw new BadRequestException('weekday must be 0..6');
    }
    await this.prisma.$transaction([
      this.prisma.dealerAvailability.deleteMany({ where: { dealerId: dealer.id } }),
      this.prisma.dealerAvailability.createMany({
        data: windows.map((w) => ({
          dealerId: dealer.id,
          weekday: w.weekday,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
          slotMinutes: w.slotMinutes ?? 30,
          doorstepEnabled: w.doorstepEnabled ?? false,
          doorstepRadiusKm: w.doorstepRadiusKm ?? 0,
        })),
      }),
    ]);
    return this.getAvailabilityByDealer(dealer.id);
  }

  async getAvailabilityByDealer(dealerId: string) {
    return this.prisma.dealerAvailability.findMany({
      where: { dealerId },
      orderBy: { weekday: 'asc' },
    });
  }

  private toWindows(
    rows: { weekday: number; startMinute: number; endMinute: number; slotMinutes: number }[],
  ): AvailabilityWindow[] {
    return rows.map((r) => ({
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      slotMinutes: r.slotMinutes,
    }));
  }

  /** Open slot start times (ISO) for a dealer on a given date. */
  async openSlots(dealerId: string, dateStr: string): Promise<string[]> {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('invalid date');
    const rows = await this.prisma.dealerAvailability.findMany({ where: { dealerId } });
    const w = windowForDate(date, this.toWindows(rows));
    if (!w) return [];

    const taken = await this.prisma.appointment.findMany({
      where: {
        dealerId,
        status: { in: ACTIVE },
        scheduledStart: {
          gte: new Date(`${dateStr}T00:00:00`),
          lt: new Date(`${dateStr}T23:59:59`),
        },
      },
      select: { scheduledStart: true },
    });
    const takenMins = new Set(
      taken.map((t) => t.scheduledStart.getHours() * 60 + t.scheduledStart.getMinutes()),
    );

    return slotStartsForWindow(w)
      .filter((m) => !takenMins.has(m))
      .map((m) => {
        const d = new Date(date);
        d.setHours(Math.floor(m / 60), m % 60, 0, 0);
        return d.toISOString();
      });
  }

  // ─── Buyer: booking ───────────────────────────────────────
  async book(
    userId: string,
    vehicleId: string,
    type: AppointmentType,
    scheduledStart: string,
    location?: Record<string, unknown>,
  ) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.status !== VehicleStatus.LIVE)
      throw new NotFoundException('Listing not available');

    const start = new Date(scheduledStart);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('invalid scheduledStart');
    if (start.getTime() < Date.now())
      throw new BadRequestException('cannot book a slot in the past');

    const rows = await this.prisma.dealerAvailability.findMany({
      where: { dealerId: vehicle.dealerId },
    });
    const windows = this.toWindows(rows);
    if (!isValidSlotStart(start, windows)) {
      throw new BadRequestException('Selected time is outside the dealer’s availability');
    }
    if (
      type === AppointmentType.DOORSTEP &&
      !rows.find((r) => r.weekday === start.getDay())?.doorstepEnabled
    ) {
      throw new BadRequestException('Doorstep test drives not available for this slot');
    }

    const w = windowForDate(start, windows)!;
    const end = new Date(start.getTime() + w.slotMinutes * 60_000);

    // Conflict check (best-effort; a DB unique index could harden this later).
    const clash = await this.prisma.appointment.findFirst({
      where: { dealerId: vehicle.dealerId, status: { in: ACTIVE }, scheduledStart: start },
    });
    if (clash) throw new BadRequestException('That slot was just taken; pick another');

    const lead = await this.prisma.lead.create({
      data: { buyerId, vehicleId, dealerId: vehicle.dealerId, intent: LeadIntent.TEST_DRIVE },
    });

    return this.prisma.appointment.create({
      data: {
        vehicleId,
        dealerId: vehicle.dealerId,
        buyerId,
        leadId: lead.id,
        type,
        scheduledStart: start,
        scheduledEnd: end,
        status: AppointmentStatus.REQUESTED,
        location: (location as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  async listForBuyer(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    return this.prisma.appointment.findMany({
      where: { buyerId },
      orderBy: { scheduledStart: 'desc' },
      include: { vehicle: { select: { make: true, model: true } } },
    });
  }

  async listForDealer(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    return this.prisma.appointment.findMany({
      where: { dealerId: dealer.id },
      orderBy: { scheduledStart: 'asc' },
      include: { vehicle: { select: { make: true, model: true, regNumber: true } } },
    });
  }

  // ─── Transitions ──────────────────────────────────────────
  private async dealerAppt(userId: string, id: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.dealerId !== dealer.id) throw new ForbiddenException('Not your appointment');
    return appt;
  }

  async confirm(userId: string, id: string) {
    const appt = await this.dealerAppt(userId, id);
    const confirmable: AppointmentStatus[] = [
      AppointmentStatus.REQUESTED,
      AppointmentStatus.RESCHEDULED,
    ];
    if (!confirmable.includes(appt.status)) {
      throw new BadRequestException(`Cannot confirm an appointment that is ${appt.status}`);
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
    });
  }

  async complete(userId: string, id: string, showed: boolean, outcome?: string) {
    await this.dealerAppt(userId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: showed ? AppointmentStatus.COMPLETED : AppointmentStatus.NO_SHOW,
        showed,
        outcome: outcome ?? null,
      },
    });
  }

  async cancel(userId: string, role: string, id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (role === 'DEALER_OWNER') {
      const dealer = await this.dealers.getByUserOrThrow(userId);
      if (appt.dealerId !== dealer.id) throw new ForbiddenException('Not your appointment');
    } else {
      const buyer = await this.prisma.buyer.findUnique({ where: { userId } });
      if (!buyer || appt.buyerId !== buyer.id) throw new ForbiddenException('Not your appointment');
    }
    const terminal: AppointmentStatus[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ];
    if (terminal.includes(appt.status)) {
      throw new BadRequestException(`Cannot cancel an appointment that is ${appt.status}`);
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
  }
}
