import { LongShortExploitStrategy } from "./src/long-short-exploit-strategy.ts";

const longShortExploitStrategy: LongShortExploitStrategy = new LongShortExploitStrategy()

const testInput1 = {
    accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
    positions: [],
}

let investmentAdvices = await longShortExploitStrategy.getInvestmentAdvices(testInput1)

console.log(`\ngiven testInput1, this strategy recommends to: ${JSON.stringify(investmentAdvices)}`)

const testInput2 = {
    accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
    positions: [
        { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -20 } },
        { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
}

investmentAdvices = await longShortExploitStrategy.getInvestmentAdvices(testInput2)

console.log(`\ngiven testInput2, this strategy recommends to: ${JSON.stringify(investmentAdvices)}`)
