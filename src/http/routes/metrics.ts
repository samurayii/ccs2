import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { IMetrics, Metrics } from "../../lib/metrics";

export async function routeMetrics(
    fastify: FastifyInstance,
    metrics = $Inject<IMetrics>(Metrics)
) {

    const handler = async function (_request: FastifyRequest, reply: FastifyReply) {
        reply.code(200);
        reply.send(metrics.getTXT());
    };

    fastify.route({
        url: "/metrics",
        handler: handler,
        method: "GET"
    });
}


