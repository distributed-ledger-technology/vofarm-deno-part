import { IExchangeConnector, sleep } from "../../deps.ts";
import { Action, InvestmentAdvice, AssetInfo, VoFarmStrategy } from "../../mod.ts"
import { FinancialCalculator } from "../utilities/financial-calculator.ts"
import { VFLogger } from "../utilities/logger.ts"


export abstract class LongShortClassics implements VoFarmStrategy {

    protected currentInvestmentAdvices: InvestmentAdvice[] = []
    protected lastAdviceDate: Date = new Date()
    protected oPNLClosingLimit: number = 100
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
    protected liquidityLevel = 0
    protected fundamentals: any = {}

    public constructor(private logger: VFLogger) { }

    public abstract setAssetInfo(assetInfo: AssetInfo): void

    public async getInvestmentAdvices(input: any): Promise<InvestmentAdvice[]> {

        if (input.fundamentals === undefined) {
            await this.collectFundamentals(input.exchangeConnector)
        } else {
            this.fundamentals.accountInfo = input.fundamentals.accountInfo
            this.fundamentals.positions = input.fundamentals.positions
        }

        this.advices = []

        await this.hedgeItAll()

        this.advices = this.advices.concat([...this.currentInvestmentAdvices])

        for (const assetInfo of this.assetInfos) {


            try {
                await this.playAsset(assetInfo)
            } catch (error) {
                this.logger.log(`strange situation while playing ${assetInfo.pair}`, 2)
            }

        }


        return this.advices

    }


