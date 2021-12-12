import { VoFarmStrategy } from "./interfaces/vofarm-strategy.ts"
import { VolatilityFarmer } from "./vofarmer.ts"
import { BybitConnector, IExchangeConnector, Registry } from "../deps.ts"
import { IVFLogger } from "./interfaces/logger.ts"
import { VFLogger } from "./utilities/logger.ts"
import { LongShortBaseBTCStrategy } from "./strategies/long-short-base-btc-strategy.ts";
import { LongShortBaseETHStrategy } from "./strategies/long-short-base-eth-strategy.ts";
import { LongShortBaseBNBStrategy } from "./strategies/long-short-base-bnb-strategy.ts";
import { LongShortBaseCombinedStrategy } from "./strategies/long-short-base-combined-strategy.ts";
import { LongShortClassics } from "./strategies/long-short-classics-strategy.ts";

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]

const exchangeConnectorClassName = (Deno.args[2] === undefined) ? "BybitConnector" : Deno.args[2]
const voFarmStrategyClassName = (Deno.args[3] === undefined) ? "LongShortExploitStrategy" : Deno.args[3]
const loggerClassName = (Deno.args[4] === undefined) ? 'VFLogger' : Deno.args[4]

const registryVoFarmStrategies = new Registry()
const registryExchangeConnectors = new Registry()
const registryLoggerServices = new Registry()

registryVoFarmStrategies.register(LongShortBaseETHStrategy)
registryVoFarmStrategies.register(LongShortBaseBTCStrategy)
registryVoFarmStrategies.register(LongShortBaseBNBStrategy)
registryVoFarmStrategies.register(LongShortClassics)
registryVoFarmStrategies.register(LongShortBaseCombinedStrategy)

registryExchangeConnectors.register(BybitConnector)
registryLoggerServices.register(VFLogger)

const exchangeConnector: IExchangeConnector = new (registryExchangeConnectors.get(exchangeConnectorClassName))(apiKey, apiSecret)
const vfLogger: IVFLogger = new (registryLoggerServices.get(loggerClassName))(apiKey, 1)
const voFarmStrategies: VoFarmStrategy = new (registryVoFarmStrategies.get(voFarmStrategyClassName))(vfLogger)

const volatilityFarmer: VolatilityFarmer = new VolatilityFarmer(exchangeConnector, voFarmStrategies, vfLogger)

const intervalLengthInSeconds = 11
volatilityFarmer.farm(intervalLengthInSeconds)

