// 日志测试
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import type { HttpInterceptor } from '../types'

export class LogInterceptor implements HttpInterceptor {
    request(config: AxiosRequestConfig) {

        console.log(
            '[Request]',
            config.url
        )
        return config
    }

    response(response: AxiosResponse) {

        console.log(
            '[Response]',
            response.config.url
        )
        return response
    }
}