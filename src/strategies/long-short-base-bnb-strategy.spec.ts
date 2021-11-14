import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts"
import { Action } from "../interfaces/action.ts"
import { InvestmentAdvice } from "../interfaces/investment-advice.ts"
import { InvestmentDecisionBaseLongShortExploit } from "../interfaces/investment-decision-base-long-short-exploit.ts"
import { VFLogger } from "../utilities/logger.ts";
import { LongShortBaseBNBStrategy } from "./long-short-base-bnb-strategy.ts"

export interface ITestData {
    input: InvestmentDecisionBaseLongShortExploit,
    output: InvestmentAdvice[]
}


const testSets: ITestData[] = [
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [],
        },
        output: [
            { action: Action.BUY, amount: 0.1, pair: "BNBUSDT", reason: "we open a BNBUSDT long position to play the game" },
            { action: Action.SELL, amount: 0.1, pair: "BNBUSDT", reason: "we open a BNBUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BNBUSDT', size: 0.1, position_value: 500, leverage: 100, unrealised_pnl: -20 } },
                { data: { side: "Sell", symbol: 'BNBUSDT', size: 0.1, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
        },
        output: [{ action: Action.BUY, amount: 0.1, pair: "BNBUSDT", reason: "we enhance our BNBUSDT long position (at a pnl of: -400%) by 0.1" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BNBUSDT', size: 0.1, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", symbol: 'BNBUSDT', size: 0.1, position_value: 500, leverage: 100, unrealised_pnl: -15 } }],
        },
        output: [{ action: Action.SELL, amount: 0.1, pair: "BNBUSDT", reason: "we enhance our BNBUSDT short position (at a pnl of: -300%) by 0.1" }]
    },
]
Deno.test("should return great investment advices", async () => {

    const strategy: LongShortBaseBNBStrategy = new LongShortBaseBNBStrategy(new VFLogger("123apikeyunittest"))

    for (const testSet of testSets) {
        let inputForStrategy = { fundamentals: testSet.input }

        const investmentAdvices: InvestmentAdvice[] = await strategy.getInvestmentAdvices(inputForStrategy)

        assertEquals(investmentAdvices, testSet.output)

    }

})