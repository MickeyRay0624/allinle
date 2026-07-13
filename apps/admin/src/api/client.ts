import { config } from "../config";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code?: string;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${config.apiBaseUrl}${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      Authorization: token ? `Bearer ${token}` : ""
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = (await res.json()) as ApiResponse<T>;
  if (!payload.success) {
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body)
};
