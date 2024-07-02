import {
    bridgeProviderConfig,
} from "../../../config";

import {
    ProviderType,
    ProviderBase,
} from "../../../types/provider";

import {
    HookProvider,
} from "../../../types/provider/hook";

import {
    Router,
    Request,
    Response,
    Handler,
} from "express";

import {
    middleware,
    MiddlewareConfig,
    WebhookEvent,
} from "@line/bot-sdk";

import message from "./message";

type EventMethod = (event: WebhookEvent) =>
    Promise<void> | void;

type EventMethodList = {
    [key: string]: EventMethod
};

const eventHandlers: EventMethodList = {
    message,
};

/**
 * Run the event.
 * @param {WebhookEvent} event - The event to run.
 * @return {Promise<void>}
 */
async function runEvent(event: WebhookEvent): Promise<void> {
    const typeName: string = event.type.toString();
    if (typeName in eventHandlers) {
        eventHandlers[typeName](event);
    }
}

/**
 * Hook provider for LINE.
 */
export default class LINEHook extends ProviderBase implements HookProvider {
    /**
     * Get the type.
     */
    public get type(): ProviderType {
        return "line";
    }

    /**
     * Async hook.
     * @param {Router} router - The router.
     * @return {Promise<void>}
     */
    async hook(router: Router): Promise<void> {
        router.post(
            "/line",
            this.middleware,
            this.controller,
        );
    }

    /**
     * Get the middleware.
     * @return {Handler}
     */
    get middleware(): Handler {
        const {
            line: lineConfig,
        } = bridgeProviderConfig();
        const {
            channelSecret,
        } = lineConfig;
        const config: MiddlewareConfig = {
            channelSecret,
        };
        return middleware(config);
    }

    /**
     * The controller.
     * @param {Request} req - The request.
     * @param {Response} res - The response.
     * @return {Promise<void>}
     */
    async controller(req: Request, res: Response): Promise<void> {
        // Get the events from the request.
        const events: WebhookEvent[] = req.body.events;
        // Try to process the events.
        try {
            // Process all of the events.
            const promises = events.map(runEvent);
            await Promise.all(promises);
            // Return a successfull message.
            res.status(200).json({
                status: "success",
            });
        } catch (err: unknown) {
            // Print the error.
            if (err instanceof Error) {
                console.error(err);
            }
            // Return an error message.
            res.status(500).json({
                status: "error",
            });
        }
    }
}
