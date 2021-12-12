import { IExchangeConnector, sleep } from "../deps.ts"
import { Action } from "./interfaces/action.ts"
import { InvestmentAdvice } from "./interfaces/investment-advice.ts"
import { VoFarmStrategy } from "./interfaces/vofarm-strategy.ts"
import { IVFLogger } from "./interfaces/logger.ts"


export interface IActiveProcess {
    apiKey: string,
    exchangeConnector: IExchangeConnector,
    intervalId: number,
    iterationCounter: number
    pair: string
    tradingAmount: number
}


export class VolatilityFarmer {

    public static activeProcesses: IActiveProcess[] = []

    public constructor(private exchangeConnector: IExchangeConnector, private voFarmStrategy: VoFarmStrategy, private logger: IVFLogger) { }

    public async farm(intervalLengthInSeconds: number): Promise<void> {

        this.checkParameters(intervalLengthInSeconds)

        setInterval(async () => {

            try {

                await this.playTheGame()
                sleep(Math.round(Math.random() * (2200 - 1) + 1) / 1000)

            } catch (error) {

                console.log(error.message)

            }

        }, intervalLengthInSeconds * 1000)

    }

    protected async playTheGame(): Promise<void> {

        let inputForStrategy = { exchangeConnector: this.exchangeConnector }

        const investmentAdvices = await this.voFarmStrategy.getInvestmentAdvices(inputForStrategy)
        console.log(investmentAdvices.length)
        await sleep(0.1)
        await this.applyInvestmentAdvices(investmentAdvices)

    }





    protected async applyInvestmentAdvices(investmentAdvices: InvestmentAdvice[]): Promise<void> {

        const message = `applying ${investmentAdvices.length} investment advices`
        console.log(JSON.stringify(investmentAdvices))
        await this.logger.log(message)

        for (const investmentAdvice of investmentAdvices) {
            let r

            if (investmentAdvice.action === Action.BUY) {

                r = await this.exchangeConnector.buyFuture(investmentAdvice.pair, investmentAdvice.amount, false)

            } else if (investmentAdvice.action === Action.SELL) {

                r = await this.exchangeConnector.sellFuture(investmentAdvice.pair, investmentAdvice.amount, false)

            } else if (investmentAdvice.action === Action.REDUCELONG) {

                r = await this.exchangeConnector.sellFuture(investmentAdvice.pair, investmentAdvice.amount, true)

            } else if (investmentAdvice.action === Action.REDUCESHORT) {

                r = await this.exchangeConnector.buyFuture(investmentAdvice.pair, investmentAdvice.amount, true)

            }

        }

    }



    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 4) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

