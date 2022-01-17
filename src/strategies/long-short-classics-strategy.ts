import { IExchangeConnector } from "../../deps.ts";
import { Action, InvestmentAdvice, AssetInfo, LogLevel } from "../../mod.ts"
import { FinancialCalculator } from "../utilities/financial-calculator.ts"
import { VFLogger } from "../utilities/logger.ts";

import { VoFarmStrategy } from "./vofarm-strategy.ts";

export interface AssetUnderPlay {
    symbol: string,
    side: string
    percentage: number,
    minTradingAmount: number
}

export abstract class LongShortClassics extends VoFarmStrategy {

    protected overallLSD: number = 0
    protected overallPNL: number = 0
    protected triggerForUltimateProfitTaking: number = 1 // 0.1
    protected generalClosingTrigger: number = 100
    protected assetInfos: AssetInfo[]
    protected historyLength = 1000
    protected mostSuccessfulAvailableAsset: AssetUnderPlay
    protected leastSuccessfulAssetOnUnderRepresentedSide: AssetUnderPlay

    public constructor(logger: VFLogger) {
        super(logger)
        this.assetInfos = this.getAssetsToPlayWith()
        this.mostSuccessfulAvailableAsset = {
            symbol: "",
            side: "",
            percentage: 0,
            minTradingAmount: 0,
        }
        this.leastSuccessfulAssetOnUnderRepresentedSide = {
            symbol: "",
            side: "",
            percentage: 0,
            minTradingAmount: 0,
        }
    }

    public async getInvestmentAdvices(input: any): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []
        this.mostSuccessfulAvailableAsset = {
            symbol: "",
            side: "",
            percentage: 0,
            minTradingAmount: 0,
        }

        this.leastSuccessfulAssetOnUnderRepresentedSide = {
            symbol: "",
            side: "",
            percentage: 0,
            minTradingAmount: 0,
        }

        if (input.fundamentals === undefined) {
            await this.collectFundamentals(input.exchangeConnector)
        } else {
            this.fundamentals.accountInfo = input.fundamentals.accountInfo
            this.fundamentals.positions = input.fundamentals.positions
        }

        this.liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20

        this.overallLSD = this.getOverallLSD()

        this.logger.log(`overallLSD: ${this.overallLSD.toFixed(2)}`, 1)

        for (const assetInfo of this.assetInfos) {

            try {
                await this.playAsset(assetInfo, input.exchangeConnector)
            } catch (error) {
                this.logger.log(`strange situation while playing ${assetInfo.pair}: ${error}`, 2)
            }

        }

        if (this.liquidityLevel < this.triggerForUltimateProfitTaking && this.leastSuccessfulAssetOnUnderRepresentedSide.symbol !== "") {
            this.sellMostSuccessfulAvailableAsset()
        }

        if (this.liquidityLevel > 0.15 && this.leastSuccessfulAssetOnUnderRepresentedSide.symbol !== "") {
            this.addToLeastSuccessfulAssetOnUnderRepresentedSide()
        }

