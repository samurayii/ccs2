import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { HealthController, IHealthController } from "../../lib/health-controller";
import { $Inject } from "../../lib/dependency-injection";

export async function routeHealthcheckStartup(
    fastify: FastifyInstance,
    health_controller = $Inject<IHealthController>(HealthController)
) {

    const handler = function (_request: FastifyRequest, reply: FastifyReply) {
        if (health_controller.healthy === true) {
            reply.code(200);
            reply.send("Healthy");
        } else {
            reply.code(404);
            reply.send("Unhealthy");
        }
    };

    fastify.route({
        url: "/healthcheck/startup",
        handler: handler,
        method: "GET"
    });
}
