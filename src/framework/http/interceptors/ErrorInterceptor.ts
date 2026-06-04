// 统一返回处理
export class ErrorInterceptor implements HttpInterceptor {
    response(response) {
        const { code, message, success = true } = response.data
        if (!success) {
            throw new Error(message)
        }
        return response
    }
}