        return this.currentInvestmentAdvices

    }

    protected async playAsset(assetInfo: AssetInfo, exchangeConnector: IExchangeConnector): Promise<void> {

        let longPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]
        let shortPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === assetInfo.pair)[0]

        if (longPosition === undefined || shortPosition === undefined) {
            console.log(`alarm: ${assetInfo.pair} war nicht da`)
            this.ensureLongShortSetup(assetInfo, longPosition, shortPosition)
            return
        }

        assetInfo.longHistory.unshift(longPosition.data.unrealised_pnl)
        assetInfo.shortHistory.unshift(shortPosition.data.unrealised_pnl)

        if (assetInfo.longHistory.length > this.historyLength) {
            console.log("splicing")
            assetInfo.longHistory.splice(assetInfo.longHistory.length - 1, 1)
            assetInfo.shortHistory.splice(assetInfo.shortHistory.length - 1, 1)
        }

        let longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(this.fundamentals.positions, assetInfo.pair)

        if (this.mostSuccessfulAvailableAsset.symbol === "") {
            this.setMostSuccessfulAvailableAsset()
        }

        if (this.leastSuccessfulAssetOnUnderRepresentedSide.symbol === "") {
            this.setLeastSuccessfulAssetOnUnderRepresentedSide()
        }


        if (longPosition !== undefined && shortPosition !== undefined && (longPosition.data.leverage < 25 || shortPosition.data.leverage < 25)) {
            await exchangeConnector.setLeverage(assetInfo.pair, 25)
        }

        try {
            this.overallPNL = FinancialCalculator.getOverallPNLInPercent(longPosition, shortPosition)
        } catch (error) {
            this.logger.log(error.message, 2)
        }

        this.logger.log(`${assetInfo.pair} oPNL: ${this.overallPNL.toFixed(2)} (l: ${longPosition.data.unrealised_pnl.toFixed(2)} s: ${shortPosition.data.unrealised_pnl.toFixed(2)}) - lsd: ${longShortDeltaInPercent.toFixed(2)}`, 2)

        if (this.liquidityLevel > 10 && longPosition.data.unrealised_pnl < -0.2 && shortPosition.data.unrealised_pnl < -0.2) {
            this.narrowLongShortDiffPNL(assetInfo)
        }


        let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longPosition)

        let aPL = this.getAddingPointLong(assetInfo, longShortDeltaInPercent, this.liquidityLevel)

        this.logger.log(`${assetInfo.pair} aPL: ${aPL.toFixed(2)} (${pnlLong})`, LogLevel.INFO)

        if (pnlLong < aPL) {
            const reason = `we enhance our ${assetInfo.pair} long position (at a pnl of: ${pnlLong}%) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }


        let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortPosition)

        let aPS = this.getAddingPointShort(assetInfo, longShortDeltaInPercent, this.liquidityLevel)

        this.logger.log(`${assetInfo.pair} aPS: ${aPS.toFixed(2)} (${pnlShort})`, LogLevel.INFO)

        if (pnlShort < aPS) {

            const reason = `we enhance our ${assetInfo.pair} short position (at a pnl of: ${pnlShort}%) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }


        let cPL = this.getClosingPointLong(assetInfo, longShortDeltaInPercent, this.liquidityLevel)

        this.logger.log(`${assetInfo.pair} cPL: ${cPL.toFixed(2)} (${pnlLong})`, LogLevel.INFO)

        if (pnlLong > cPL && longPosition !== undefined && longPosition.data.size > assetInfo.minTradingAmount) {
            const reason = `we reduce our ${assetInfo.pair} long position to realize ${pnlLong}% profits`
            this.addInvestmentAdvice(Action.REDUCELONG, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }



        let cPS = this.getClosingPointShort(assetInfo, longShortDeltaInPercent, this.liquidityLevel)

        this.logger.log(`${assetInfo.pair} cPS: ${cPS.toFixed(2)} (${pnlShort})`, LogLevel.INFO)

        if (pnlShort > cPS && shortPosition !== undefined && shortPosition.data.size > assetInfo.minTradingAmount) {
            const reason = `we reduce our ${assetInfo.pair} short position to realize ${pnlShort}% profits`
            this.addInvestmentAdvice(Action.REDUCESHORT, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }



        if (this.mostSuccessfulAvailableAsset.symbol !== assetInfo.pair) {
            this.lookForExtremes(assetInfo, longPosition, shortPosition)
        }

    }

    protected sellMostSuccessfulAvailableAsset() {
        if (this.mostSuccessfulAvailableAsset.side === 'Buy') {
            const reason = `we reduce our ${this.mostSuccessfulAvailableAsset.symbol} long position (percentage: ${this.mostSuccessfulAvailableAsset.percentage} by ${this.mostSuccessfulAvailableAsset.minTradingAmount}`
            this.addInvestmentAdvice(Action.REDUCELONG, this.mostSuccessfulAvailableAsset.minTradingAmount, this.mostSuccessfulAvailableAsset.symbol, reason)

        }

        if (this.mostSuccessfulAvailableAsset.side === 'Sell') {
            const reason = `we reduce our ${this.mostSuccessfulAvailableAsset.symbol} short position (percentage: ${this.mostSuccessfulAvailableAsset.percentage} by ${this.mostSuccessfulAvailableAsset.minTradingAmount}`
            this.addInvestmentAdvice(Action.REDUCESHORT, this.mostSuccessfulAvailableAsset.minTradingAmount, this.mostSuccessfulAvailableAsset.symbol, reason)
        }

    }

    protected addToLeastSuccessfulAssetOnUnderRepresentedSide() {

        if (this.leastSuccessfulAssetOnUnderRepresentedSide.side === 'Buy') {
            const reason = `we add ${this.leastSuccessfulAssetOnUnderRepresentedSide.minTradingAmount} to ${this.leastSuccessfulAssetOnUnderRepresentedSide.symbol} long position (percentage: ${this.leastSuccessfulAssetOnUnderRepresentedSide.percentage}`
            this.addInvestmentAdvice(Action.BUY, this.leastSuccessfulAssetOnUnderRepresentedSide.minTradingAmount, this.leastSuccessfulAssetOnUnderRepresentedSide.symbol, reason)

        }

        if (this.leastSuccessfulAssetOnUnderRepresentedSide.side === 'Sell') {
            const reason = `we add ${this.leastSuccessfulAssetOnUnderRepresentedSide.minTradingAmount} to ${this.leastSuccessfulAssetOnUnderRepresentedSide.symbol} short position (percentage: ${this.leastSuccessfulAssetOnUnderRepresentedSide.percentage}`
            this.addInvestmentAdvice(Action.SELL, this.leastSuccessfulAssetOnUnderRepresentedSide.minTradingAmount, this.leastSuccessfulAssetOnUnderRepresentedSide.symbol, reason)
        }

    }

    protected setMostSuccessfulAvailableAsset(): void {

        for (const position of this.fundamentals.positions) {

            const assetInfoForPosition = this.assetInfos.filter((e: AssetInfo) => e.pair === position.data.symbol)[0]
            if (assetInfoForPosition === undefined) continue

            const minTradingAmount = assetInfoForPosition.minTradingAmount

            if (position.data.size > minTradingAmount) {
                const pNLInPercent = FinancialCalculator.getPNLOfPositionInPercent(position)
                if (pNLInPercent > this.mostSuccessfulAvailableAsset.percentage) {
                    this.mostSuccessfulAvailableAsset.percentage = pNLInPercent
                    this.mostSuccessfulAvailableAsset.symbol = position.data.symbol
                    this.mostSuccessfulAvailableAsset.minTradingAmount = minTradingAmount
                    this.mostSuccessfulAvailableAsset.side = position.data.side
                }

            }
        }


    }

    protected setLeastSuccessfulAssetOnUnderRepresentedSide(): void {

        for (const position of this.fundamentals.positions) {

            const assetInfoForPosition = this.assetInfos.filter((e: AssetInfo) => e.pair === position.data.symbol)[0]
            if (assetInfoForPosition === undefined) continue

            const minTradingAmount = assetInfoForPosition.minTradingAmount

            const pNLInPercent = FinancialCalculator.getPNLOfPositionInPercent(position)

            let lsd = FinancialCalculator.getLongShortDeltaInPercent(this.fundamentals.positions, position.data.symbol)

            if (pNLInPercent < this.leastSuccessfulAssetOnUnderRepresentedSide.percentage && Math.abs(lsd) < 70 &&
                ((this.overallLSD > 0 && position.data.side === 'Sell') ||
                    (this.overallLSD < 0 && position.data.side === 'Buy'))) {
                this.leastSuccessfulAssetOnUnderRepresentedSide.percentage = pNLInPercent
                this.leastSuccessfulAssetOnUnderRepresentedSide.symbol = position.data.symbol
                this.leastSuccessfulAssetOnUnderRepresentedSide.minTradingAmount = minTradingAmount
                this.leastSuccessfulAssetOnUnderRepresentedSide.side = position.data.side
            }


        }


    }

    protected lookForExtremes(assetInfo: AssetInfo, longPosition: any, shortPosition: any) {

        let longLowestSinceX = this.getLowestSinceX(assetInfo.longHistory, longPosition.data.unrealised_pnl)
        let shortLowestSinceX = this.getLowestSinceX(assetInfo.shortHistory, shortPosition.data.unrealised_pnl)

        let longHighestSinceX = this.getHighestSinceX(assetInfo.longHistory, longPosition.data.unrealised_pnl)
        let shortHighestSinceX = this.getHighestSinceX(assetInfo.shortHistory, shortPosition.data.unrealised_pnl)

        console.log(`longLowestSinceX: ${longLowestSinceX}`)
        console.log(`shortLowestSinceX: ${shortLowestSinceX}`)
        console.log(`longHighestSinceX: ${longHighestSinceX}`)
        console.log(`shortHighestSinceX: ${shortHighestSinceX}`)


        if (longLowestSinceX >= 100 && (this.liquidityLevel > 7 || (this.liquidityLevel > 1 && this.overallLSD < 0))) {

            const reason = `we enhance our ${assetInfo.pair} long position (lowestSinceX: ${longLowestSinceX} - (${longPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }

        if (shortLowestSinceX >= 100 && (this.liquidityLevel > 7 || (this.liquidityLevel > 1 && this.overallLSD > 0))) {

            const reason = `we enhance our ${assetInfo.pair} short position (shortLowestSinceX: ${shortLowestSinceX} (${shortPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }

    }

    protected getLowestSinceX(history: number[], current: number) {
        let counter = 0
        for (const entry of history) {
            if (current < entry) {
                counter++
            } else if (current > entry) {
                return counter
            }
        }

        return counter
    }

    protected getHighestSinceX(history: number[], current: number) {
        let counter = 0

        for (const entry of history) {
            if (current > entry) {
                counter++
            } else if (current < entry) {
                return counter
            }
        }

        return counter

    }
    protected getAddingPointLong(assetInfo: AssetInfo, lsd: number, ll: number): number {

        if (ll > 2 && lsd < assetInfo.targetLSD) {
            return -1
        } else if (ll > 7 && lsd < assetInfo.maxLSD) {
            return -20
        }

        return -200000

    }


    protected getAddingPointShort(assetInfo: AssetInfo, lsd: number, ll: number): number {

        if (ll > 2 && lsd > assetInfo.targetLSD) {
            return -1
        } else if (ll > 7 && lsd > assetInfo.minLSD) {
            return -20
        }

        return -200000

    }


    protected getClosingPointLong(assetInfo: AssetInfo, lsd: number, ll: number): number {

        if (lsd < assetInfo.minLSD) return 1000000 // we're not selling :)
        if (lsd > assetInfo.targetLSD) return this.generalClosingTrigger - lsd // selling proactively

        return this.generalClosingTrigger // selling at regular profit

    }


    protected getClosingPointShort(assetInfo: AssetInfo, lsd: number, ll: number): number {

        if (lsd > assetInfo.maxLSD) return 1000000 // we're not reducing the short position
        if (lsd < assetInfo.targetLSD) return this.generalClosingTrigger + lsd // reducing short position proactively

        return this.generalClosingTrigger // reducing short position at regular profit

    }


    protected isPreviousAdviceOlderThanXMinutes(minutes: number): boolean {

        const refDate = new Date()

        refDate.setMinutes(refDate.getMinutes() - minutes)

        if (this.lastAdviceDate < refDate) {
            const message = `lastAdviceDate :${this.lastAdviceDate} vs. refDate: ${refDate}`
            this.logger.log(message, 0)
            return true
        }

        return false
    }



    protected getAssetsToPlayWith(): AssetInfo[] {
        return [
            { pair: "ETHUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 20, minLSD: 0, maxLSD: 40, longHistory: [], shortHistory: [], },
            { pair: "ENSUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 20, minLSD: 0, maxLSD: 40, longHistory: [], shortHistory: [], },
            { pair: "BTCUSDT", minTradingAmount: 0.001, decimalPlaces: 3, targetLSD: 10, minLSD: 0, maxLSD: 30, longHistory: [], shortHistory: [], },
            { pair: "UNIUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 10, minLSD: 0, maxLSD: 20, longHistory: [], shortHistory: [], },
            { pair: "LINKUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 10, minLSD: 0, maxLSD: 20, longHistory: [], shortHistory: [], },
            { pair: "AAVEUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 10, minLSD: 0, maxLSD: 20, longHistory: [], shortHistory: [], },
            { pair: "COMPUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 10, minLSD: -2, maxLSD: 20, longHistory: [], shortHistory: [], },
            { pair: "BNBUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "SOLUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ADAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "DOTUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "LUNAUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "BATUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "FILUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "XLMUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "MANAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ICPUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "VETUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "THETAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ETCUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "HBARUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "EGLDUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ATOMUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "TRXUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "BCHUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "MATICUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "LTCUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "SANDUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "BITUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "DYDXUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "FLOWUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "SUSHIUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "CRVUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ENJUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "GALAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "FTMUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "AXSUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "GRTUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "IOTXUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ALGOUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "LRCUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "KSMUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ZECUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "XTZUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "ONEUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "RUNEUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "CHZUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "DOGEUSDT", minTradingAmount: 2, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "XRPUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },
            { pair: "EOSUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longHistory: [], shortHistory: [], },

        ]
    }

}

