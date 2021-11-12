import { LongShortExploitStrategy } from "./src/long-short-exploit-strategy.ts";

const longShortExploitStrategy: LongShortExploitStrategy = new LongShortExploitStrategy()

const testInput = {
    accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
    positions: [],
}


const investmentAdvices = await longShortExploitStrategy.getInvestmentAdvices(testInput)

console.log(investmentAdvices)