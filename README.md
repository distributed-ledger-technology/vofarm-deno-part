# VoFarm - Volatility Farming
This module represents a bunch of VoFarm strategies and minor additional features.

## Usage Examples
### Via Commandline
```sh
deno run https://deno.land/x/vofarm/usage-example.ts
```

### Via Your Own Code
```ts 

import { LongShortExploitStrategy } from "./src/long-short-exploit-strategy.ts";

const longShortExploitStrategy: LongShortExploitStrategy = new LongShortExploitStrategy()

const testInput = {
    accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
    positions: [],
}

const investmentAdvices = await longShortExploitStrategy.getInvestmentAdvices(testInput)

console.log(investmentAdvices)

```

### Via Comandline Unit Tests Execution
```sh
deno test https://deno.land/x/vofarm/src/long-short-exploit-strategy.spec.ts
```



## Unit Tests
For further examples you might want to check some - e.g. [unit tests](https://github.com/distributed-ledger-technology/vofarm-centralized-variant-as-template/blob/main/src/long-short-exploit-strategy.spec.ts)