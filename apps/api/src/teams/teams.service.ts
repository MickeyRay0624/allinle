import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberStatus, TeamRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateTeamDto } from "./dto/create-team.dto";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(ownerUserId: string, dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        name: dto.name,
        ownerUserId,
        members: {
          create: {
            userId: ownerUserId,
            role: TeamRole.OWNER,
            status: MemberStatus.ACTIVE
          }
        }
      },
      include: { members: true }
    });
  }

  async listMyTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            status: MemberStatus.ACTIVE
          }
        }
      },
      include: {
        owner: { select: { id: true, nickname: true } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getTeam(userId: string, teamId: string) {
    await this.assertMember(teamId, userId);
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: { select: { id: true, nickname: true } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } }
          }
        }
      }
    });
    if (!team) throw new NotFoundException("团队不存在");
    return team;
  }

  async addMember(operatorUserId: string, teamId: string, dto: AddTeamMemberDto) {
    await this.assertAdmin(teamId, operatorUserId);
    return this.prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: dto.userId
        }
      },
      update: {
        role: dto.role || TeamRole.MEMBER,
        status: MemberStatus.ACTIVE
      },
      create: {
        teamId,
        userId: dto.userId,
        role: dto.role || TeamRole.MEMBER,
        status: MemberStatus.ACTIVE
      }
    });
  }

  async assertMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        status: MemberStatus.ACTIVE
      }
    });
    if (!member) {
      throw new ForbiddenException("无权访问该团队");
    }
    return member;
  }

  async assertAdmin(teamId: string, userId: string) {
    const member = await this.assertMember(teamId, userId);
    if (member.role !== TeamRole.OWNER && member.role !== TeamRole.ADMIN) {
      throw new ForbiddenException("需要团队管理员权限");
    }
    return member;
  }
}
