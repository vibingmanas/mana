import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { LenderService } from './lender.service';
import { ESignService } from './esign.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, LenderService, ESignService],
})
export class FinanceModule {}
