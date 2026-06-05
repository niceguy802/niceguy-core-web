import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios'
import { NetworkError } from '../errors'

export class AxiosAdapter {
  private axiosInstance: AxiosInstance

  constructor(instance: AxiosInstance) {
    this.axiosInstance = instance
  }

  async request(config: AxiosRequestConfig): Promise<AxiosResponse> {
    try {
      return await this.axiosInstance.request(config)
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          return error.response
        }
        throw new NetworkError(error.message)
      }

      throw error
    }
  }
}
