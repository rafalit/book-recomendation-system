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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // opcjonalnie: usuń też z default headers
      delete api.defaults.headers.common.Authorization;
    }
    return Promise.reject(err);
  }
);

export default api;
