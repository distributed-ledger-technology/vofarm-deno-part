import { MongoService } from "./mongo-service.ts"
import { LogSchema, IPersistenceService } from "../interfaces/persistence.ts"
import { IVFLogger } from "../interfaces/logger.ts"


export class VFLogger implements IVFLogger {

    private apiKey: string = ""
    private persistenceService: IPersistenceService

    public constructor(apiKey: string, persistenceService: IPersistenceService) {
        this.apiKey = apiKey
        this.persistenceService = persistenceService
    }

    public async log(message: string): Promise<void> {
        console.log(message)

        const log: LogSchema = {
            _id: { $oid: "" },
            apiKey: this.apiKey,
            utcTime: new Date().toISOString(),
            message,
        }

        await MongoService.saveLog(this.persistenceService, log)
    }


}