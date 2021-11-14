
import { AssetInfo } from "../interfaces/investment-option.ts"
import { VFLogger } from "../utilities/logger.ts"
import { LongShortBaseStrategy } from "./long-short-base-strategy.ts"

export class LongShortBaseETHStrategy extends LongShortBaseStrategy {


    public constructor(vfLogger?: VFLogger) {

        super(vfLogger)
        this.setAssetInfo({ pair: "ETHUSDT", minTradingAmount: 0.01 })

    }


    public setAssetInfo(assetInfo: AssetInfo): void {

        this.assetInfo = assetInfo

    }

}