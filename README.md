# VoFarm - Volatility Farming
A peer 2 peer approach to increase price stability and to reduce price manipulation by exploiting non-fundamentals-based volatility.   

Open Source Developers are invited to propose further strategies via Pull Requests.   

## Usage Examples Regarding Strategies Reuse
### Via Commandline
```sh
deno run https://deno.land/x/vofarm/usage-example.ts
```

### Via Your Own Code
```ts 

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


```

### Via Comandline Unit Tests Execution
```sh
deno test https://deno.land/x/vofarm/src/long-short-exploit-strategy.spec.ts
```


## Usage Examples Regarding Centralized Volatility Farming
```sh
deno run --allow-net src/start-centralized-vofarming.ts <yourbybitapikey> <yourbybitapisecret> <yourmongodbuser> <yourmongodbpw> LongShortExploitStrategy BybitConnector MongoService <yourmongodbhostip> <yourmongodbport> VFLogger
```

## Unit Tests
For further examples you might want to check some - e.g. [unit tests](https://github.com/distributed-ledger-technology/vofarm-centralized-variant-as-template/blob/main/src/long-short-exploit-strategy.spec.ts)
