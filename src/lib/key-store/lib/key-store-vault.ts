import chalk from "chalk";
import { EventEmitter } from "events";
import { IKeyStoreEventName, IKeyStoreSource, IKeyStoreSourceVaultConfig } from "../interfaces";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { $Inject } from "../../dependency-injection";
import { IMetrics, Metrics } from "../../metrics";
import fetch from "node-fetch";
import { convertTime } from "../../tools/convert_time";
import { randomInt } from "../../tools/random-int";

interface IGetKeyFromServerResult {
    status: "fail" | "success"
    message?: string
    data?: unknown
}

interface IVaultResponseBody {
    data: {
        data: {
            [key: string]: unknown
        }
        [key: string]: unknown
    }
}

export class KeyStoreSourceVault extends EventEmitter implements IKeyStoreSource {

    private readonly _store: {
        [key: string]: {
            interval: ReturnType<typeof setTimeout>,
            secret_path: string
            secret_store_name: string
            data: {
                [key: string]: {
                    exist: boolean
                    name: string,
                    value: unknown
                }
            }
        }
    };

    constructor (
        private readonly _name: string,
        private readonly _config: IKeyStoreSourceVaultConfig,
        private readonly _logger: ILoggerEventEmitter,
        private readonly _metrics = $Inject<IMetrics>(Metrics)
    ) {
        
        super();

        this._store = {};

        if (this._config.connection.path === "/") {
            this._config.connection.path = "";
        } else {
            this._config.connection.path = `${this._config.connection.path.replace(/^\//,"").replace(/\/$/,"")}/`;
        }

        this._logger.debug(`Key store type ${chalk.gray(this._config.type)} created`);

        this._metrics.createCounter("store_key_requests", "Key requests");

        this._metrics.add("store_key_requests", 0, {source: this._name, type: this._config.type});

    }

