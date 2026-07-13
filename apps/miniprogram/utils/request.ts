const API_BASE = "https://api.lmqstudio.com/api";

interface RequestOptions {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  needAuth?: boolean;
}

export function getToken(): string | null {
  try {
    return wx.getStorageSync("token") || null;
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  wx.setStorageSync("token", token);
}

function clearToken() {
  wx.removeStorageSync("token");
  wx.removeStorageSync("user");
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.header,
  };

  if (token && options.needAuth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${options.url}`,
      method: (options.method || "GET") as any,
      data: options.data,
      header: headers,
      success: (res: any) => {
        const body = res.data;

        // Token expired or unauthorized
        if (res.statusCode === 401 && body?.code === "AUTH_UNAUTHORIZED") {
          clearToken();
          // Trigger re-login
          const app = getApp();
          if ((app as any).reLogin) {
            (app as any).reLogin();
          }
          reject(new Error("登录已过期"));
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body.data !== undefined ? body.data : body);
        } else {
          reject(new Error(body?.message || "请求失败"));
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || "网络错误"));
      },
    });
  });
}

// WeChat login helper
export async function wechatLogin(userInfo?: { nickname?: string; avatarUrl?: string }) {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (loginRes: any) => {
        try {
          const result = await request({
            url: "/auth/wx-login",
            method: "POST",
            data: {
              code: loginRes.code,
              ...userInfo,
            },
            needAuth: false,
          }) as any;

          if (result?.token) {
            setToken(result.token);
            if (result.user) {
              wx.setStorageSync("user", result.user);
            }
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || "wx.login 失败"));
      },
    });
  });
}

// Dev login helper - only in development
export async function devLogin(nickname?: string) {
  return request({
    url: "/auth/dev-login",
    method: "POST",
    data: {
      openid: `dev_${Date.now()}`,
      nickname: nickname || "测试用户",
    },
    needAuth: false,
  }) as any;
}

// Ensure dev login - auto login as random test user
export async function ensureDevLogin() {
  const token = getToken();
  if (token) return token;

  const result = await devLogin();
  if (result?.token) {
    setToken(result.token);
    if (result.user) wx.setStorageSync("user", result.user);
    return result.token;
  }
  throw new Error("开发登录失败");
}

// Switch dev user - login as a different test user
const TEST_USERS = [
  "测试用户1", "测试用户2", "测试用户3",
  "ALLINLE玩家A", "ALLINLE玩家B",
];

let testUserIndex = 0;
export async function switchDevLogin() {
  testUserIndex = (testUserIndex + 1) % TEST_USERS.length;
  const nickname = TEST_USERS[testUserIndex];

  const result = await devLogin(nickname);
  if (result?.token) {
    setToken(result.token);
    if (result.user) wx.setStorageSync("user", result.user);
    return result.token;
  }
  throw new Error("切换账号失败");
}

// API helper for simpler calls
export const api = {
  get: <T = any>(url: string) => request<T>({ url }),
  post: <T = any>(url: string, data?: any) => request<T>({ url, method: "POST", data }),
};

// Check if running in WeChat dev tools (development mode)
export function isDevVersion(): boolean {
  try {
    const info = wx.getAccountInfoSync();
    return info.miniProgram.envVersion !== "release";
  } catch {
    return false;
  }
}
