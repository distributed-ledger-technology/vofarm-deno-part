// import { InvestmentAdvice } from "../interfaces/investment-advice.ts"
// import { AssetInfo } from "../interfaces/investment-option.ts"
// import { VoFarmStrategy } from "../interfaces/vofarm-strategy.ts"
// import { VFLogger } from "../utilities/logger.ts"

// export class AccompanyEtherToTheTop implements VoFarmStrategy {

//     private strategies: VoFarmStrategy[] = []

//     private assetInfo: AssetInfo

//     public constructor(private logger: VFLogger) {
//         this.assetInfo = { pair: "ETHUSDT", minTradingAmount: 0.01 }
//     }


//     public getAssetInfo(): AssetInfo {

//         return this.assetInfo
//     }


//     public setAssetInfo(assetInfo: AssetInfo): void {

//         this.assetInfo = assetInfo

//     }


//     public async getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]> {

//         console.log(investmentDecisionBase)

//         const lowestPNLOfShortPositionSinceX = this.getLowestPNLOfShortPositionSinceX()
//         const highestPNLOfShortPositionSinceX = this.getLowestPNLOfShortPositionSinceX()

//         const longPositionSize = 10
//         const shortPositionTargetSize = 2
//         const shortPositionMaxSize = 8
//         const shortPositionSize = 3

//         let pnlOfShortPosition = 40

//         console.log(`pnlOfShortPosition: ${pnlOfShortPosition}`)

//         if (shortPositionSize > shortPositionTargetSize && (pnlOfShortPosition > 100 || highestPNLOfShortPositionSinceX > 1000)) {
//             console.log(`reducing short position`)
//         } else if (shortPositionSize < shortPositionMaxSize && lowestPNLOfShortPositionSinceX > 1000) {
//             console.log(`addint 0.01 Ether to short position`)
//         }


//         let collectedInvestmentAdvices: InvestmentAdvice[] = []

//         return collectedInvestmentAdvices

//     }

//     private getLowestPNLOfShortPositionSinceX() {
//         console.log(`pnlOfShortPosition:`)
//         return 100
//     }

//     private getHighestPNLOfShortPositionSinceX() {
//         console.log(`pnlOfShortPosition:`)
//         return 0
//     }

// }