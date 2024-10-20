import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import Ajv from "ajv";
import jtomler from "jtomler";
import json_from_schema from "json-from-default-schema";
import * as config_schema from "./schemes/config.json";
import * as namespace_schema from "./schemes/namespace.json";
import * as namespace_fs_source_schema from "./schemes/namespace-fs-source.json";
import * as namespace_git_source_schema from "./schemes/namespace-git-source.json";
import * as namespace_git_crypt_source_schema from "./schemes/namespace-git-crypt-source.json";
import * as key_store_env_schema from "./schemes/key-store-env.json";
import * as key_store_fs_schema from "./schemes/key-store-fs.json";
import * as key_store_git_schema from "./schemes/key-store-git.json";
import * as key_store_git_crypt_schema from "./schemes/key-store-git-crypt.json";
import * as key_store_schema from "./schemes/key-store.json";
import * as key_store_vault_v1_schema from "./schemes/key-store-vault.json";
import { IAppConfig } from "./config.interfaces";
import { AjvErrorHelper } from "./tools/ajv_error_helper";
import { findPackage } from "./tools/find_package";
import { INamespaceConfig, INamespaceSourceFSConfig, INamespaceSourceGitConfig, INamespaceSourceGitCryptConfig, TNamespaceSourceConfigType } from "./namespace";
import { IKeyStoreConfig, IKeyStoreSourceEnvConfig, IKeyStoreSourceFSConfig, IKeyStoreSourceGitConfig, IKeyStoreSourceGitCryptConfig, IKeyStoreSourceVaultConfig, TKeyStoreSourceConfigType } from "./key-store";

type TOptions = {
    config: string
}

const program = new Command();
const pkg = findPackage();

if (pkg === undefined) {
    console.error(`${chalk.bgRed(" FATAL ")} package.json not found`);
    process.exit(1);
}

program.version(`${pkg.name} version: ${pkg.version}`, "-v, --version", "output the current version.");
program.name(pkg.name);
program.option("-c, --config <type>", "Path to config file.");

program.parse(process.argv);

const options = program.opts<TOptions>();

if (process.env["CCS_CONFIG_PATH"] === undefined) {
	if (options.config === undefined) {
		console.error(`${chalk.bgRed(" FATAL ")} Not set --config key`);
		process.exit(1);
	}
} else {
	options.config = process.env["CCS_CONFIG_PATH"];
}

const full_config_path = path.resolve(process.cwd(), options.config);

if (!fs.existsSync(full_config_path)) {
    console.error(`${chalk.bgRed(" FATAL ")} Config file ${chalk.red(full_config_path)} not found`);
    process.exit(1);
}

let config: IAppConfig;

try {
    config = <IAppConfig>json_from_schema(jtomler.parseFileSync(full_config_path), config_schema);
} catch (error) {
    console.error(`${chalk.bgRed(" FATAL ")} Config file ${chalk.red(full_config_path)} parsing error. Error: ${chalk.red(error.message)}`);
    process.exit(1);
}

const ajv = new Ajv({
    allErrors: true, 
    strict: false
});
const validate = ajv.compile(config_schema);

if (validate(config) === false) {
    const error_text = AjvErrorHelper(validate);
    console.error(`${chalk.bgRed(" FATAL ")} Config schema errors:\n${chalk.red(error_text)}`);
    process.exit(1);
}

let j = 0;
const key_store_list: string[] = [];

