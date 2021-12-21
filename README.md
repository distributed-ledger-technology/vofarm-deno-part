# VoFarm - Volatility Farming
A peer 2 peer approach to increase price stability and to reduce price manipulation by exploiting non-fundamentals-based volatility.   

This module leverages [web3](https://deno.land/x/web3) and the [exchange connectors](https://deno.land/x/exchange_connectors).  

Open Source Developers are invited to propose further strategies via Pull Requests.   

## Usage Examples Regarding Centralized Volatility Farming
```sh
deno run --allow-net https://deno.land/x/vofarm@v1.0.0/src/start-centralized-vofarming.ts <yourbybitapikey> <yourbybitapisecret> BybitConnector LongShortClassics VFLogger 0 22
```


## Usage Examples Regarding Decentralized Volatility Farming
... under construction on Arbitrum ... 

## Unit Tests

```sh  

deno test https://deno.land/x/vofarm@v1.0.2/src/strategies/long-short-classics-strategy.ts

deno test https://deno.land/x/vofarm@v1.0.2/src/strategies/vofarm-strategy.ts

```

For further examples you might want to check some - e.g. [unit tests](https://github.com/distributed-ledger-technology/vofarm-centralized-variant-as-template/blob/main/src/long-short-exploit-strategy.spec.ts)
