import { Global, Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

@Global()
@Module({
  controllers: [BillingController, RazorpayWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
