
import { AssetInfo } from "../interfaces/investment-option.ts"
import { VFLogger } from "../utilities/logger.ts"
import { LongShortBaseStrategy } from "./long-short-base-strategy.ts"

export class LongShortBaseBNBStrategy extends LongShortBaseStrategy {


    public constructor(vfLogger: VFLogger) {

        super(vfLogger)
        this.setAssetInfo({ pair: "BNBUSDT", minTradingAmount: 0.1, decimalPlaces: 1 })

    }


    public setAssetInfo(assetInfo: AssetInfo): void {

        this.assetInfo = assetInfo

    }

}