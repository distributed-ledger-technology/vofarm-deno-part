import { IExchangeConnector } from "../../deps.ts";
import { Action, InvestmentAdvice, AssetInfo, LogLevel } from "../../mod.ts"
import { FinancialCalculator } from "../utilities/financial-calculator.ts"
import { VFLogger } from "../utilities/logger.ts";

import { VoFarmStrategy } from "./vofarm-strategy.ts";

export abstract class LongShortClassics extends VoFarmStrategy {

    protected overallLSD: number = 0
    protected overallPNL: number = 0
    protected generalClosingTrigger: number = 100
    protected assetInfos: AssetInfo[]

    public constructor(logger: VFLogger) {
        super(logger)
        this.assetInfos = this.getAssetsToPlayWith()
    }

    public async getInvestmentAdvices(input: any): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        if (input.fundamentals === undefined) {
            await this.collectFundamentals(input.exchangeConnector)
        } else {
            this.fundamentals.accountInfo = input.fundamentals.accountInfo
            this.fundamentals.positions = input.fundamentals.positions
        }

        this.liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20

        this.setGeneralClosingTrigger()

        this.overallLSD = this.getOverallLSD()

        this.logger.log(`overallLSD: ${this.overallLSD.toFixed(2)}`, 1)

        for (const assetInfo of this.assetInfos) {

            try {
                await this.playAsset(assetInfo, input.exchangeConnector)
            } catch (error) {
                this.logger.log(`strange situation while playing ${assetInfo.pair}: ${error}`, 2)
            }

        }

        return this.currentInvestmentAdvices

    }

    protected setGeneralClosingTrigger(): void {
        if (this.liquidityLevel < 0.01) {
            this.generalClosingTrigger = this.generalClosingTrigger - 10
        } else if (this.liquidityLevel < 0.3 && this.generalClosingTrigger > 24) {
            this.generalClosingTrigger = this.generalClosingTrigger - 1
        } else {
            this.generalClosingTrigger = 100
        }
    }

    protected async playAsset(assetInfo: AssetInfo, exchangeConnector: IExchangeConnector): Promise<void> {

        let longPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]
        let shortPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === assetInfo.pair)[0]

        assetInfo.longPercentageHistory.unshift(longPosition.data.unrealised_pnl)
        assetInfo.shortPercentageHistory.unshift(shortPosition.data.unrealised_pnl)

        if (assetInfo.longPercentageHistory.length > 1000) {
            console.log("splicing")
            assetInfo.longPercentageHistory.splice(assetInfo.longPercentageHistory.length - 1, 1)
            assetInfo.shortPercentageHistory.splice(assetInfo.shortPercentageHistory.length - 1, 1)
        }

        if (longPosition === undefined || shortPosition === undefined) {
            this.ensureLongShortSetup(assetInfo, longPosition, shortPosition)
            return
        }

        let longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(this.fundamentals.positions, assetInfo.pair)

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

        console.log(this.currentInvestmentAdvices.length)
        if (this.currentInvestmentAdvices.length === 0) {
            this.lookForExtremes(assetInfo, longPosition, shortPosition)
        }

    }

    protected lookForExtremes(assetInfo: AssetInfo, longPosition: any, shortPosition: any) {

        let longLowestSinceX = this.getLowestSinceX(assetInfo.longPercentageHistory, longPosition.data.unrealised_pnl)
        let shortLowestSinceX = this.getLowestSinceX(assetInfo.shortPercentageHistory, shortPosition.data.unrealised_pnl)

        let longHighestSinceX = this.getHighestSinceX(assetInfo.longPercentageHistory, longPosition.data.unrealised_pnl)
        let shortHighestSinceX = this.getHighestSinceX(assetInfo.shortPercentageHistory, shortPosition.data.unrealised_pnl)

        console.log(`longLowestSinceX: ${longLowestSinceX}`)
        console.log(`shortLowestSinceX: ${shortLowestSinceX}`)
        console.log(`longHighestSinceX: ${longHighestSinceX}`)
        console.log(`shortHighestSinceX: ${shortHighestSinceX}`)

        if (longLowestSinceX >= 20 && this.liquidityLevel > 5) {

            const reason = `we enhance our ${assetInfo.pair} long position (lowestSinceX: ${longLowestSinceX} - (${longPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }

        if (shortLowestSinceX >= 20 && this.liquidityLevel > 5) {

            const reason = `we enhance our ${assetInfo.pair} short position (shortLowestSinceX: ${shortLowestSinceX} (${shortPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, reason)
        }

        if (longHighestSinceX >= 1000) {

            const reason = `we reduce our ${assetInfo.pair} long position (longHighestSinceX: ${longHighestSinceX} - (${longPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.REDUCELONG, assetInfo.minTradingAmount, assetInfo.pair, reason)

        }

        if (shortHighestSinceX >= 1000) {

            const reason = `we reduce our ${assetInfo.pair} short position (shortHighestSinceX: ${shortHighestSinceX} - (${shortPosition.data.unrealised_pnl})) by ${assetInfo.minTradingAmount}`
            this.addInvestmentAdvice(Action.REDUCESHORT, assetInfo.minTradingAmount, assetInfo.pair, reason)

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

        if (ll > 5 && lsd < 0) {
            return -1
        } else if (ll > 7 && lsd < assetInfo.maxLSD) {
            return -20
        }

        return -200000

    }


    protected getAddingPointShort(assetInfo: AssetInfo, lsd: number, ll: number): number {

        if (ll > 5 && lsd > 0) {
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
            { pair: "ETHUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 40, minLSD: 10, maxLSD: 70, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ENSUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 40, minLSD: 10, maxLSD: 70, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "BTCUSDT", minTradingAmount: 0.001, decimalPlaces: 3, targetLSD: 15, minLSD: 0, maxLSD: 30, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "UNIUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 15, minLSD: 0, maxLSD: 30, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "LINKUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 15, minLSD: 0, maxLSD: 30, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "AAVEUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 15, minLSD: 0, maxLSD: 30, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "COMPUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 10, minLSD: -2, maxLSD: 20, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "BNBUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "SOLUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ADAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "DOTUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "LUNAUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "BATUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "FILUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "XLMUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "MANAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ICPUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "VETUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "THETAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ETCUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "HBARUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "EGLDUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ATOMUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "TRXUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "BCHUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "MATICUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "LTCUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "SANDUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "BITUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "DYDXUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "FLOWUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "SUSHIUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "CRVUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ENJUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: 0, minLSD: -2, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "GALAUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "FTMUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "AXSUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "GRTUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "IOTXUSDT", minTradingAmount: 10, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ALGOUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "LRCUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "KSMUSDT", minTradingAmount: 0.1, decimalPlaces: 1, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ZECUSDT", minTradingAmount: 0.01, decimalPlaces: 2, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "XTZUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "ONEUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "RUNEUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "CHZUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "DOGEUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "XRPUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },
            { pair: "EOSUSDT", minTradingAmount: 1, decimalPlaces: 0, targetLSD: -2, minLSD: -6, maxLSD: 5, longPercentageHistory: [], shortPercentageHistory: [], },

        ]
    }

}

