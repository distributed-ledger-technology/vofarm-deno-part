
import { AssetInfo } from "../interfaces/investment-option.ts"
import { VFLogger } from "../utilities/logger.ts"
import { LongShortBaseStrategy } from "./long-short-base-strategy.ts"

export class LongShortBaseETHStrategy extends LongShortBaseStrategy {


    public constructor(vfLogger: VFLogger) {

        super(vfLogger)
        this.setAssetInfo({ pair: "ETHUSDT", minTradingAmount: 0.01, decimalPlaces: 2 })

    }


    public setAssetInfo(assetInfo: AssetInfo): void {

        this.assetInfo = assetInfo

    }


    protected getClosingPointLong(lsd: number, ll: number): number {

        let cPL = (lsd > 0) ?
            142 :
            Math.abs(lsd) + 142

        if (ll < 1) {
            cPL = 0
        }

        return cPL

    }


    protected getClosingPointShort(lsd: number, ll: number): number {

        let cPS = (lsd < 0) ?
            56 :
            lsd + 56

        if (ll < 1) {
            cPS = 0
        }

        return cPS
    }

}