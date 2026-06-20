export interface EmiResult {
  loanAmount: number;
  monthlyEmi: number;
  totalPayable: number;
  totalInterest: number;
}

/** Standard reducing-balance EMI. rate is annual percent (e.g. 12 = 12%/yr). */
export function computeEmi(
  price: number,
  downPayment: number,
  annualRatePct: number,
  months: number,
): EmiResult {
  const loanAmount = Math.max(0, price - downPayment);
  if (months <= 0)
    return { loanAmount, monthlyEmi: loanAmount, totalPayable: loanAmount, totalInterest: 0 };
  const r = annualRatePct / 12 / 100;
  let monthlyEmi: number;
  if (r === 0) {
    monthlyEmi = loanAmount / months;
  } else {
    const pow = Math.pow(1 + r, months);
    monthlyEmi = (loanAmount * r * pow) / (pow - 1);
  }
  monthlyEmi = Math.round(monthlyEmi);
  const totalPayable = monthlyEmi * months;
  return { loanAmount, monthlyEmi, totalPayable, totalInterest: totalPayable - loanAmount };
}

export interface EligibilityInput {
  price: number;
  downPayment: number;
  tenureMonths: number;
}
export interface EligibilityDecision {
  approved: boolean;
  partner: string;
  reason: string;
}

const PARTNERS = ['Cholamandalam', 'Mahindra Finance', 'HDFC Bank', 'IDFC First'];

/** Mock partner underwriting (plan 09 is referral-first; no real lending). */
export function decideEligibility(input: EligibilityInput): EligibilityDecision {
  const loan = input.price - input.downPayment;
  const partner = PARTNERS[input.price % PARTNERS.length] ?? PARTNERS[0]!;
  if (input.tenureMonths < 12 || input.tenureMonths > 84) {
    return { approved: false, partner, reason: 'Tenure must be 12–84 months' };
  }
  if (input.downPayment < input.price * 0.1) {
    return { approved: false, partner, reason: 'Down payment must be at least 10%' };
  }
  if (loan > 1_500_000) {
    return { approved: false, partner, reason: 'Loan amount exceeds partner limit' };
  }
  return { approved: true, partner, reason: 'Pre-approved by partner' };
}
