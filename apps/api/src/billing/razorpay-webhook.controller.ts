import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentsService } from '../payments/payments.service';

interface RawReq {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class RazorpayWebhookController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly billing: BillingService,
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async handle(@Req() req: RawReq, @Headers('x-razorpay-signature') sig?: string) {
    const raw = req.rawBody;
    if (!raw || !this.payments.verifyWebhook(raw, sig)) {
      throw new BadRequestException('Invalid signature');
    }
    const evt = JSON.parse(raw.toString()) as {
      event?: string;
      payload?: { payment_link?: { entity?: { reference_id?: string } } };
    };
    if (evt.event === 'payment_link.paid') {
      const ref = evt.payload?.payment_link?.entity?.reference_id;
      if (ref) await this.billing.activateFromPaymentRef(ref);
    }
    return { ok: true };
  }
}
