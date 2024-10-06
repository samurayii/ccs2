import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { CronJob } from "cron";
import { execSync } from "child_process";
import { sync as sync_del, rimraf } from "rimraf";
import { INamespaceEventName, INamespaceSource, INamespaceSourceGitCryptConfig } from "../interfaces";
import { getFilesList } from "../../tools/get_files_list";
import { getByteSize } from "../../tools/get_byte_size";
import { randomInt } from "../../tools/random-int";
import { promiseDelay } from "../../tools/promise_delay";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { fileMD5 } from "../../tools/fileMD5";
import { promiseExecSync } from "../../tools/promise_exec_sync";
import { promiseFsExists } from "../../tools/promise_fs_exists";
import { $Inject } from "../../dependency-injection";
import { IMetrics, Metrics } from "../../metrics";

export class NamespaceSourceGitCrypt extends EventEmitter implements INamespaceSource {

    private _current_commit_count: number;
    private _server_str: string;
    private readonly _full_tmp_folder_path: string;
    private readonly _max_file_size: number;
    private _running_sync_flag: boolean;
    private readonly _job: CronJob;
    private readonly _include_regexps: RegExp[];
    private readonly _exclude_regexps: RegExp[];
    private readonly _hash_file_list: {
        [key: string]: {
            path: string
            hash: string
            id: string
        }
    };
    private readonly _crypt_key_full_path: string;
    private _error_clone_flag: boolean;

    constructor (
        private readonly _name: string,
        private readonly _config: INamespaceSourceGitCryptConfig,
        private readonly _logger: ILoggerEventEmitter,
        private readonly _metrics = $Inject<IMetrics>(Metrics)
    ) {

        super();

        this._error_clone_flag = false;

        try { 
            execSync("git --version",  {stdio:[]});
        } catch (error) {
            this._logger.fatal(`Can not exec command ${chalk.red("git --version")}, error: ${error}`);
            process.exit(1);
        }

        try { 
            execSync("git-crypt --version", {stdio:[]});
        } catch (error) {
            this._logger.fatal(`Can not exec command ${chalk.red("git-crypt --version")}, error: ${error}`);
            process.exit(1);
        }

        this._crypt_key_full_path = path.resolve(process.cwd(), this._config.crypt_key_path);

        if (fs.existsSync(this._crypt_key_full_path) === false) {
            this._logger.fatal(`Git-crypt key ${chalk.red(this._crypt_key_full_path)} not found`);
            process.exit(1);
        }

        const key_stat = fs.statSync(this._crypt_key_full_path);

        if (key_stat.isFile() === false) {
            this._logger.fatal(`Git-crypt key ${chalk.red(this._crypt_key_full_path)} not file`);
            process.exit(1);
        }

        this._current_commit_count = 0;
        this._running_sync_flag = false;
        this._hash_file_list = {};
        this._include_regexps = [];
        this._exclude_regexps = [];
        this._max_file_size = getByteSize(this._config.size);
        this._server_str = this._config.repository.replace(/\/\/.*:.*@/gi, "//");
        this._full_tmp_folder_path = path.resolve(process.cwd(), `${this._config.tmp.replace(/(\/|\\)$/,"")}/${this._name}`);

        for (const regexp_text of this._config.exclude_regexp) {
            const regexp = new RegExp(regexp_text, "i");
            this._exclude_regexps.push(regexp);
        }

        for (const regexp_text of this._config.include_regexp) {
            const regexp = new RegExp(regexp_text, "i");
            this._include_regexps.push(regexp);
        }

        if (fs.existsSync(this._full_tmp_folder_path) === true) {
            sync_del(this._full_tmp_folder_path);
            this._logger.debug(`Delete old repository folder ${chalk.cyan(this._full_tmp_folder_path)}`);
        }

        this._job = new CronJob(this._config.cron.interval, async () => {
            
            const diff = this._job.nextDate().valueOf() - Date.now();
            let jitter = randomInt(0, this._config.cron.jitter) * 1000;

            if (jitter > diff) {
                jitter = diff - 100;
            }

            await promiseDelay(jitter);

            await this._sync();

        }, null, false, this._config.cron.time_zone);

        this._logger.debug(`Source type ${chalk.cyan(this._config.type)} created`);

        this._metrics.createCounter("namespace_synchronization_updates", "Synchronization updates");
        this._metrics.createCounter("namespace_synchronization_errors", "Synchronization errors");
        this._metrics.createHistogram("namespace_synchronization_time_ms", [200, 500, 800, 1000, 1500], "Synchronization time");

        this._metrics.add("namespace_synchronization_updates", 0, {source: this._name, type: this._config.type});
        this._metrics.add("namespace_synchronization_errors", 0, {source: this._name, type: this._config.type});
        
    }

