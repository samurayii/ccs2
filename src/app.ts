import config from "./lib/init";
import chalk from "chalk";
import { LoggerEventEmitter } from "logger-event-emitter";
import { buildApiServer } from "./http/build_api_server";
import { Metrics } from "./lib/metrics";
import { HealthController } from "./lib/health-controller";
import { $Singleton } from "./lib/dependency-injection";
import { NamespaceRepository } from "./lib/namespace-repository";
import { KeyStoreRepository } from "./lib/key-store-repository";
import { Gatherer } from "./lib/gatherer";
import { Sessions } from "./lib/sessions";
import { Authorization } from "./lib/authorization";

const logger = new LoggerEventEmitter(config.logger);

logger.debug(`\nCONFIG:\n${JSON.stringify(config, null, 4)}`);

const metrics = new Metrics(config.metrics, logger.child("metrics"));
const health_controller = new HealthController(logger.child("health-controller"));

$Singleton(Metrics.name, undefined, () => {return metrics;});
$Singleton(HealthController.name, undefined, () => {return health_controller;});

const namespace_repository = new NamespaceRepository(config.namespaces, logger.child("namespace"));
const key_store_repository = new KeyStoreRepository(config.key_stores, logger.child("key-store"));
const gatherer = new Gatherer(config.gatherer, namespace_repository, key_store_repository, logger.child("gatherer"));
const sessions = new Sessions(config.sessions, logger.child("sessions"));
const authorization = new Authorization(config.authorization);

$Singleton(Sessions.name, undefined, () => {return sessions;});
$Singleton(Gatherer.name, undefined, () => {return gatherer;});
$Singleton(Authorization.name, undefined, () => {return authorization;});
$Singleton(NamespaceRepository.name, undefined, () => {return namespace_repository;});
$Singleton(KeyStoreRepository.name, undefined, () => {return key_store_repository;});

const bootstrap = async () => {

    try {

        const api_server_logger = logger.child("api-server");
        const api_server = buildApiServer(config.api, api_server_logger);

        metrics.createGauge("healthy", "Healthcheck status");

        const id_interval = setInterval( () => {
            metrics.add("healthy", health_controller.healthy ? 1 : 0);
        }, 1000);

        await gatherer.run();


        if (config.api.enable === true) {

            api_server.listen({
                port: config.api.port,
                host: config.api.hostname,
                backlog: config.api.backlog
            }, (error: Error, address: string) => {
                if (error !== null) {
                    api_server_logger.fatal(`Error start server. Error: ${chalk.red(error)}`);
                    process.exit(1);
                }
                api_server_logger.info(`Server listening on ${chalk.cyan(address)}`);
            });
        }

        const stop_app = async () => {
            clearInterval(id_interval);
            await metrics.close();
            await gatherer.close();
            api_server.close();
            setImmediate( () => {
                process.exit();
            });
        };

        process.on("SIGTERM", () => {
            logger.info(`Signal ${chalk.cyan("SIGTERM")} received`);
            stop_app();
        });

        process.on("SIGINT", () => {
            logger.info(`Signal ${chalk.cyan("SIGINT")} received`);
            stop_app();
        });

    } catch (error) {
        logger.fatal(`Error application start.\n${error.stack}`);
        process.exit(1);
    }

};

bootstrap();