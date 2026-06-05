import { createHttpClient } from "@sisin/http-client";

export type {ApiResponse} from "@sisin/http-client";

export const http = createHttpClient({
    baseURL: "/api",
    timeout: 10000,
    tokenMode: "cookie"
})