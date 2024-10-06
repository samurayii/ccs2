import { EventEmitter } from "events";
import { INamespace, INamespaceConfig, INamespaceEventName, INamespaceSource, INamespaceSourceFSConfig, INamespaceSourceGitConfig, INamespaceSourceGitCryptConfig } from "./interfaces";
import { ILoggerEventEmitter } from "logger-event-emitter";
import chalk from "chalk";
import { NamespaceSourceFS } from "./lib/fs-source";
import { NamespaceSourceGit } from "./lib/git-source";
import { NamespaceSourceGitCrypt } from "./lib/git-crypt-source";

export * from "./interfaces";

export class Namespace extends EventEmitter implements INamespace {

    private readonly _source: INamespaceSource;

    constructor (
        private readonly _config: INamespaceConfig,
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();

        if (this._config.source.type === "fs") {
            this._source = new NamespaceSourceFS(this._config.name, <INamespaceSourceFSConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "git") {
            this._source = new NamespaceSourceGit(this._config.name, <INamespaceSourceGitConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "git-crypt") {
            this._source = new NamespaceSourceGitCrypt(this._config.name, <INamespaceSourceGitCryptConfig>this._config.source, this._logger);
        }

        if (this._source === undefined) {
            this._logger.fatal(`Namespace source type ${chalk.red(this._config.source.type)} not support`);
            process.exit(1);
        }

    }
    
    get enable (): boolean {
        return this._config.enable;
    }
    get description (): string {
        return this._config.description;
    }
    get name (): string {
        return this._config.name;
    }
    get links (): string[] {
        return this._config.links;
    }
    get list (): string[] {
        return this._source.list;
    }

    override on (event_name: INamespaceEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: INamespaceEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    async run (): Promise<void> {
        if (this._config.enable === false) {
            return;
        }

        await this._source.run();

        this._source.on("change", (name: string) => {
            this.emit("change", name);
        });
        this._source.on("delete", (name: string) => {
            this.emit("delete", name);
        });
        this._source.on("new", (name: string) => {
            this.emit("new", name);
        });

    }

    async close (): Promise<void> {
        if (this._config.enable === false) {
            return;
        }
        this._source.removeAllListeners();
        this._source.close();
    }

    async existFile (id: string): Promise<boolean> {
        return this._source.existFile(id);
    }

    async getFile (id: string): Promise<string> {
        return this._source.getFile(id);
    }
    
}