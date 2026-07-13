import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        openid: true,
        unionid: true,
        nickname: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: dto,
        select: {
          id: true,
          openid: true,
          nickname: true,
          avatarUrl: true,
          status: true,
          updatedAt: true
        }
      });
      if (dto.nickname) {
        await tx.teamLedgerParticipant.updateMany({
          where: { userId },
          data: { displayName: dto.nickname }
        });
      }
      return user;
    });
  }

  async updateAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) throw new NotFoundException("请选择有效的头像图片");
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://api.poker.lmqstudio.com";
    const avatarUrl = `${baseUrl}/uploads/${file.filename}`;
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl }, select: { id: true, openid: true, nickname: true, avatarUrl: true, status: true, updatedAt: true } });
    await this.prisma.teamLedgerParticipant.updateMany({ where: { userId }, data: { avatarUrl } });
    return user;
  }
}
