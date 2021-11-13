import { IPersistenceService } from "./persistence.ts";

export interface IVFLogger {
    log(message: string): Promise<void>
}