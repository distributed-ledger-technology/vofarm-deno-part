import { VoFarmStrategy } from "./interfaces/vofarm-strategy.ts"
import { IPersistenceService } from "./interfaces/persistence.ts"
import { MongoService } from "./utilities/mongo-service.ts"
import { VolatilityFarmer } from "./vofarmer.ts"
import { BybitConnector, IExchangeConnector, Registry } from "../deps.ts"
import { LongShortExploitStrategy } from "./long-short-exploit-strategy.ts"
import { IVFLogger } from "./interfaces/logger.ts"
import { VFLogger } from "./utilities/logger.ts"


// get parameters
const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]
const dbUser = Deno.args[2]
const dbPW = Deno.args[3]
const voFarmStrategyClassName = (Deno.args[4] === undefined) ? "LongShortExploitStrategy" : Deno.args[4]
const exchangeConnectorClassName = (Deno.args[5] === undefined) ? "BybitConnector" : Deno.args[5]
const persistenceServiceClassName = (Deno.args[6] === undefined) ? "MongoService" : Deno.args[6]
const persistenceHost = (Deno.args[7] === undefined) ? '65.21.110.40' : Deno.args[7]
const persistencePort = (Deno.args[8] === undefined) ? '27017' : Deno.args[8]
const loggerClassName = (Deno.args[9] === undefined) ? 'VFLogger' : Deno.args[9]


// Dependent On Components Handling
const registryInvestmentAdvisors = new Registry()
const registryExchangeConnectors = new Registry()
const registryPersistenceServices = new Registry()
const registryLoggerServices = new Registry()

// registryInvestmentAdvisors.register(ETHLongWithHiddenOverallHedge)
registryInvestmentAdvisors.register(LongShortExploitStrategy)
registryInvestmentAdvisors.register(LongShortExploitStrategy)
registryExchangeConnectors.register(BybitConnector)
registryPersistenceServices.register(MongoService)
registryLoggerServices.register(VFLogger)

const exchangeConnector: IExchangeConnector = new (registryExchangeConnectors.get(exchangeConnectorClassName))(apiKey, apiSecret)
const persistenceService: IPersistenceService = new (registryPersistenceServices.get(persistenceServiceClassName))(`mongodb://${dbUser}:${dbPW}@${persistenceHost}:${persistencePort}`)
const vfLogger: IVFLogger = new (registryLoggerServices.get(loggerClassName))(apiKey, persistenceService)
const investmentAdvisor: VoFarmStrategy = new (registryInvestmentAdvisors.get(voFarmStrategyClassName))(vfLogger)

// Dependency Injection via constructor injection
const volatilityFarmer: VolatilityFarmer = new VolatilityFarmer(apiKey, exchangeConnector, investmentAdvisor, persistenceService, vfLogger)


// start farming interval - farming each 4 seconds
const intervalLengthInSeconds = 4
volatilityFarmer.farm(intervalLengthInSeconds)

