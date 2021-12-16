import { IExchangeConnector } from "../../deps.ts";
import { Action, InvestmentAdvice, AssetInfo, LogLevel } from "../../mod.ts"
import { FinancialCalculator } from "../utilities/financial-calculator.ts"
import { VFLogger } from "../utilities/logger.ts";

import { VoFarmStrategy } from "./vofarm-strategy.ts";


export abstract class LongShortClassics extends VoFarmStrategy {

    protected pNLClosingLimit: number = 100
    protected overallLSD: number = 0
    protected advices: InvestmentAdvice[] = []
    protected assetInfo: AssetInfo = { pair: "ETHUSDT", minTradingAmount: 0.01, decimalPlaces: 2 }
    protected assetInfos: AssetInfo[] = [
        { pair: "ETHUSDT", minTradingAmount: 0.01, decimalPlaces: 2 },
        { pair: "BTCUSDT", minTradingAmount: 0.001, decimalPlaces: 3 },
        { pair: "BNBUSDT", minTradingAmount: 0.01, decimalPlaces: 2 },
        { pair: "SOLUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "ADAUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "DOTUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "LUNAUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "UNIUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "BATUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "LINKUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "FILUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "XLMUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "MANAUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "ICPUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "VETUSDT", minTradingAmount: 10, decimalPlaces: 0 },
        { pair: "AAVEUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "COMPUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "XTZUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "THETAUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "ETCUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "HBARUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "EGLDUSDT", minTradingAmount: 0.01, decimalPlaces: 2 },
        { pair: "ATOMUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "TRXUSDT", minTradingAmount: 10, decimalPlaces: 0 },
        { pair: "ALGOUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "BCHUSDT", minTradingAmount: 0.01, decimalPlaces: 2 },
        { pair: "MATICUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "DOGEUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "XRPUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "LTCUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "SANDUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "BITUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "IOTXUSDT", minTradingAmount: 10, decimalPlaces: 0 },
        { pair: "DYDXUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "SUSHIUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "CRVUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "ENJUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "AXSUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "FTMUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "GALAUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "EOSUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "LRCUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "GRTUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "FLOWUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "KSMUSDT", minTradingAmount: 0.1, decimalPlaces: 1 },
        { pair: "ZECUSDT", minTradingAmount: 0.01, decimalPlaces: 2 },
        { pair: "ONEUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "RUNEUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        { pair: "CHZUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        // { pair: "ENSUSDT", minTradingAmount: 1, decimalPlaces: 0 },
        // { pair: "HNTUSDT", minTradingAmount: 1 },
        // { pair: "MKRUSDT", minTradingAmount: 1 },
    ]

    public constructor(logger: VFLogger) {
        super(logger)
    }

    public async getInvestmentAdvices(input: any): Promise<InvestmentAdvice[]> {

        if (input.fundamentals === undefined) {
            await this.collectFundamentals(input.exchangeConnector)
        } else {
            this.fundamentals.accountInfo = input.fundamentals.accountInfo
            this.fundamentals.positions = input.fundamentals.positions
        }

        this.liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20
        this.advices = []

        let longValue = 0
        let shortValue = 0

        for (const position of this.fundamentals.positions) {
            if (position.data.side === 'Buy') {
                longValue = longValue + position.data.position_value
            } else if (position.data.side === 'Sell') {
                shortValue = shortValue + position.data.position_value
            }
        }

        this.overallLSD = longValue - shortValue
        this.logger.log(`overallLSD: ${this.overallLSD.toFixed(2)} - pNLClosingLimit: ${this.pNLClosingLimit}`, 1)

        try {
            if (this.liquidityLevel > 1) {
                this.hedgeItAll()
            }
        } catch (error) {
            this.logger.log(`strange situation while hedging it all`, 2)
        }

        this.advices = this.advices.concat([...this.currentInvestmentAdvices])

        if (this.liquidityLevel < 0.01) {
            this.pNLClosingLimit = this.pNLClosingLimit - 1
        } else {
            this.pNLClosingLimit = 100
        }


        for (const assetInfo of this.assetInfos) {

            try {
                await this.playAsset(assetInfo, input.exchangeConnector)
            } catch (error) {
                this.logger.log(`strange situation while playing ${assetInfo.pair}: ${error}`, 2)
            }

        }


        return this.advices

    }


    protected hedgeItAll(): void {

        let overallHedgeOptionFound = false

        if (this.overallLSD > 2000) {

            for (const assetInfo of this.assetInfos) {
                let shortPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === assetInfo.pair)[0]
                if (shortPosition.data.unrealised_pnl < 0) {
                    this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, `we adjust the hedge by short selling ${assetInfo.pair}`)
                    overallHedgeOptionFound = true
                }
            }

            if (overallHedgeOptionFound === false) {
                this.addInvestmentAdvice(Action.SELL, 0.01, 'BTCUSDT', `we emergency adjust the hedge by short selling BTCUSDT`)
            }

        } else if (this.overallLSD < 0) {

            for (const assetInfo of this.assetInfos) {
                let longPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]
                if (longPosition.data.unrealised_pnl < 0) {
                    this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, `we adjust the hedge by buying ${assetInfo.pair}`)
                    overallHedgeOptionFound = true
                }
            }

            if (overallHedgeOptionFound === false) {
                this.addInvestmentAdvice(Action.BUY, 0.1, 'ETHUSDT', `we emergency adjust the hedge by buying ETHUSDT`)
                this.addInvestmentAdvice(Action.BUY, 0.1, 'ENSUSDT', `we emergency adjust the hedge by buying ENSUSDT`)
            }
        }

    }


    protected async playAsset(assetInfo: AssetInfo, exchangeConnector: IExchangeConnector): Promise<InvestmentAdvice[]> {

        let advicesForAsset: InvestmentAdvice[] = []

        let longPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]
        let shortPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === assetInfo.pair)[0]
        let longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(this.fundamentals.positions, assetInfo.pair)

        if (longPosition !== undefined && shortPosition !== undefined && (longPosition.data.leverage < 25 || shortPosition.data.leverage < 25)) {
            await exchangeConnector.setLeverage(assetInfo.pair, 25)
        }

        for (const move of Object.values(Action)) {
            advicesForAsset = await this.deriveInvestmentAdvice(assetInfo, move, longShortDeltaInPercent, this.liquidityLevel, longPosition, shortPosition)
            this.advices = this.advices.concat([...advicesForAsset])
        }


        return this.advices

    }