    protected async hedgeItAll() {
        // .filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]

        let longValue = 0
        let shortValue = 0

        for (const position of this.fundamentals.positions) {
            if (position.data.side === 'Buy') {
                longValue = longValue + position.data.position_value
            } else if (position.data.side === 'Sell') {
                shortValue = shortValue + position.data.position_value
            }
        }

        let valueToBeHedged = longValue - shortValue
        this.logger.log(`we need to hedge ${valueToBeHedged}`, 1)

        if (valueToBeHedged > 100) {
            this.addInvestmentAdvice(Action.SELL, 0.001, 'BTCUSDT', `we adjust the hedge`)
            this.addInvestmentAdvice(Action.SELL, 0.01, 'ETHUSDT', `we adjust the hedge`)
            this.addInvestmentAdvice(Action.SELL, 0.01, 'BNBUSDT', `we adjust the hedge`)
        } else if (valueToBeHedged < -100) {
            this.addInvestmentAdvice(Action.BUY, 0.001, 'BTCUSDT', `we adjust the hedge`)
            this.addInvestmentAdvice(Action.BUY, 0.01, 'ETHUSDT', `we adjust the hedge`)
            this.addInvestmentAdvice(Action.BUY, 0.01, 'BNBUSDT', `we adjust the hedge`)
        }

    }
    protected async playAsset(assetInfo: AssetInfo): Promise<InvestmentAdvice[]> {

        let advicesForAsset: InvestmentAdvice[] = []

        let longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(this.fundamentals.positions, assetInfo.pair)
        let liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20

        let longPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === assetInfo.pair)[0]
        let shortPosition = this.fundamentals.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === assetInfo.pair)[0]

        if (longPosition !== undefined && shortPosition !== undefined && (longPosition.data.leverage < 25 || shortPosition.data.leverage < 25)) {
            throw new Error(`you should adjust the leverage for ${longPosition.data.symbol}`)
        }

        for (const move of Object.values(Action)) {
            // await sleep(0.001)
            advicesForAsset = await this.deriveInvestmentAdvice(assetInfo, move, longShortDeltaInPercent, liquidityLevel, longPosition, shortPosition)
            this.advices = this.advices.concat([...advicesForAsset])
        }


        return this.advices

    }

    protected async collectFundamentals(exchangeConnector: IExchangeConnector) {

        this.fundamentals.accountInfo = await exchangeConnector.getFuturesAccountData()

        if (!(this.fundamentals.accountInfo.result.USDT.equity > 0)) throw new Error(`r u kidding me?`) // also in case the exchange api delivers shit

        this.fundamentals.positions = await exchangeConnector.getPositions()
        this.liquidityLevel = (this.fundamentals.accountInfo.result.USDT.available_balance / this.fundamentals.accountInfo.result.USDT.equity) * 20

        const message = `*********** equity: ${this.fundamentals.accountInfo.result.USDT.equity.toFixed(2)} - ll: ${this.liquidityLevel.toFixed(2)}} ***********`
        this.logger.log(message, 1)

    }

    public getAssetInfo(): AssetInfo {
        return this.assetInfo
    }


    protected getAddingPointLong(lsd: number, ll: number): number {

        let aPL = -1000000

        if (lsd <= 0 && ll > 2) {
            aPL = 0
        } else if (lsd < 80 && ll > 5) {
            aPL = lsd * -1
        }

        return aPL

    }


    protected getAddingPointShort(lsd: number, ll: number): number {

        let aPS = -1000000

        if (lsd >= 0 && ll > 5) {
            aPS = -1
        } else if (lsd > -80 && ll > 6) {
            aPS = lsd
        }

        return aPS

    }


    protected getClosingPointLong(lsd: number, ll: number): number {
        if (ll < 3) {
            return 36
        } else if (lsd < 0) {
            return (lsd * -1 * 11) + 30
        } else {
            return 3 * 11
        }
    }


    protected getClosingPointShort(lsd: number, ll: number): number {
        if (ll < 3) {
            return 36
        } else if (lsd < 0) {
            return 11 * 3
        } else {
            return (lsd * 11) + 30
        }
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


    protected closeAll(AssetInfo: AssetInfo, specificmessage: string, longP: any, shortP: any): void {

        if (longP !== undefined) {

            this.addInvestmentAdvice(Action.REDUCELONG, Number((longP.data.size).toFixed(3)), AssetInfo.pair, `we close ${longP.data.size} ${AssetInfo.pair} long due to ${specificmessage}`)
        }

        if (shortP !== undefined) {

            this.addInvestmentAdvice(Action.REDUCESHORT, Number((shortP.data.size).toFixed(3)), AssetInfo.pair, `we close ${shortP.data.size} ${AssetInfo.pair} short due to ${specificmessage}`)

        }

    }


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

    protected checkSetup(AssetInfo: AssetInfo, longP: any, shortP: any): void {
        if (longP === undefined) {

            this.addInvestmentAdvice(Action.BUY, AssetInfo.minTradingAmount, AssetInfo.pair, `we open a ${AssetInfo.pair} long position to play the game`)

        }

        if (shortP === undefined) {

            this.addInvestmentAdvice(Action.SELL, AssetInfo.minTradingAmount, AssetInfo.pair, `we open a ${AssetInfo.pair} short position to play the game`)

        }
    }

    protected async deriveStandardMoves(assetInfo: AssetInfo, move: Action, lsd: number, ll: number, longP: any, shortP: any): Promise<void> {

        switch (move) {

            case Action.BUY: {

                let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longP)

                let aPL = this.getAddingPointLong(lsd, ll)

                this.logger.log(`${assetInfo.pair} aPL: ${aPL.toFixed(2)} (${pnlLong})`)

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

                this.logger.log(`${assetInfo.pair} aPS: ${aPS.toFixed(2)} (${pnlShort})`)

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

                this.logger.log(`${assetInfo.pair} cPL: ${cPL.toFixed(2)} (${pnlLong})`)

                if (pnlLong > cPL && longP !== undefined && longP.data.size > assetInfo.minTradingAmount) {
                    const reason = `we reduce our ${assetInfo.pair} long position to realize ${pnlLong}% profits`
                    this.addInvestmentAdvice(Action.REDUCELONG, assetInfo.minTradingAmount, assetInfo.pair, reason)
                }

                break

            }

            case Action.REDUCESHORT: {

                let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortP)

                let cPS = this.getClosingPointShort(lsd, ll)

                this.logger.log(`${assetInfo.pair} cPS: ${cPS.toFixed(2)} (${pnlShort})`)

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

        let overallPNL = 0
        try {
            overallPNL = FinancialCalculator.getOverallPNLInPercent(longP, shortP)
        } catch (error) {
            this.logger.log(error.message, 2)
        }

        this.logger.log(`${assetInfo.pair} oPNL: ${overallPNL.toFixed(2)} - lsd: ${lsd.toFixed(2)}`, 2)

        if (ll < 0.01) {
            this.oPNLClosingLimit = this.oPNLClosingLimit - 0.2
        } else {
            this.oPNLClosingLimit = 100
        }

        if (overallPNL > this.oPNLClosingLimit) {
            this.closeAll(assetInfo, `${ll} ${overallPNL}`, longP, shortP)
        } else if (ll > 1) {
            this.checkSetup(assetInfo, longP, shortP)
            if (longP !== undefined && shortP !== undefined) {
                if (ll > 3) {
                    this.balance(assetInfo, longP, shortP, lsd)
                }
                this.narrow(assetInfo, longP, shortP)
            } else {
                this.logger.log(`funny: ${assetInfo.pair}`, 2)
            }
        }

    }

    protected async narrow(assetInfo: AssetInfo, longP: any, shortP: any) {
        if (longP.data.unrealised_pnl < 0 && shortP.data.unrealised_pnl < 0) {
            this.addInvestmentAdvice(Action.SELL, assetInfo.minTradingAmount, assetInfo.pair, `narrowing ${assetInfo.pair} `)
            this.addInvestmentAdvice(Action.BUY, assetInfo.minTradingAmount, assetInfo.pair, `narrowing ${assetInfo.pair} `)
        }
    }

    protected async balance(assetInfo: AssetInfo, longP: any, shortP: any, lsd: number) {
        if (assetInfo.pair === "ENSUSDT") {
            this.logger.log(lsd.toString(), 2)
        }
        if (lsd > 60) {
            const amountToBeShortSold = Number((longP.data.size - shortP.data.size).toFixed(assetInfo.decimalPlaces))
            this.addInvestmentAdvice(Action.SELL, amountToBeShortSold, assetInfo.pair, `balancing ${assetInfo.pair} `)
        } else if (lsd < -60) {
            const amountToBeBought = Number((shortP.data.size - longP.data.size).toFixed(assetInfo.decimalPlaces))
            this.addInvestmentAdvice(Action.BUY, amountToBeBought, assetInfo.pair, `balancing ${assetInfo.pair} `)
        }

    }
}

