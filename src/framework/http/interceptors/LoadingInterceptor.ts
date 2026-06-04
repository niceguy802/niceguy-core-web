// 统一加载状态 后续实现调用 ElLoading.service()
export class LoadingInterceptor implements HttpInterceptor {
    request(config) {
        console.log('show loading')
        return config
    }

    response(response) {
        console.log('hide loading')
        return response
    }

    responseError(error) {
        console.log('hide loading')
        return Promise.reject(error)
    }
}