    protected getAddingPointLong(lsd: number, ll: number): number {
        if (ll > 0.5) {
            if (lsd < 0) {
                return -1
            } else {
                return (lsd * -3) - 11
            }
        }
        return -200000

    }


    protected getAddingPointShort(lsd: number, ll: number): number {
        if (ll > 0.5) {
            if (lsd > 0) {
                return -1
            } else {
                return (Math.abs(lsd) * -3) - 11
            }

        }
        return -200000

    }


    protected getClosingPointLong(lsd: number, ll: number): number {
        let cPL = 0
        if (lsd > 0) {
            cPL = this.pNLClosingLimit - lsd + ll
        } else {
            cPL = this.pNLClosingLimit + Math.abs(lsd) + ll
        }

        if (cPL < 24) {
            cPL = 200000
        }

        return cPL
    }


    protected getClosingPointShort(lsd: number, ll: number): number {
        let cPS = 0

        if (lsd < 0) {
            cPS = this.pNLClosingLimit - Math.abs(lsd) + ll
        } else {
            cPS = this.pNLClosingLimit + lsd + ll
        }

        if (cPS < 24) {
            cPS = 200000
        }

        return cPS
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

    protected async deriveInvestmentAdvice(assetInfo: AssetInfo, move: Action, lsd: number, ll: number, longP: any, shortP: any): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        if (move === Action.PAUSE) { // here just to ensure the following block is executed only once

            this.deriveSpecialMoves(assetInfo, ll, longP, shortP, lsd)

        } else if (this.currentInvestmentAdvices.length === 0) {

            await this.deriveStandardMoves(assetInfo, move, lsd, ll, longP, shortP)

        }

        return this.currentInvestmentAdvices

    }


