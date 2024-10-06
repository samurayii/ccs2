import { ILoggerEventEmitter } from "logger-event-emitter";
import { IKeyStoreRepository } from "../key-store-repository";
import { IGatherer, IGathererConfig, IGathererGatheringCacheRecord, IGathererGatheringResult, IGathererGetFileKeyResult } from "./interfaces";
import { INamespaceRepository } from "../namespace-repository";
import { ISessionsClientProperties } from "../sessions";
import * as crypto from "crypto";
import { sortObject } from "../tools/sort_object";
import chalk from "chalk";
import Handlebars from "handlebars";
import handlebars_delimiters from "handlebars-delimiters";
import { $Inject } from "../dependency-injection";
import { IMetrics, Metrics } from "../metrics";

export * from "./interfaces";

export class Gatherer implements IGatherer {

    private readonly _key_reg: RegExp;
    private readonly _file_reg: RegExp;
    private readonly _cache: {
        [keys: string]: {
            [keys: string]: {
                [keys: string]: IGathererGatheringCacheRecord
            }
        }
    };

    constructor (
        private readonly _config: IGathererConfig,
        private readonly _namespace_repository: INamespaceRepository,
        private readonly _key_store_repository: IKeyStoreRepository,
        private readonly _logger: ILoggerEventEmitter,
        private readonly _metrics = $Inject<IMetrics>(Metrics)
    ) {
        this._key_reg = /<<key:[a-zA-Z]{1}[-a-zA-Z_0-9]{0,127}\.[-a-zA-Z_0-9.]+>>/gi;
        this._file_reg = /<<file:([a-zA-Z]{1}[-a-zA-Z_0-9]{0,127}:|)(\/|)[a-zA-Z0-9-_/.]+>>/gi;
        this._cache = {};

        handlebars_delimiters(Handlebars, this._config.template_engine.delimiters);

        this._namespace_repository.on("change", (file: string, namespace_name: string) => {
            this._dropCacheForNamespace(namespace_name, file);
        });
        this._namespace_repository.on("new", (file: string, namespace_name: string) => {
            this._dropCacheForNamespace(namespace_name, file);
        });
        this._namespace_repository.on("delete", (file: string, namespace_name: string) => {
            this._dropCacheForNamespace(namespace_name, file);
        });

        this._key_store_repository.on("change", (key_name: string) => {
            this._dropCacheForStoreKey(key_name);
        });
        this._key_store_repository.on("delete", (key_name: string) => {
            this._dropCacheForStoreKey(key_name);
        });
        this._key_store_repository.on("new", (key_name: string) => {
            this._dropCacheForStoreKey(key_name);
        });
        
        this._metrics.createCounter("gathering_requests", "Gathering requests");
        this._metrics.createCounter("gathering_errors", "Gathering errors");
        this._metrics.createCounter("gathering_requests_from_cache", "Gathering requests from cache");
        this._metrics.createGauge("gathering_cache_records", "Gatherer cache records");
        this._metrics.createCounter("gathering_key_requests", "Gathering requests");
        this._metrics.createHistogram("gathering_time_ms", [50, 100, 200, 400, 500], "Gathering time");

        this._metrics.add("gathering_requests", 0);
        this._metrics.add("gathering_key_requests", 0);
        this._metrics.add("gathering_requests_from_cache", 0);
        this._metrics.add("gathering_cache_records", 0);
        this._metrics.add("gathering_errors", 0);

    }
    
    private _dropCacheForNamespace (namespace_name: string, file: string): void {
        if (this._cache[namespace_name] !== undefined) {
            if (this._cache[namespace_name][file] !== undefined) {
                delete this._cache[namespace_name][file];
                this._logger.debug(`Cache batch ${chalk.cyan(`${namespace_name}:${file}`)} deleted`);
            }
        }
        for (const current_namespace_name in this._cache) {
            for (const current_file_name in this._cache[current_namespace_name]) {
                for (const current_record_name in this._cache[current_namespace_name][current_file_name]) {
                    const cache_record = this._cache[current_namespace_name][current_file_name][current_record_name];
                    if (cache_record.file_dependencies.includes(file)) {
                        delete this._cache[current_namespace_name][current_file_name];
                        this._logger.debug(`Cache batch ${chalk.cyan(`${current_namespace_name}:${current_file_name}`)} deleted`);
                        break;
                    }
                }
            }
        }
    }

