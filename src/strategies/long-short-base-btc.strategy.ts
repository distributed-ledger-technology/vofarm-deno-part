
import { AssetInfo } from "../interfaces/investment-option.ts";
import { VFLogger } from "../utilities/logger.ts";
import { LongShortBaseStrategy } from "./long-short-base-strategy.ts"

export class LongShortBaseBTCStrategy extends LongShortBaseStrategy {

    public constructor(vfLogger?: VFLogger) {

        super(vfLogger)
        this.setAssetInfo({ pair: "BTCUSDT", minTradingAmount: 0.001 })

    }

    public setAssetInfo(assetInfo: AssetInfo): void {
        this.assetInfo = assetInfo
    }


    protected getClosingPointLong(lsd: number, ll: number): number {

        let cPL = (lsd > 0) ?
            36 :
            Math.abs(lsd) + 36

        if (ll < 1) {
            cPL = 0
        }

        return cPL

    }


    protected getClosingPointShort(lsd: number, ll: number): number {

        let cPS = (lsd < 0) ?
            36 :
            lsd + 36

        if (ll < 1) {
            cPS = 0
        }

        return cPS
    }
}