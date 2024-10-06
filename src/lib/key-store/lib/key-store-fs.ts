import { IKeyStoreEventName, IKeyStoreSource, IKeyStoreSourceFSConfig } from "../interfaces";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import jtomler from "jtomler";
import { CronJob } from "cron";
import { EventEmitter } from "events";
import { getByteSize } from "../../tools/get_byte_size";
import { getFilesList } from "../../tools/get_files_list";
import { randomInt } from "../../tools/random-int";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { IParseKeyObjectTarget, parseKeyObject } from "./parse_key_object";
import { promiseFsExists } from "../../tools/promise_fs_exists";
import { $Inject } from "../../dependency-injection";
import { IMetrics, Metrics } from "../../metrics";

export class KeyStoreSourceFS extends EventEmitter implements IKeyStoreSource {

    private _running_sync_flag: boolean;
    private readonly _job: CronJob;
    private readonly _max_file_size: number;
    private readonly _key_list: {
        [key: string]: {
            name: string
            value: unknown
        }
    };
    private readonly _include_regexps: RegExp[];
    private readonly _exclude_regexps: RegExp[];

    constructor (
        private readonly _name: string,
        private readonly _config: IKeyStoreSourceFSConfig,
        private readonly _logger: ILoggerEventEmitter,
        private readonly _metrics = $Inject<IMetrics>(Metrics)
    ) {
        
        super();

        this._running_sync_flag = false;
        this._key_list = {};
        this._include_regexps = [];
        this._exclude_regexps = [];
        this._max_file_size = getByteSize(this._config.size);

        for (const regexp_text of this._config.exclude_regexp) {
            const regexp = new RegExp(regexp_text, "i");
            this._exclude_regexps.push(regexp);
        }

        for (const regexp_text of this._config.include_regexp) {
            const regexp = new RegExp(regexp_text, "i");
            this._include_regexps.push(regexp);
        }

        this._job = new CronJob(this._config.cron.interval, async () => {
            
            const diff = this._job.nextDate().valueOf() - Date.now();
            let jitter = randomInt(0, this._config.cron.jitter) * 1000;

            if (jitter > diff) {
                jitter = diff - 100;
            }

            setTimeout( () => {
                this._sync();
            }, jitter);

        }, null, false, this._config.cron.time_zone);

        this._logger.debug(`Source type ${chalk.cyan(this._config.type)} created`);

        this._metrics.createCounter("store_synchronization_updates", "Synchronization updates");
        this._metrics.createCounter("store_synchronization_errors", "Synchronization errors");
        this._metrics.createCounter("store_key_requests", "Key requests");
        this._metrics.createHistogram("store_synchronization_time_ms", [200, 500, 800, 1000, 1500], "Synchronization time");

        this._metrics.add("store_synchronization_updates", 0, {source: this._name, type: this._config.type});
        this._metrics.add("store_synchronization_errors", 0, {source: this._name, type: this._config.type});
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
        return Object.keys(this._key_list);
    }

    async run (): Promise<void> {
        if (this._config.cron.enable === true) {
            this._job.start();
        }
        this._logger.debug(`Source type ${chalk.cyan(this._config.type)} running`);
        return this._sync();
    }

    async close (): Promise<void> {
        if (this._config.cron.enable === true) {
            this._job.stop();
        }
        this._logger.debug(`Source type ${chalk.cyan(this._config.type)} closed`);
    }

    async existKey (id: string): Promise<boolean> {
        if (this._key_list[id] === undefined) {
            return false;
        }
        return true;
    }

    async getKey (id: string): Promise<unknown> {
        if (this._key_list[id] === undefined) {
            return "";
        }
        this._metrics.add("store_key_requests", 1, {source: this._name, type: this._config.type});
        return this._key_list[id].value;
    }