    private _dropCacheForStoreKey (key_name: string): void {
        for (const current_namespace_name in this._cache) {
            for (const current_file_name in this._cache[current_namespace_name]) {
                for (const current_record_name in this._cache[current_namespace_name][current_file_name]) {
                    const cache_record = this._cache[current_namespace_name][current_file_name][current_record_name];
                    if (cache_record.key_dependencies.includes(key_name)) {
                        delete this._cache[current_namespace_name][current_file_name];
                        this._logger.debug(`Cache batch ${chalk.cyan(`${current_namespace_name}:${current_file_name}`)} deleted`);
                        break;
                    }
                }
            }
        }
    }

    async gathering(file: string, properties: ISessionsClientProperties): Promise<IGathererGatheringResult> {

        const start_sync_time = Date.now();
        const arg = file.split("/");
        const namespace_name = arg[0];
        const result_keys: IGathererGatheringResult["data"]["keys"] = {};
        const cache_record_id = crypto.createHash("md5").update(JSON.stringify(sortObject(properties))).digest("hex");

        this._metrics.add("gathering_requests", 1);

        if (this._cache[namespace_name] !== undefined) {
            if (this._cache[namespace_name][file] !== undefined) {
                if (this._cache[namespace_name][file][cache_record_id] !== undefined) {
                    this._metrics.add("gathering_requests_from_cache", 1);
                    return {
                        status: "success",
                        data: this._cache[namespace_name][file][cache_record_id]
                    };
                }
            }
        }

        if (this._namespace_repository.exist(namespace_name) === false) {
            return {
                status: "fail",
                message: `File "${file}" not found`
            };
        }

        const namespace = this._namespace_repository.get(namespace_name);

        if ((await namespace.existFile(file)) === false) {
            return {
                status: "fail",
                message: `File "${file}" not found`
            };
        }

        let file_body = await namespace.getFile(file);
        const key_dependencies: string[] = [];
        const file_dependencies: string[] = [file];
        
        for (let i = 0; i < this._config.iterations; i++) {

            for (const properties_key_name in properties) {
                const properties_key_value = properties[properties_key_name];
                file_body = file_body.replace(new RegExp(`<<key:_client.${properties_key_name}>>`,"gm"), `${properties_key_value}`);
            }

            const key_args = file_body.match(this._key_reg);

            if (key_args === null) {
                break;
            }

            for (const key_str of key_args) {

                const key_name = key_str.replace("<<key:", "").replace(">>", "");
                const key_properties = key_name.split(".");

                if (key_properties.length <= 1) {
                    continue;
                }

                const key_store_name = key_properties[0];
                if (namespace.links.includes(key_store_name) === false) {
                    continue;
                }

                if (key_dependencies.includes(key_name) === false) {
                    key_dependencies.push(key_name);
                }

                if (this._key_store_repository.exist(key_store_name) === false) {
                    continue;
                }

                const key_store = this._key_store_repository.get(key_store_name);
           
                if ((await key_store.existKey(key_name)) === false) {
                    continue;
                }

                const key_value = await key_store.getKey(key_name);

                file_body = file_body.replace(new RegExp(key_str,"gm"), `${key_value}`);
                result_keys[key_name] = key_value;
            
            }
            
            const file_args = file_body.match(this._file_reg);

            if (file_args === null) {
                continue;
            }

            for (const file_str of file_args) {
    
                const file_properties = file_str.replace("<<file:", "").replace(">>", "").split(":");
          
                let file_namespace_name: string;
                let file_path: string;

                if (file_properties.length <= 1) {
                    file_namespace_name = namespace.name;
                    file_path = file_properties[0].replace(/^\//, "");
                } else {
                    file_namespace_name = file_properties[0];
                    file_path = file_properties[1].replace(/^\//, "");
                }

                const file_namespace_path = `${file_namespace_name}/${file_path}`;
       
                if (this._namespace_repository.exist(file_namespace_name) === false) {
                    continue;
                }

                const file_namespace = this._namespace_repository.get(file_namespace_name);
                const file_dependence_string = `${file_namespace_name}/${file_path}`;

                if (file_dependencies.includes(file_dependence_string) === false) {
                    file_dependencies.push(file_dependence_string);
                }

                const include_file_body = await file_namespace.getFile(file_namespace_path);
                
                file_body = file_body.replace(new RegExp(file_str,"gm"), <string>include_file_body);
            
            }

        }

        try {
            const template_data: {
                [key: string]: {
                    [key: string]: unknown
                }
            } = {
                _client: properties
            };
            for (const store_name of this._key_store_repository.list) {
                const store = this._key_store_repository.get(store_name);
                template_data[store.name] = {};
                for (const key_name of store.list) {
                    template_data[store.name][key_name] = await store.getKey(key_name);
                }
            }
            file_body = Handlebars.compile(file_body)(template_data);
        } catch (error) {
            this._logger.error(`Handlebars error parsing. Error: ${chalk.red(error.message)}`);
            this._logger.trace(error.stack);
            this._metrics.add("gathering_errors", 1);
            return {
                status: "fail",
                message: "Handlebars error parsing"
            };
        } 

        const cache_record: IGathererGatheringCacheRecord = {
            key_dependencies: key_dependencies,
            file_dependencies: file_dependencies,
            path: file,
            hash: crypto.createHash("md5").update(file_body).digest("hex"),
            body: file_body,
            keys: result_keys
        };
        
        if (this._cache[namespace_name] === undefined) {
            this._cache[namespace_name] = {};
        }
        if (this._cache[namespace_name][file] === undefined) {
            this._cache[namespace_name][file] = {};
        }

        this._cache[namespace_name][file][cache_record_id] = cache_record;

        this._logger.debug(`Cache record ID ${chalk.cyan(`${namespace_name}:${file}:${cache_record_id}`)} created`);

        this._metrics.add("gathering_cache_records", Object.keys(this._cache[namespace_name]).length*Object.keys(this._cache[namespace_name][file]).length*Object.keys(this._cache[namespace_name][file][cache_record_id]).length);
        this._metrics.add("gathering_time_ms", Date.now()-start_sync_time);


        return {
            status: "success",
            data: cache_record
        };

    }

    async getFileKey (key_name: string, file: string, properties: ISessionsClientProperties): Promise<IGathererGetFileKeyResult> {

        const arg = file.split("/");
        const namespace_name = arg[0];
        const cache_record_id = crypto.createHash("md5").update(JSON.stringify(sortObject(properties))).digest("hex");

        if (this._cache[namespace_name] !== undefined) {
            if (this._cache[namespace_name][file] !== undefined) {
                if (this._cache[namespace_name][file][cache_record_id] !== undefined) {
                    const cache_record = this._cache[namespace_name][file][cache_record_id];
                    if (cache_record.keys[key_name] === undefined) {
                        return {
                            status: "fail",
                            message: `Key "${key_name}" for file "${file}" not found`
                        };
                    }
                    return {
                        status: "success",
                        data: {
                            path: file,
                            hash: cache_record.hash,
                            name: key_name,
                            value: cache_record.keys[key_name]
                        }
                    };
                }
            }
        }

        const gathering_result = await this.gathering(file, properties);

        if (gathering_result.status === "fail") {
            return {
                status: gathering_result.status,
                message: gathering_result.message
            };
        }

        if (gathering_result.data.keys[key_name] === undefined) {
            return {
                status: "fail",
                message: `Key "${key_name}" for file "${file}" not found`
            };
        }

        this._metrics.add("gathering_key_requests", 1);

        return {
            status: "success",
            data: {
                path: file,
                hash: gathering_result.data.hash,
                name: key_name,
                value: `${gathering_result.data.keys[key_name]}`
            }
        };

    }

    async run (): Promise<void> {
        await this._namespace_repository.run();
        await this._key_store_repository.run();
    }

    async close (): Promise<void> {
        await this._namespace_repository.close();
        await this._key_store_repository.close();
    }
    
}