    override on (event_name: INamespaceEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: INamespaceEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    get list (): string[] {
        return Object.keys(this._hash_file_list);
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

    async existFile (id: string): Promise<boolean> {
        if (this._hash_file_list[id] === undefined) {
            return false;
        }
        return true;
    }

    async getFile (id: string): Promise<string> {
        if (this._hash_file_list[id] === undefined) {
            return "";
        }
        try {
            const body = (await fs.promises.readFile(this._hash_file_list[id].path)).toString();
            return body;
        } catch (error) {
            this._logger.error(`Error reading file ${chalk.red(this._hash_file_list[id].path)}. Error: ${chalk.red(error.message)}`);
            this._logger.trace(error.stack);
            return "";
        }
    }

    private async _sync (): Promise<void> {

        if (this._running_sync_flag === true) {
            return;
        }

        this._running_sync_flag = true;

        let repository_change_flag = false;
        const start_sync_time = Date.now();

        if (this._current_commit_count >= this._config.commit_count) {
            if ((await promiseFsExists(this._full_tmp_folder_path)) === true) {
                await rimraf(this._full_tmp_folder_path);
                this._logger.debug(`Delete repository folder ${chalk.cyan(this._full_tmp_folder_path)}, reach commits limit`);
            }
            this._current_commit_count = 0;
        }

        if ((await promiseFsExists(this._full_tmp_folder_path)) === false) {

            const git_command = `git clone --single-branch --branch ${this._config.branch} --depth 1 ${this._config.repository} ${this._full_tmp_folder_path}`;
            const git_crypt_command = `git-crypt unlock ${this._crypt_key_full_path}`;

            try {

                await promiseExecSync(git_command, {stdio:[]});
                this._logger.debug(`Repository ${chalk.cyan(this._server_str)} cloned to ${chalk.cyan(this._full_tmp_folder_path)}`);

                await promiseExecSync(git_crypt_command, {
                    cwd: this._full_tmp_folder_path,
                    stdio:[]
                });
                this._logger.debug("Repository unlocked");

                this._current_commit_count += 1;

                repository_change_flag = true;

                this._error_clone_flag = true;

            } catch (error) {

                this._logger.error(`Error cloning repository ${chalk.red(this._server_str)}`);
                this._logger.debug(error.message.replace(/\/\/.*:.*@/gm,"//XXXXX:XXXXX@"));
                this._logger.trace(error.stack.replace(/\/\/.*:.*@/gm,"//XXXXX:XXXXX@"));
                
                if ((await promiseFsExists(this._full_tmp_folder_path)) === true) {
                    await rimraf(this._full_tmp_folder_path);
                    this._logger.debug(`Repository folder ${chalk.cyan(this._full_tmp_folder_path)} deleted`);
                }

                this._current_commit_count = 0;
                this._error_clone_flag = true;

                this._metrics.add("namespace_synchronization_errors", 1, {source: this._name, type: this._config.type});

            }

        } else {

            try {

                const stdout = await promiseExecSync("git pull", {
                    cwd: this._full_tmp_folder_path,
                    stdio:[]
                });

                if (!/(Already up to date|Already up-to-date)/gi.test(stdout)) {
                    repository_change_flag = true;
                    this._current_commit_count += 1;
                    this._logger.debug(`Repository ${chalk.cyan(this._server_str)} has been updated. Changes accepted.`);
                }

                this._error_clone_flag = false;

            } catch (error) {

                repository_change_flag = false;

                this._logger.error(`Git pull repository ${chalk.red(this._server_str)} error.`);
                this._logger.debug(error.message.replace(/\/\/.*:.*@/gm,"//XXXXX:XXXXX@"));
                this._logger.trace(error.stack.replace(/\/\/.*:.*@/gm,"//XXXXX:XXXXX@"));

                if (this._error_clone_flag === false) {
                    await rimraf(this._full_tmp_folder_path);
                    this._logger.debug(`Repository folder ${chalk.cyan(this._full_tmp_folder_path)} deleted`);
                }

                this._error_clone_flag = true;

                this._metrics.add("namespace_synchronization_errors", 1, {source: this._name, type: this._config.type});
            }

        }

        const current_hash_list = JSON.parse(JSON.stringify(this._hash_file_list));
        
        if (repository_change_flag === true) {

            this._logger.debug("Scanning...");

            try {

                const files = await getFilesList(this._full_tmp_folder_path);
    
                for (const file_path of files) {
                    
                    if (file_path.includes(".git") === true) {
                        continue;
                    }

                    const id = `${this._name}/${file_path.replace(this._full_tmp_folder_path, "").replace(/^(\/|\\)/,"").replace(/(\\|\\\\)/g, "/")}`;
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
                        this._logger.debug(`File ${chalk.cyan(file_path)} ID ${chalk.cyan(id)} excluded`);
                        continue;
                    }
    
                    for (const regexp of this._include_regexps) {
                        if (regexp.test(id) === true) {
                            include_flag = true;
                            continue;
                        }
                    }
    
                    if (include_flag === false) {
                        this._logger.debug(`File ${chalk.cyan(file_path)} ID ${chalk.cyan(id)} not included`);
                        continue;
                    }
    
                    const new_hash = await fileMD5(file_path);
                                
                    if (current_hash_list[id] === undefined) {
    
                        this._logger.debug(`Found new file ${chalk.grey(file_path)}`);

                        this._hash_file_list[id] = {
                            id: id,
                            path: file_path,
                            hash: new_hash
                        };

                        this.emit("new", id);
    
                        continue;
                    }
    
                    const current_hash = current_hash_list[id].hash;
    
                    delete current_hash_list[id];
    
                    if (current_hash !== new_hash) {
    
                        this._logger.debug(`File ${chalk.grey(file_path)} changed (${current_hash} -> ${new_hash})`);
    
                        this._hash_file_list[id].hash = new_hash;
    
                        this.emit("change", id);
    
                    }
    
                }
    
                for (const id in current_hash_list) {
                    delete this._hash_file_list[id];
                    this.emit("delete", id);
                }

                this._metrics.add("namespace_synchronization_updates", 1, {source: this._name, type: this._config.type});
    
            } catch (error) {
                this._logger.error(`Scanning Error. Error: ${error.message}`);
                this._logger.trace(error.stack);
                this._metrics.add("namespace_synchronization_errors", 1, {source: this._name, type: this._config.type});
            }
        }

        this._metrics.add("namespace_synchronization_time_ms", Date.now()-start_sync_time, {source: this._name, type: this._config.type});

        this._running_sync_flag = false;

    }

}