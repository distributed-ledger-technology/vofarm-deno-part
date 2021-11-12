import { IPersistenceService } from "./src/interfaces/persistence.ts"
import { LongShortExploitStrategy } from "./src/long-short-exploit-strategy.ts";
import { VFLogger } from "./src/utilities/logger.ts"
import { MongoService } from "./src/utilities/mongo-service.ts"

const apiKey = Deno.args[0]
const dbUser = Deno.args[1]
const dbPW = Deno.args[2]
const persistenceHost = (Deno.args[3] === undefined) ? '65.21.110.40' : Deno.args[3]
const persistencePort = (Deno.args[8] === undefined) ? '27017' : Deno.args[8]
const persistenceService: IPersistenceService = new MongoService(`mongodb://${dbUser}:${dbPW}@${persistenceHost}:${persistencePort}`)
const vfLogger = new VFLogger(apiKey, persistenceService)
const longShortExploitStrategy: LongShortExploitStrategy = new LongShortExploitStrategy(vfLogger)

const testInput = {
    accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
    positions: [],
}

const investmentAdvices = longShortExploitStrategy.getInvestmentAdvices(testInput)

console.log(investmentAdvices)