for (let key_store_config of config.key_stores) {

    const ajv = new Ajv({allErrors: true});
    const validate_key_store = ajv.compile(key_store_schema);

    key_store_config = <IKeyStoreConfig>json_from_schema(key_store_config, key_store_schema);

    if (validate_key_store(key_store_config) === false) {
        const error_text = AjvErrorHelper(validate_key_store);
        console.error(`${chalk.bgRed(" FATAL ")} Config config.key_stores[${j}] parsing errors:\n${chalk.red(error_text)}`);
        process.exit(1);
    }

    if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_ENABLE`] !== undefined) {
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_ENABLE`] === "false") {
            key_store_config.enable = false;
        } else {
            key_store_config.enable = true;
        }
    }

    if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_DESCRIPTION`] !== undefined) {
        key_store_config.description = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_DESCRIPTION`];
    }

    if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TYPE`] !== undefined) {
        key_store_config.source.type = <TKeyStoreSourceConfigType>process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TYPE`];
    }

    let validate_key_store_source;

    if (key_store_config.source.type === "vault") {
        validate_key_store_source = ajv.compile(key_store_vault_v1_schema);
        key_store_config.source = <IKeyStoreSourceVaultConfig>json_from_schema(key_store_config.source, key_store_vault_v1_schema);
        const source = <IKeyStoreSourceVaultConfig>key_store_config.source;

        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_VERSION`] !== undefined) {
            source.version = <"v1"|"v2">process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_VERSION`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SECRETS`] !== undefined) {
            source.secrets = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SECRETS`].split(",");
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN`] !== undefined) {
            source.token = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_REFRESH_INTERVAL`] !== undefined) {
            source.refresh.interval = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_REFRESH_INTERVAL`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_REFRESH_JITTER`] !== undefined) {
            source.refresh.jitter = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_REFRESH_JITTER`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CONNECTION_HOST`] !== undefined) {
            source.connection.host = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_CONNECTION_HOST`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CONNECTION_PROTOCOL`] !== undefined) {
            source.connection.protocol = <"https"|"http">process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_CONNECTION_PROTOCOL`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CONNECTION_PORT`] !== undefined) {
            source.connection.port = parseInt(process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_CONNECTION_PORT`]);
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CONNECTION_PATH`] !== undefined) {
            source.connection.path = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_CONNECTION_PATH`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CONNECTION_TIMEOUT`] !== undefined) {
            source.connection.timeout = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TOKEN_CONNECTION_TIMEOUT`];
        }
        key_store_config.source = source;
    }
    
    if (key_store_config.source.type === "env") {
        validate_key_store_source = ajv.compile(key_store_env_schema);
        key_store_config.source = <IKeyStoreSourceEnvConfig>json_from_schema(key_store_config.source, key_store_env_schema);
        const source = <IKeyStoreSourceEnvConfig>key_store_config.source;
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_KEY_PREFIX`] !== undefined) {
            source.key_prefix = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_KEY_PREFIX`];
        }
        key_store_config.source = source;
    }

    if (key_store_config.source.type === "fs") {
        validate_key_store_source = ajv.compile(key_store_fs_schema);
        key_store_config.source = <IKeyStoreSourceFSConfig>json_from_schema(key_store_config.source, key_store_fs_schema);
        const source = <IKeyStoreSourceFSConfig>key_store_config.source;

        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`] !== undefined) {
            source.include_regexp = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`] !== undefined) {
            source.exclude_regexp = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SIZE`] !== undefined) {
            source.size = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SIZE`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_PATH`] !== undefined) {
            source.path = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_PATH`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] !== undefined) {
            if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] === "false") {
                source.cron.enable = false;
            } else {
                source.cron.enable = true;
            }
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`] !== undefined) {
            source.cron.interval = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`] !== undefined) {
            source.cron.time_zone = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_JITTER`] !== undefined) {
            source.cron.jitter = parseInt(process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_JITTER`]);
        }

        key_store_config.source = source;
    }

    if (key_store_config.source.type === "git") {
        validate_key_store_source = ajv.compile(key_store_git_schema);
        key_store_config.source = <IKeyStoreSourceGitConfig>json_from_schema(key_store_config.source, key_store_git_schema);
    }

    if (key_store_config.source.type === "git-crypt") {
        validate_key_store_source = ajv.compile(key_store_git_crypt_schema);
        key_store_config.source = <IKeyStoreSourceGitCryptConfig>json_from_schema(key_store_config.source, key_store_git_crypt_schema);
    }

    if (key_store_config.source.type === "git" || key_store_config.source.type === "git-crypt") {
        const source = <IKeyStoreSourceGitCryptConfig>key_store_config.source;

        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`] !== undefined) {
            source.include_regexp = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`] !== undefined) {
            source.exclude_regexp = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SIZE`] !== undefined) {
            source.size = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_SIZE`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TMP`] !== undefined) {
            source.tmp = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_TMP`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_COMMIT_COUNT`] !== undefined) {
            source.commit_count = parseInt(process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_COMMIT_COUNT`]);
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_REPOSITORY`] !== undefined) {
            source.repository = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_REPOSITORY`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_BRANCH`] !== undefined) {
            source.branch = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_BRANCH`];
        }

        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] !== undefined) {
            if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] === "false") {
                source.cron.enable = false;
            } else {
                source.cron.enable = true;
            }
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`] !== undefined) {
            source.cron.interval = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`] !== undefined) {
            source.cron.time_zone = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`];
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_JITTER`] !== undefined) {
            source.cron.jitter = parseInt(process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRON_JITTER`]);
        }
        if (process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRYPT_KEY_PATH`] !== undefined) {
            source.crypt_key_path = process.env[`CCS_KEY_STORE_${key_store_config.name.toUpperCase()}_SOURCE_CRYPT_KEY_PATH`];
        }
        key_store_config.source = source;
    }

    if (validate_key_store_source === undefined) {
        console.error(`${chalk.bgRed(" FATAL ")} Config config.key_stores[${j}] named ${chalk.yellow(key_store_config.name)} type ${chalk.red(key_store_config.source.type)} not support`);
        process.exit(1);
    }

    if (validate_key_store_source(key_store_config.source) === false) {
        const error_text = AjvErrorHelper(validate_key_store_source);
        console.error(`${chalk.bgRed(" FATAL ")} Config config.key_stores[${j}] named ${chalk.red(key_store_config.name)} parsing error. Schema errors:\n${chalk.red(error_text)}`);
        process.exit(1);
    }

    if (key_store_list.includes(key_store_config.name) === true) {
        console.error(`${chalk.bgRed(" FATAL ")} Key store named ${chalk.red(key_store_config.name)} already exist`);
        process.exit(1);
    }

    key_store_list.push(key_store_config.name);

    config.key_stores[j] = key_store_config;

    j++;

}

let i = 0;
const namespaces_list: string[] = [];

for (let namespace_config of config.namespaces) {

    const ajv = new Ajv({allErrors: true});
    const validate_namespace = ajv.compile(namespace_schema);

    namespace_config = <INamespaceConfig>json_from_schema(namespace_config, namespace_schema);

    if (validate_namespace(namespace_config) === false) {
        const error_text = AjvErrorHelper(validate_namespace);
        console.error(`${chalk.bgRed(" FATAL ")} Config config.namespaces[${i}] parsing errors:\n${chalk.red(error_text)}`);
        process.exit(1);
    }

    if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_ENABLE`] !== undefined) {
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_ENABLE`] === "false") {
            namespace_config.enable = false;
        } else {
            namespace_config.enable = true;
        }
    }

    if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_DESCRIPTION`] !== undefined) {
        namespace_config.description = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_DESCRIPTION`];
    }

    if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_TYPE`] !== undefined) {
        namespace_config.source.type = <TNamespaceSourceConfigType>process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_TYPE`];
    }

    let validate_source;
    
    if (namespace_config.source.type === "fs") {
        validate_source = ajv.compile(namespace_fs_source_schema);
        namespace_config.source = <INamespaceSourceFSConfig>json_from_schema(namespace_config.source, namespace_fs_source_schema);
        const source = <INamespaceSourceFSConfig>namespace_config.source;

        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`] !== undefined) {
            source.include_regexp = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`] !== undefined) {
            source.exclude_regexp = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_SIZE`] !== undefined) {
            source.size = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_SIZE`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_PATH`] !== undefined) {
            source.path = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_PATH`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] !== undefined) {
            if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] === "false") {
                source.cron.enable = false;
            } else {
                source.cron.enable = true;
            }
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`] !== undefined) {
            source.cron.interval = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`] !== undefined) {
            source.cron.time_zone = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_JITTER`] !== undefined) {
            source.cron.jitter = parseInt(process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_JITTER`]);
        }

        namespace_config.source = source;
    }

    if (namespace_config.source.type === "git") {
        validate_source = ajv.compile(namespace_git_source_schema);
        namespace_config.source = <INamespaceSourceGitConfig>json_from_schema(namespace_config.source, namespace_git_source_schema);
    }

    if (namespace_config.source.type === "git-crypt") {
        validate_source = ajv.compile(namespace_git_crypt_source_schema);
        namespace_config.source = <INamespaceSourceGitCryptConfig>json_from_schema(namespace_config.source, namespace_git_crypt_source_schema);
    }

    if (namespace_config.source.type === "git" || namespace_config.source.type === "git-crypt") {
        const source = <INamespaceSourceGitCryptConfig>namespace_config.source;

        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`] !== undefined) {
            source.include_regexp = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_INCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`] !== undefined) {
            source.exclude_regexp = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_EXCLUDE_REGEXP`].split(",");
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_SIZE`] !== undefined) {
            source.size = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_SIZE`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_TMP`] !== undefined) {
            source.tmp = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_TMP`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_COMMIT_COUNT`] !== undefined) {
            source.commit_count = parseInt(process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_COMMIT_COUNT`]);
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_REPOSITORY`] !== undefined) {
            source.repository = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_REPOSITORY`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_BRANCH`] !== undefined) {
            source.branch = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_BRANCH`];
        }

        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] !== undefined) {
            if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_ENABLE`] === "false") {
                source.cron.enable = false;
            } else {
                source.cron.enable = true;
            }
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`] !== undefined) {
            source.cron.interval = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_INTERVAL`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`] !== undefined) {
            source.cron.time_zone = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_TIME_ZONE`];
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_JITTER`] !== undefined) {
            source.cron.jitter = parseInt(process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRON_JITTER`]);
        }
        if (process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRYPT_KEY_PATH`] !== undefined) {
            source.crypt_key_path = process.env[`CCS_NAMESPACE_${namespace_config.name.toUpperCase()}_SOURCE_CRYPT_KEY_PATH`];
        }
        namespace_config.source = source;
    }

    if (validate_source === undefined) {
        console.error(`${chalk.bgRed(" FATAL ")} Config config.namespaces[${i}].source named ${chalk.yellow(namespace_config.name)} type ${chalk.red(namespace_config.source.type)} not support`);
        process.exit(1);
    }

    if (validate_source(namespace_config.source) === false) {
        const error_text = AjvErrorHelper(validate_source);
        console.error(`${chalk.bgRed(" FATAL ")} Config config.namespaces[${i}].source named ${chalk.red(namespace_config.name)} parsing error. Schema errors:\n${chalk.red(error_text)}`);
        process.exit(1);
    }

    if (namespaces_list.includes(namespace_config.name) === true) {
        console.error(`${chalk.bgRed(" FATAL ")} Namespace named ${chalk.red(namespace_config.name)} already exist`);
        process.exit(1);
    }

    for (const link_name of namespace_config.links) {
        if (key_store_list.includes(link_name) === false) {
            console.error(`${chalk.bgRed(" FATAL ")} Link ${chalk.red(link_name)} in links for namespace ${chalk.red(namespace_config.name)} not exist`);
            process.exit(1);
        }
    }

    namespaces_list.push(namespace_config.name);

    config.namespaces[i] = namespace_config;

    i++;

}

for (const env_name in process.env) {
    if (/CCS_AUTHORIZATION_TOKEN_[0-9]{1,3}/.test(env_name) === true) {
        if (config.authorization.tokens.includes(process.env[env_name]) === false) {
            config.authorization.tokens.push(process.env[env_name]);

        }
    }
}

config.api.prefix = `/${config.api.prefix.replace(/(^\/|\/$)/g,"")}`;

export default config;