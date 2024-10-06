import { FastifyInstance, FastifyReply } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { ISessions, Sessions } from "../../lib/sessions";
import Ajv from "ajv";
import * as request_body_schema from "../schemes/namespace-body-request.json";
import * as request_search_schema from "../schemes/namespace-search-request.json";
import * as request_key_schema from "../schemes/namespace-key-request.json";
import { AjvErrorHelperNoColor } from "../../lib/tools/ajv_error_helper_no_color";
import { INamespaceBodyFastifyRequest, INamespaceKeyFastifyRequest, INamespaceSearchFastifyRequest, ServerResponse } from "../interfaces";
import { Gatherer, IGatherer } from "../../lib/gatherer";
import { INamespaceRepository, NamespaceRepository } from "../../lib/namespace-repository";

export async function routeNamespace(
    fastify: FastifyInstance,
    sessions = $Inject<ISessions>(Sessions),
    gatherer = $Inject<IGatherer>(Gatherer),
    namespace_repository = $Inject<INamespaceRepository>(NamespaceRepository)
) {
   
    const handlerBody = async function (request: INamespaceBodyFastifyRequest, reply: FastifyReply) {

        const ajv = new Ajv({
            allErrors: true, 
            strict: false
        });

        const validate = ajv.compile(request_body_schema);

        if (validate(request.body) === false) {
            const error_text = AjvErrorHelperNoColor(validate);
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: error_text
            });
            return;
        }

        if (sessions.exist(request.body.session_token) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: "Session not found"
            });
            return;
        }

        const session = sessions.get(request.body.session_token);
        const result = await gatherer.gathering(request.body.path.replace(/^\//,""), session.properties);

        if (result.status === "fail") {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: result.message
            });
            return;
        }

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: {
                path: result.data.path,
                hash: result.data.hash,
                body: result.data.body
            }
        });

    };

    const handlerSearch = async function (request: INamespaceSearchFastifyRequest, reply: FastifyReply) {

        const ajv = new Ajv({
            allErrors: true, 
            strict: false
        });

        const validate = ajv.compile(request_search_schema);

        if (validate(request.body) === false) {
            const error_text = AjvErrorHelperNoColor(validate);
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: error_text
            });
            return;
        }

        if (sessions.exist(request.body.session_token) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: "Session not found"
            });
            return;
        }

        const session = sessions.get(request.body.session_token);
        const file_list = await namespace_repository.search(request.body.pattern.replace(/^\//,""));
        const result: {
            path: string 
            hash: string
        }[] = [];

        for (const file_path of file_list) {
            const gatherer_result = await gatherer.gathering(file_path, session.properties);
            if (gatherer_result.status !== "success") {
                continue;
            }
            result.push({
                path: gatherer_result.data.path,
                hash: gatherer_result.data.hash
            });
        }

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: result
        });

    };

    const handlerKey = async function (request: INamespaceKeyFastifyRequest, reply: FastifyReply) {

        const ajv = new Ajv({
            allErrors: true, 
            strict: false
        });

        const validate = ajv.compile(request_key_schema);

        if (validate(request.body) === false) {
            const error_text = AjvErrorHelperNoColor(validate);
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: error_text
            });
            return;
        }

        if (sessions.exist(request.body.session_token) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: "Session not found"
            });
            return;
        }

        const session = sessions.get(request.body.session_token);
        const result = await gatherer.getFileKey(request.body.key, request.body.path.replace(/^\//,""), session.properties);

        if (result.status === "fail") {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: result.message
            });
            return;
        }

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: result.data
        });

    };

    fastify.route({
        url: "/namespace/body",
        handler: handlerBody,
        method: "POST"
    });
    fastify.route({
        url: "/namespace/search",
        handler: handlerSearch,
        method: "POST"
    });
    fastify.route({
        url: "/namespace/key",
        handler: handlerKey,
        method: "POST"
    });
}


