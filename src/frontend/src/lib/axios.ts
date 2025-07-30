import axios from "axios"

// reusable axios api call
export const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// interceptor
api.interceptors.response.use(
    res => res,
    err => {
      // Centralized error logging
      console.error("API error:", err)
      return Promise.reject(err)
    }
  )
