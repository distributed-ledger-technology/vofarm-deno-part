import { IExchangeConnector } from "../../deps.ts";
import { Action, AssetInfo, InvestmentAdvice, IVoFarmStrategy, LogLevel } from "../../mod.ts";
import { VFLogger } from "../utilities/logger.ts";

export interface IConsistencyCheckPositionEntry {
    pair: string
    side: string
    size: number
}


export abstract class VoFarmStrategy implements IVoFarmStrategy {

    protected liquidityLevel = 0
    protected fundamentals: any = {}
    protected currentInvestmentAdvices: InvestmentAdvice[] = []
    protected lastAdviceDate: Date = new Date()
    protected consistencyCheckPositionsOwnNode: IConsistencyCheckPositionEntry[] = []
    protected consistencyCheckPositionsRemoteNode: IConsistencyCheckPositionEntry[] = []

    public abstract getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]>

    public constructor(protected logger: VFLogger) { }


    protected addInvestmentAdvice(action: Action, amount: number, pair: string, reason: string): void {

        const investmentAdvice: InvestmentAdvice = {
            action,
            amount,
            pair,
            reason
        }

        this.currentInvestmentAdvices.push(investmentAdvice)

        this.lastAdviceDate = new Date()

    }

    protected ensureLongShortSetup(AssetInfo: AssetInfo, longP: any, shortP: any): void {

        if (longP === undefined) {

            this.addInvestmentAdvice(Action.BUY, AssetInfo.minTradingAmount, AssetInfo.pair, `we open a ${AssetInfo.pair} long position to play the game`)

        }

        if (shortP === undefined) {

            this.addInvestmentAdvice(Action.SELL, AssetInfo.minTradingAmount, AssetInfo.pair, `we open a ${AssetInfo.pair} short position to play the game`)

        }
    }


    protected async narrowLongShortDiffPNL(assetInfo: AssetInfo) {
        this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, `narrowing ${assetInfo.pair} `)
        this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, `narrowing ${assetInfo.pair} `)
    }


    protected closeAll(AssetInfo: AssetInfo, specificmessage: string, longP: any, shortP: any): void {

        if (longP !== undefined) {

            this.addInvestmentAdvice(Action.REDUCELONG, Number((longP.data.size).toFixed(3)), AssetInfo.pair, `we close ${longP.data.size} ${AssetInfo.pair} long due to ${specificmessage}`)
        }

        if (shortP !== undefined) {

            this.addInvestmentAdvice(Action.REDUCESHORT, Number((shortP.data.size).toFixed(3)), AssetInfo.pair, `we close ${shortP.data.size} ${AssetInfo.pair} short due to ${specificmessage}`)

        }

    }


    protected isPreviousAdviceOlderThanXMinutes(minutes: number): boolean {

        const refDate = new Date()

        refDate.setMinutes(refDate.getMinutes() - minutes)

        if (this.lastAdviceDate < refDate) {
            const message = `lastAdviceDate :${this.lastAdviceDate} vs. refDate: ${refDate}`
            this.logger.log(message, LogLevel.INFO)
            return true
        }

        return false
    }

    protected async collectFundamentals(exchangeConnector: IExchangeConnector) {

        this.fundamentals.accountInfo = await exchangeConnector.getFuturesAccountData()

        if (!(this.fundamentals.accountInfo.result.USDT.equity > 0)) throw new Error(`r u kidding me?`) // also in case the exchange api delivers shit

        this.fundamentals.positions = await exchangeConnector.getPositions()
        this.liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20

        const message = `*********** equity: ${this.fundamentals.accountInfo.result.USDT.equity.toFixed(2)} - ll: ${this.liquidityLevel.toFixed(2)}} ***********`
        this.logger.log(message, 1)

        for (const remotePosition of this.fundamentals.positions) {
            this.consistencyCheckPositionsRemoteNode.push({ pair: remotePosition.data.symbol, side: remotePosition.data.side, size: remotePosition.data.size })
        }

        if (this.consistencyCheckPositionsOwnNode.length === 0) {
            this.logger.log(`consistencyCheckPositionsOwnNode is initial`, 2)
            this.consistencyCheckPositionsOwnNode = [...this.consistencyCheckPositionsRemoteNode]
        }
    }

    protected compareConsistencyLedger() {
        // tbd
    }

    protected getOverallLSD(): number {
        let longValue = 0
        let shortValue = 0

        for (const position of this.fundamentals.positions) {
            if (position.data.side === 'Buy') {
                longValue = longValue + position.data.position_value
            } else if (position.data.side === 'Sell') {
                shortValue = shortValue + position.data.position_value
            }
        }

        return longValue - shortValue

    }
}