    protected async deriveStandardMoves(assetInfo: AssetInfo, move: Action, lsd: number, ll: number, longP: any, shortP: any): Promise<void> {

        switch (move) {

            case Action.BUY: {

                let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longP)

                let aPL = this.getAddingPointLong(lsd, ll)

                this.logger.log(`${assetInfo.pair} aPL: ${aPL.toFixed(2)} (${pnlLong})`, LogLevel.INFO)

                if (pnlLong < aPL) {
                    let factor = Math.floor(Math.abs(lsd) / 10)
                    if (factor < 1) factor = 1
                    const amount = Number((assetInfo.minTradingAmount * factor).toFixed(3))
                    const reason = `we enhance our ${assetInfo.pair} long position (at a pnl of: ${pnlLong}%) by ${amount}`
                    this.addInvestmentAdvice(Action.BUY, amount, assetInfo.pair, reason)
                }

                break

            }

            case Action.SELL: {

                let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortP)

                let aPS = this.getAddingPointShort(lsd, ll)

                this.logger.log(`${assetInfo.pair} aPS: ${aPS.toFixed(2)} (${pnlShort})`, LogLevel.INFO)

                if (pnlShort < aPS) {

                    let factor = Math.floor(Math.abs(lsd) / 10)
                    if (factor < 1) factor = 1
                    const amount = Number((assetInfo.minTradingAmount * factor).toFixed(3))
                    const reason = `we enhance our ${assetInfo.pair} short position (at a pnl of: ${pnlShort}%) by ${amount}`
                    this.addInvestmentAdvice(Action.SELL, amount, assetInfo.pair, reason)
                }

                break
            }

            case Action.REDUCELONG: {

                let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longP)

                let cPL = this.getClosingPointLong(lsd, ll)

                this.logger.log(`${assetInfo.pair} cPL: ${cPL.toFixed(2)} (${pnlLong})`, LogLevel.INFO)

                if (pnlLong > cPL && longP !== undefined && longP.data.size > assetInfo.minTradingAmount) {
                    const reason = `we reduce our ${assetInfo.pair} long position to realize ${pnlLong}% profits`
                    this.addInvestmentAdvice(Action.REDUCELONG, assetInfo.minTradingAmount, assetInfo.pair, reason)
                }

                break

            }

            case Action.REDUCESHORT: {

                let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortP)

                let cPS = this.getClosingPointShort(lsd, ll)

                this.logger.log(`${assetInfo.pair} cPS: ${cPS.toFixed(2)} (${pnlShort})`, LogLevel.INFO)

                if (pnlShort > cPS && shortP !== undefined && shortP.data.size > assetInfo.minTradingAmount) {
                    const reason = `we reduce our ${assetInfo.pair} short position to realize ${pnlShort}% profits`
                    this.addInvestmentAdvice(Action.REDUCESHORT, assetInfo.minTradingAmount, assetInfo.pair, reason)
                }

                break

            }

            default: throw new Error(`you detected an interesting situation`)

        }
    }


    protected deriveSpecialMoves(assetInfo: AssetInfo, ll: number, longP: any, shortP: any, lsd: number): void {

        if (longP === undefined || shortP === undefined) {
            this.ensureLongShortSetup(assetInfo, longP, shortP)
            return
        }

        let overallPNL = 0
        try {
            overallPNL = FinancialCalculator.getOverallPNLInPercent(longP, shortP)
        } catch (error) {
            this.logger.log(error.message, 2)
        }

        this.logger.log(`${assetInfo.pair} oPNL: ${overallPNL.toFixed(2)} (l: ${longP.data.unrealised_pnl.toFixed(2)} s: ${shortP.data.unrealised_pnl.toFixed(2)}) - lsd: ${lsd.toFixed(2)}`, 2)

        if (ll > 0.5) {
            if (longP !== undefined && shortP !== undefined) {
                this.narrowLongShortDiffPNL(assetInfo, longP, shortP)
            } else {
                this.logger.log(`funny: ${assetInfo.pair}`, 2)
            }
        } else if (this.pNLClosingLimit < 12 && ll < 0.1) {
            this.addInvestmentAdvice(Action.REDUCELONG, 10, 'ENSUSDT', `we emergency reduce long ENSUSDT`)
            this.addInvestmentAdvice(Action.REDUCELONG, 0.01, 'ETHUSDT', `we emergency reduce long ETHUSDT`)
            this.addInvestmentAdvice(Action.REDUCESHORT, 0.001, 'BTCUSDT', `we emergency reduce short BTCUSDT`)
        }

    }
}

