# VoFarm - Volatility Farming
A peer 2 peer approach to increase price stability and to reduce price manipulation by exploiting non-fundamentals-based volatility.   

This module leverages [web3](https://deno.land/x/web3) and the [exchange connectors](https://deno.land/x/exchange_connectors).  

Open Source Developers are invited to propose further strategies via Pull Requests.   

## Usage Examples Regarding Centralized Volatility Farming
```sh
deno run --allow-net src/start-centralized-vofarming.ts <yourbybitapikey> <yourbybitapisecret> BybitConnector LongShortBaseCombinedStrategy
```

## Usage Examples Regarding Decentralized Volatility Farming
... under construction on Arbitrum ... 

## Unit Tests

```sh  

deno test https://deno.land/x/vofarm/src/strategies/long-short-base-eth-strategy.spec.ts  

deno test https://deno.land/x/vofarm/src/strategies/long-short-base-btc-strategy.spec.ts  

```

For further examples you might want to check some - e.g. [unit tests](https://github.com/distributed-ledger-technology/vofarm-centralized-variant-as-template/blob/main/src/long-short-exploit-strategy.spec.ts)
