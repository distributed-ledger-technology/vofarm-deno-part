import { InvestmentAdvice } from "./investment-advice.ts";
import { AssetInfo } from "./investment-option.ts";

export interface IVoFarmStrategy {
    getAssetInfo(): AssetInfo
    setAssetInfo(assetInfo: AssetInfo): void
    getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]>
}