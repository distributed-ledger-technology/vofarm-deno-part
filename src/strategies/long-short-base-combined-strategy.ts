import { InvestmentAdvice } from "../interfaces/investment-advice.ts"
import { AssetInfo } from "../interfaces/investment-option.ts"
import { VoFarmStrategy } from "../interfaces/vofarm-strategy.ts"
import { VFLogger } from "../utilities/logger.ts"
import { LongShortBaseBTCStrategy } from "./long-short-base-btc-strategy.ts"
import { LongShortBaseETHStrategy } from "./long-short-base-eth-strategy.ts"
import { LongShortBaseBNBStrategy } from "./long-short-base-bnb-strategy.ts"

export class LongShortBaseCombinedStrategy implements VoFarmStrategy {

    private strategies: VoFarmStrategy[] = []

    private assetInfo: AssetInfo

    public constructor(private logger: VFLogger) {
        this.strategies.push(new LongShortBaseBTCStrategy(this.logger))
        this.strategies.push(new LongShortBaseETHStrategy(this.logger))
        this.strategies.push(new LongShortBaseBNBStrategy(this.logger))

        this.assetInfo = { pair: "not relevant in this special case", minTradingAmount: 0, decimalPlaces: 0 }
    }


    public getAssetInfo(): AssetInfo {
        return this.assetInfo
    }

    public setAssetInfo(assetInfo: AssetInfo): void {

        this.assetInfo = assetInfo
    }
    public async getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]> {
        let collectedInvestmentAdvices: InvestmentAdvice[] = []

        for (const strategy of this.strategies) {

            collectedInvestmentAdvices = collectedInvestmentAdvices.concat(await strategy.getInvestmentAdvices(investmentDecisionBase))
        }

        return collectedInvestmentAdvices
    }


}