    private async _sync (): Promise<void> {

        if (this._running_sync_flag === true) {
            return;
        }

        this._running_sync_flag = true;

        const start_sync_time = Date.now();
        const full_source_folder_path = path.resolve(process.cwd(), this._config.path);

        this._logger.debug(`Synchronization target ${chalk.cyan(full_source_folder_path)}`);

        if ((await promiseFsExists(full_source_folder_path)) === false) {
            this._logger.fatalSync(`Synchronization Error. Folder ${chalk.red(full_source_folder_path)} not found`);
            process.exit(1);
        }

        try {

            const files = await getFilesList(full_source_folder_path);
            const processing_names: string[] = [];
            
            for (const file_path of files) {

                if (/\.(toml|json|yml|yaml)$/.test(file_path) === false) {
                    this._logger.debug(`File ${chalk.yellow(file_path)} excluded, does not match toml, json, yml or yaml type`);
                    continue;
                }

                const id = file_path.replace(full_source_folder_path, "").replace(/^(\/|\\)/,"");
                const stat = await fs.promises.stat(file_path);

                if (stat.size > this._max_file_size) {
                    this._logger.debug(`File ${chalk.yellow(file_path)} ID ${chalk.yellow(id)} size ${chalk.yellow(`${stat.size}b`)} is more than ${chalk.yellow(this._config.size)} limit`);
                    continue;
                }

                let exclude_flag = false;
                let include_flag = false;

                for (const regexp of this._exclude_regexps) {
                    if (regexp.test(id) === true) {
                        exclude_flag = true;
                        continue;
                    }
                }

                if (exclude_flag === true) {
                    this._logger.debug(`File ${chalk.yellow(file_path)} ID ${chalk.yellow(id)} excluded`);
                    continue;
                }

                for (const regexp of this._include_regexps) {
                    
                    if (regexp.test(id) === true) {
                        include_flag = true;
                        continue;
                    }
                }

                if (include_flag === false) {
                    this._logger.debug(`File ${chalk.yellow(file_path)} ID ${chalk.yellow(id)} not included`);
                    continue;
                }

                const prefix = file_path.replace(full_source_folder_path, "").replace(/^(\/|\\)/,"").replace(/\.(toml|json|yml|yaml)$/, "").replace(/\//g, ".");

                if (prefix.includes(".") === true) {
                    this._logger.warn(`File ${chalk.yellow(file_path)} excluded, file name must not contain dot`);
                    continue;
                }

                const json_body = await jtomler.parseFile(file_path);
                const file_keys_list = parseKeyObject(<IParseKeyObjectTarget>json_body, `${this._name.toLowerCase()}.${prefix}`);

                for (const item of file_keys_list) {

                    if (processing_names.includes(item.name) === false) {
                        processing_names.push(item.name);
                    }

                    if (this._key_list[item.name] === undefined) {

                        this._logger.debug(`Found new key ${chalk.cyan(item.name)}`);
    
                        this._key_list[item.name] = {
                            name: item.name,
                            value: item.value
                        };

                        this.emit("new", item.name);
    
                        continue;
                    }
    
                    if (this._key_list[item.name].value !== item.value) {
    
                        this._logger.debug(`Key ${chalk.cyan(item.name)} changed`);
    
                        this._key_list[item.name].value = item.value;
    
                        this.emit("change", item.name);
    
                    }

                }

            }

            for (const key_name in this._key_list) {
                if (processing_names.includes(key_name) === false) {
                    delete this._key_list[key_name];
                    this._logger.debug(`Key ${chalk.cyan(key_name)} deleted`);
                    this.emit("delete", key_name);
                }               
            }

            this._metrics.add("store_synchronization_updates", 1, {source: this._name, type: this._config.type});

        } catch (error) {
            this._logger.error(`Synchronization Error. Error: ${chalk.red(error.message)}`);
            this._logger.trace(error.stack);
            this._metrics.add("store_synchronization_errors", 1, {source: this._name, type: this._config.type});
        }

        this._metrics.add("store_synchronization_time_ms", Date.now()-start_sync_time, {source: this._name, type: this._config.type});

        this._running_sync_flag = false;

    }

}