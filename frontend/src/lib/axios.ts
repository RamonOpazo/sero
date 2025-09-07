import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from "axios";
import { type Result, ok, err } from "@/lib/result"; // Adjust path as needed

// Create the base API instance
export const api: AxiosInstance & {
  safe: {
    get<T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<Result<T, AxiosError>>;
    post<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig
    ): Promise<Result<T, AxiosError>>;
    put<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig
    ): Promise<Result<T, AxiosError>>;
    patch<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig
    ): Promise<Result<T, AxiosError>>;
    delete<T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<Result<T, AxiosError>>;
  };
} = Object.assign(
  axios.create({
    baseURL: "/api",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  }),
  {
    safe: {
      async get<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
      ): Promise<Result<T, AxiosError>> {
        try {
          const res: AxiosResponse<T> = await api.get(url, config);
          return ok(res.data);
        } catch (e) {
          return err(e as AxiosError);
        }
      },

      async post<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig
      ): Promise<Result<T, AxiosError>> {
        try {
          const res: AxiosResponse<T> = await api.post(url, data, config);
          return ok(res.data);
        } catch (e) {
          return err(e as AxiosError);
        }
      },

      async put<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig
      ): Promise<Result<T, AxiosError>> {
        try {
          const res: AxiosResponse<T> = await api.put(url, data, config);
          return ok(res.data);
        } catch (e) {
          return err(e as AxiosError);
        }
      },

      async patch<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig
      ): Promise<Result<T, AxiosError>> {
        try {
          const res: AxiosResponse<T> = await api.patch(url, data, config);
          return ok(res.data);
        } catch (e) {
          return err(e as AxiosError);
        }
      },

      async delete<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
      ): Promise<Result<T, AxiosError>> {
        try {
          const res: AxiosResponse<T> = await api.delete(url, config);
          return ok(res.data);
        } catch (e) {
          return err(e as AxiosError);
        }
      },
    },
  }
);

// Logging / error interceptors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API error:", err);
    return Promise.reject(err);
  }
);
