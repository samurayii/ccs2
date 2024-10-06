import chalk from "chalk";
import { EventEmitter } from "events";
import { IKeyStoreSource, IKeyStoreSourceEnvConfig } from "../interfaces";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { $Inject } from "../../dependency-injection";
import { IMetrics, Metrics } from "../../metrics";

export class KeyStoreSourceEnv extends EventEmitter implements IKeyStoreSource {

    private readonly _input_regexp: RegExp;
    private readonly _store: {
        [key: string]: string
    };

    constructor (
        private readonly _name: string,
        private readonly _config: IKeyStoreSourceEnvConfig,
        private readonly _logger: ILoggerEventEmitter,
        private readonly _metrics = $Inject<IMetrics>(Metrics)
    ) {
        
        super();

        this._store = {};

        this._input_regexp = new RegExp(`^${this._config.key_prefix}`, "i");

        this._logger.debug(`Key store type ${chalk.gray(this._config.type)} created`);

        this._metrics.createCounter("store_key_requests", "Key requests");

        this._metrics.add("store_key_requests", 0, {source: this._name, type: this._config.type});

    }

    get list (): string[] {
        return Object.keys(this._store);
    }

    async existKey (id: string): Promise<boolean> {
        if (this._store[id] === undefined) {
            return false;
        }
        return true;
    }

    async getKey (id: string): Promise<string> {
        if (this._store[id] === undefined) {
            return "";
        }
        this._metrics.add("store_key_requests", 1, {source: this._name, type: this._config.type});
        return this._store[id];
    }

    async run (): Promise<void> {

        for (const env_key in process.env) {

            if (this._input_regexp.test(env_key) === true) {

                const env_value = process.env[env_key].trim();
                const id = `${this._name.toLowerCase()}.${env_key.trim().replace(this._input_regexp, "").toLowerCase()}`;

                this._store[id] = env_value;

                this._logger.debug(`Load key ${chalk.cyan(id)} from ${chalk.cyan(env_key)}`);

            }
        }

    }

    async close (): Promise<void> {
        return;
    }   

}