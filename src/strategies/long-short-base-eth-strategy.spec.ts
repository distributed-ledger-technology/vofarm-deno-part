import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts"
import { Action } from "../interfaces/action.ts"
import { InvestmentAdvice } from "../interfaces/investment-advice.ts"
import { InvestmentDecisionBaseLongShortExploit } from "../interfaces/investment-decision-base-long-short-exploit.ts"
import { VFLogger } from "../utilities/logger.ts";
import { LongShortBaseETHStrategy } from "./long-short-base-eth-strategy.ts"

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
            { action: Action.BUY, amount: 0.01, pair: "ETHUSDT", reason: "we open a ETHUSDT long position to play the game" },
            { action: Action.SELL, amount: 0.01, pair: "ETHUSDT", reason: "we open a ETHUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'ETHUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -20 } },
                { data: { side: "Sell", symbol: 'ETHUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
        },
        output: [{ action: Action.BUY, amount: 0.01, pair: "ETHUSDT", reason: "we enhance our ETHUSDT long position (at a pnl of: -400%) by 0.01" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'ETHUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", symbol: 'ETHUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -15 } }],
        },
        output: [{ action: Action.SELL, amount: 0.01, pair: "ETHUSDT", reason: "we enhance our ETHUSDT short position (at a pnl of: -300%) by 0.01" }]
    },
    // {
    //     input: {
    //         accountInfo: { result: { USDT: { available_balance: 50, equity: 100 } } },
    //         positions: [
    //             { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.004, position_value: 1180, leverage: 100, unrealised_pnl: 0.001 } },
    //             { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.02, position_value: 2900, leverage: 100, unrealised_pnl: 0.001 } }],
    //     },
    //     output: []
    // }
]
Deno.test("should return great investment advices", async () => {

    const strategy: LongShortBaseETHStrategy = new LongShortBaseETHStrategy(new VFLogger("123apikeyunittest"))

    for (const testSet of testSets) {
        let inputForStrategy = { fundamentals: testSet.input }

        const investmentAdvices: InvestmentAdvice[] = await strategy.getInvestmentAdvices(inputForStrategy)

        assertEquals(investmentAdvices, testSet.output)

    }

})