import { Injectable, InternalServerErrorException } from "@nestjs/common";

export interface WxSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

@Injectable()
export class WechatService {
  async code2Session(code: string): Promise<WxSession> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret || appid === "your_wechat_appid" || secret === "your_wechat_secret") {
      return this.fallbackSession(code);
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data = (await response.json()) as {
        openid?: string;
        session_key?: string;
        unionid?: string;
        errcode?: number;
        errmsg?: string;
      };

      if (data.errcode || !data.openid) {
        throw new InternalServerErrorException(
          `微信登录失败: ${data.errmsg || "未知错误"} (errcode: ${data.errcode})`
        );
      }

      return {
        openid: data.openid,
        session_key: data.session_key || "",
        unionid: data.unionid,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("微信服务暂时不可用，请稍后重试");
    }
  }

  /** Fallback for dev environment - derives stable openid from code */
  private fallbackSession(code: string): WxSession {
    const hash = this.simpleHash(code);
    return {
      openid: `wx_dev_${hash}`,
      session_key: `dev_session_${hash}`,
    };
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}
