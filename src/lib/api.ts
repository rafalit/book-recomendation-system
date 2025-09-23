// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: false,
});

export const setApiToken = (t: string | null) => {
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
  else delete api.defaults.headers.common.Authorization;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err.config?.url || "";
      if (url.includes("/auth/")) {
        // tylko jeśli 401 z /auth/... to kasujemy token
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common.Authorization;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
