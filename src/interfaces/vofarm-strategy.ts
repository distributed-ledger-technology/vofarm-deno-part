import { InvestmentAdvice } from "./investment-advice.ts";
import { InvestmentOption } from "./investment-option.ts";

export interface VoFarmStrategy {
    getInvestmentOptions(): InvestmentOption[]
    getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]>
}