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
}
