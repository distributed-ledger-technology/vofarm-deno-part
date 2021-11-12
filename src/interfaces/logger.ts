import { IPersistenceService } from "./persistence.ts";

export interface VFLogger {
    log(message: string): Promise<void>
}