    override on (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: IKeyStoreEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    get list (): string[] {

        const result: string[] = [];

        for (const secret of Object.values(this._store)) {
            for (const key of Object.values(secret.data)) {
                if (key.exist === true) {
                    result.push(key.name);
                }
            } 
        }

        return result;
    }

    async existKey (id: string): Promise<boolean> {

        const key_properties = id.split(".");
        
        key_properties.shift();

        if (key_properties.length <= 2) {
            return false;
        }

        const key_name = key_properties[key_properties.length-1];
        key_properties.pop();
        const id_store = key_properties.join("/");      

        if (this._store[id_store] !== undefined) {
            if (this._store[id_store].data[key_name] !== undefined) {
                return this._store[id_store].data[key_name].exist;
            }
        }

        const get_key_result = await this._getKeyFromServer(id);

        if (get_key_result.status === "fail") {
            return false;
        }

        return true;
        
    }

    async getKey (id: string): Promise<string> {

        const key_properties = id.split(".");
        
        key_properties.shift();

        if (key_properties.length <= 2) {
            return "";
        }

        const key_name = key_properties[key_properties.length-1];
        key_properties.pop();
        const id_store = key_properties.join("/");

        if (this._store[id_store] !== undefined) {
            if (this._store[id_store].data[key_name] !== undefined) {
                if (this._store[id_store].data[key_name].exist === true) {
                    this._metrics.add("store_key_requests", 1, {source: this._name, type: this._config.type});
                    return `${this._store[id_store].data[key_name].value}`;
                } else {
                    return "";
                }
            }
        }

        const get_key_result = await this._getKeyFromServer(id);

        if (get_key_result.status === "fail") {
            return "";
        }
        
        this._metrics.add("store_key_requests", 1, {source: this._name, type: this._config.type});

        return `${this._store[id_store].data[key_name].value}`;
    }

    async run (): Promise<void> {
        return;
    }

    async close (): Promise<void> {
        for (const key of Object.values(this._store)) {
            clearTimeout(key.interval);
        }
    }

    private async _updateSecret (id_store: string): Promise<ReturnType<typeof setTimeout>> {
        return setTimeout( async () => {
            await this._refreshSecret(id_store);
            if (this._store[id_store] !== undefined) {
                this._store[id_store].interval = await this._updateSecret(id_store);
            }
        }, (convertTime(this._config.refresh.interval)+randomInt(0,convertTime(this._config.refresh.jitter)))*1000);
    }

    private async _refreshSecret (id_store: string): Promise<void> {

        if (this._store[id_store] === undefined) {
            return;
        }

        let url: string;

        if (this._config.version === "v1") {
            url = `${this._config.connection.protocol}://${this._config.connection.host}:${this._config.connection.port}/${this._config.connection.path.replace(/^\//,"").replace(/\/$/,"")}v1/${this._store[id_store].secret_store_name}/${this._store[id_store].secret_path}`;
        }
        if (this._config.version === "v2") {
            url = `${this._config.connection.protocol}://${this._config.connection.host}:${this._config.connection.port}/${this._config.connection.path.replace(/^\//,"").replace(/\/$/,"")}v1/${this._store[id_store].secret_store_name}/data/${this._store[id_store].secret_path}`;
        }

        this._logger.debug(`Refresh secret ${chalk.cyan(id_store)} request GET ${chalk.cyan(url)}`);

        let secret_body: IVaultResponseBody;

        try {

            const secret_response = await fetch(url, {
                method: "GET",
                timeout: convertTime(this._config.connection.timeout) * 1000,
                headers: {
                    "Accept": "application/json",
                    "X-Vault-Token": this._config.token
                }
            });

            if (secret_response.status !== 200) {
                this._logger.error(`Refresh secret ${chalk.cyan(id_store)} request GET ${chalk.red(url)} is fail. Server return code ${chalk.red(secret_response.status)}`);
                return;
            }

            secret_body = await secret_response.json();

        } catch (error) {
            this._logger.error(`Request GET ${chalk.red(url)} is fail. Error: ${chalk.red(error.message)}`);
            this._logger.trace(error.stack);
            return;
        }

        let result_secret_body: {[key: string]: unknown};

        if (this._config.version === "v1") {
            if (secret_body.data === undefined) {
                this._logger.error(`Server return empty body:\n${chalk.red(JSON.stringify(secret_body,null,2))}`);
                return;
            }
            result_secret_body = secret_body.data;
        }
        if (this._config.version === "v2") {
            if (secret_body?.data?.data === undefined) {
                this._logger.error(`Server return empty body:\n${chalk.red(JSON.stringify(secret_body,null,2))}`);
                return;
            }
            result_secret_body = secret_body.data.data;
        }


        for (const secret_key_name in result_secret_body) {
            if (this._store[id_store].data[secret_key_name] === undefined || this._store[id_store].data[secret_key_name]?.exist === false) {

                const key_name = `${this._name}.${id_store.replace(/\//g,".")}.${secret_key_name}`;

                this._logger.debug(`Found new key ${chalk.cyan(key_name)}`);

                this._store[id_store].data[secret_key_name] = {
                    exist: true,
                    name: key_name,
                    value: result_secret_body[secret_key_name]
                };

                this.emit("new", key_name);
            } else {
                if (this._store[id_store].data[secret_key_name].value !== result_secret_body[secret_key_name]) {
                    this._store[id_store].data[secret_key_name].value = result_secret_body[secret_key_name];
                    this._logger.debug(`Key ${chalk.cyan(this._store[id_store].data[secret_key_name].name)} changed`);
                    this.emit("change", this._store[id_store].data[secret_key_name].name);
                }
            }
        }

        for (const key_name in this._store[id_store].data) {
            if (result_secret_body[key_name] === undefined) {
                if (this._store[id_store].data[key_name].exist === false) {
                    continue;
                }
                this._store[id_store].data[key_name].exist = false;
                this._store[id_store].data[key_name].value = "";
                this._logger.debug(`Key ${chalk.cyan(this._store[id_store].data[key_name].name)} deleted`);
                this.emit("delete", this._store[id_store].data[key_name].name);
            }
        }

    }

    private async _getKeyFromServer (id: string): Promise<IGetKeyFromServerResult> {

        const key_properties = id.split(".");
        
        key_properties.shift();

        if (key_properties.length <= 2) {
            return {
                status: "fail",
                message: `Key "${id}" not found` 
            };
        }
        
        const secret_store_name = key_properties[0];
        const key_name = key_properties[key_properties.length-1];
        key_properties.pop();
        key_properties.shift();
        const secret_path = key_properties.join("/");
        const id_store = `${secret_store_name}/${secret_path}`;

        if (this._config.secrets.includes(secret_store_name) === false) {
            return {
                status: "fail",
                message: `Access denied for secret "${secret_store_name}"`
            };
        }

        let url: string;

        if (this._config.version === "v1") {
            url = `${this._config.connection.protocol}://${this._config.connection.host}:${this._config.connection.port}/${this._config.connection.path.replace(/^\//,"").replace(/\/$/,"")}v1/${secret_store_name}/${secret_path}`;
        }
        if (this._config.version === "v2") {
            url = `${this._config.connection.protocol}://${this._config.connection.host}:${this._config.connection.port}/${this._config.connection.path.replace(/^\//,"").replace(/\/$/,"")}v1/${secret_store_name}/data/${secret_path}`;
        }

        this._logger.debug(`Request GET ${chalk.cyan(url)}`);

        let secret_body: IVaultResponseBody;

        try {

            const secret_response = await fetch(url, {
                method: "GET",
                timeout: convertTime(this._config.connection.timeout) * 1000,
                headers: {
                    "Accept": "application/json",
                    "X-Vault-Token": this._config.token
                }
            });

            if (secret_response.status !== 200) {
                this._logger.error(`Request GET ${chalk.red(url)} is fail. Server return code ${chalk.red(secret_response.status)}`);
                return {
                    status: "fail",
                    message: `Key "${id}" not found`
                };
            }

            secret_body = await secret_response.json();

        } catch (error) {
            this._logger.error(`Request GET ${chalk.red(url)} is fail. Error: ${chalk.red(error.message)}`);
            this._logger.trace(error.stack);
            return {
                status: "fail",
                message: `Request error. Error: ${error.message}`
            };
        }

        let result_secret_body: {[key: string]: unknown};
        
        if (this._config.version === "v1") {
            if (secret_body.data === undefined) {
                this._logger.error(`Server return empty body:\n${chalk.red(JSON.stringify(secret_body,null,2))}`);
                return {
                    status: "fail",
                    message: `Key "${id}" not found`
                };
            }
            result_secret_body = secret_body.data;
        }
        if (this._config.version === "v2") {
            if (secret_body?.data?.data === undefined) {
                this._logger.error(`Server return empty body:\n${chalk.red(JSON.stringify(secret_body,null,2))}`);
                return {
                    status: "fail",
                    message: `Key "${id}" not found`
                };
            }
            result_secret_body = secret_body.data.data;
        }

        if (this._store[id_store] === undefined) {
            this._store[id_store] = {
                interval: await this._updateSecret(id_store),
                secret_path: secret_path,
                secret_store_name: secret_store_name,
                data: {}
            };
            this._logger.debug(`Created record for secret path ${chalk.cyan(id_store)}`);
        }

        for (const secret_key_name in result_secret_body) {
            this._store[id_store].data[secret_key_name] = {
                exist: true,
                name: `${this._name}.${secret_store_name}.${key_properties.join(".")}.${secret_key_name}`,
                value: result_secret_body[secret_key_name]
            };
        }      

        if (this._store[id_store].data[key_name] === undefined) {
            this._store[id_store].data[key_name] = {
                exist: false,
                name: `${this._name}.${secret_store_name}.${key_properties.join(".")}.${key_name}`,
                value: ""
            };
        }

        if (this._store[id_store].data[key_name].exist === true) {
            return {
                status: "success",
                data: this._store[id_store].data[key_name].value
            }; 
        } else {
            return {
                status: "fail",
                message: `Key "${id}" not found`
            };
        }            

    }

}