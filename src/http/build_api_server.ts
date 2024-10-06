import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import chalk from "chalk";
import { IApiServerConfig } from "../lib/config.interfaces";
import { getByteSize } from "../lib/tools/get_byte_size";
import { routePing } from "./routes/ping";
import { routeHealthcheck } from "./routes/healthcheck";
import { routeHealthcheckReadiness } from "./routes/healthcheck_readiness";
import { routeHealthcheckLiveness } from "./routes/healthcheck_liveness";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { IApiServerFastifyInstance } from "./interfaces";
import { routeHealthcheckStartup } from "./routes/healthcheck_startup";
import { routeMetrics } from "./routes/metrics";
import { routeAuth } from "./routes/auth";
import { routeLogoff } from "./routes/logoff";
import { routeNamespaces } from "./routes/namespaces";
import { routeNamespace } from "./routes/namespace";
import { routeStore } from "./routes/store";

export function buildApiServer (config: IApiServerConfig, logger: ILoggerEventEmitter): FastifyInstance {

    const server = Fastify({
        logger: false,
        trustProxy: config.trust_proxy,
        connectionTimeout: config.connection_timeout,
        bodyLimit: getByteSize(config.body_limit),
        keepAliveTimeout: config.keep_alive_timeout
    });

    server.decorate("logger", logger);

    server.addHook("onRoute", async (route) => {
        logger.debug(`Registered route: ${chalk.yellow(route.method)} ${chalk.cyan(route.url)}`);
    });

    server.addHook("onClose", async () => {
        logger.debug("Server closed");
    });

    if (config.logging === true) {

        logger.debug(`Logging ${chalk.cyan("enabled")}`);

        const ignore_regexp_request = /(_ping|healthcheck|healthcheck\/readiness|healthcheck\/liveness)$/;

        server.addHook("onRequest", async (request: FastifyRequest) => {

            if (ignore_regexp_request.test(request.url) === true) {
                return;
            }

            if (request.body === null || request.body === undefined) {
                logger.debug(`Request ID ${chalk.green(request.id)} ${chalk.gray("-->")} ${chalk.yellow(request.method)} ${chalk.cyan(request.url)}`);
            } else {
                let body = request.body;
                if (typeof body === "object") {
                    body = JSON.stringify(body, null, 2);
                }
                logger.debug(`Request ID ${request.id}, ${chalk.yellow(request.method)} ${chalk.cyan(request.url)}\nBODY:\n${body}`);
            }
        });

        server.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
            if (ignore_regexp_request.test(request.url) === true) {
                return;
            }
            logger.debug(`Response ID ${chalk.green(request.id)} ${chalk.gray("<--")} ${chalk.yellow(request.method)} ${chalk.cyan(request.url)}, status: ${chalk.yellow(reply.statusCode)}, time: ${chalk.green(reply.elapsedTime)} ms`);
        });

    }

    server.setErrorHandler(function (error: FastifyError, request: FastifyRequest, reply: FastifyReply) {

        logger.error(`Request ID ${chalk.red(request.id)} error. Error: ${chalk.red(error.message)}`);
        logger.trace(error);

        reply.status(500).send({
            status: "error",
            message: "Internal Server Error"
        });

    });

    server.setNotFoundHandler(function (request: FastifyRequest, reply: FastifyReply) {
        reply.status(404).send({
            status: "Not Found",
            message: `Route ${request.method} ${request.url} not found`
        });
    });

    server.register( async function (fastify: IApiServerFastifyInstance) {

        fastify.decorate("logger", logger);

        routePing(fastify);
        routeHealthcheck(fastify);
        routeHealthcheckReadiness(fastify);
        routeHealthcheckLiveness(fastify);
        routeHealthcheckStartup(fastify);
        routeMetrics(fastify);

    });

    const prefix_v1 = `${config.prefix.replace(/\/$/,"")}/v1`;
    const route_options_v1 = {
        prefix: prefix_v1
    };

    server.register( async function (fastify: IApiServerFastifyInstance) {

        fastify.decorate("logger", logger);

        routePing(fastify);
        routeHealthcheck(fastify);
        routeHealthcheckReadiness(fastify);
        routeHealthcheckLiveness(fastify);
        routeHealthcheckStartup(fastify);
        routeMetrics(fastify);

        routeAuth(fastify);
        routeLogoff(fastify);
        routeNamespaces(fastify);
        routeNamespace(fastify);
        routeStore(fastify);

    }, route_options_v1);

    return server;

}