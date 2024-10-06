import { ILoggerEventEmitter } from "logger-event-emitter";
import { IHealthController } from "./interfaces";
import chalk from "chalk";

export * from "./interfaces";

export class HealthController implements IHealthController {

    readonly _trigger_list: {
        [key: string]: boolean
    };

    constructor (
        private readonly _logger: ILoggerEventEmitter
    ) {
        this._trigger_list = {};
    }
    
    get healthy (): boolean {
        for (const healthy_trigger of Object.values(this._trigger_list)) {
            if (healthy_trigger === false) {
                return false;
            }
        }
        return true;
    }

    createTrigger (trigger_type: string, healthy: boolean): void {
        if (this._trigger_list[trigger_type] === undefined) {
            this._trigger_list[trigger_type] = healthy;
            this._logger.debug(`Create trigger ${chalk.cyan(trigger_type)}`);
        }
    }

    unHealthTrigger (trigger_type: string): void {
        if (this._trigger_list[trigger_type] === undefined) {
            return;
        }
        if (this._trigger_list[trigger_type] === true) {
            this._logger.debug(`Trigger ${chalk.yellow(trigger_type)} is unhealthy`);
        }
        this._trigger_list[trigger_type] = false;
    }

    healthTrigger (trigger_type: string): void {
        if (this._trigger_list[trigger_type] === undefined) {
            return;
        }
        if (this._trigger_list[trigger_type] === false) {
            this._logger.debug(`Trigger ${chalk.green(trigger_type)} healthy`);
        }
        this._trigger_list[trigger_type] = true;
    }

}