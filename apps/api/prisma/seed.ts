import "dotenv/config";
import {
  AdminRole,
  AdminStatus,
  LedgerConfirmStatus,
  LedgerGameStatus,
  LedgerGameType,
  LedgerTransactionType,
  MemberStatus,
  PracticeRoomMode,
  PracticeRoomStatus,
  Prisma,
  PrismaClient,
  TeamRole,
  UserStatus
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername =
    process.env.ADMIN_DEFAULT_USERNAME || process.env.ADMIN_DEV_USERNAME || "admin";
  const adminPassword =
    process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_DEV_PASSWORD || "admin123456";

  await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.NORMAL
    },
    create: {
      username: adminUsername,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.NORMAL
    }
  });

  const userA = await prisma.user.upsert({
    where: { openid: "dev_openid_a" },
    update: { nickname: "测试用户A", status: UserStatus.NORMAL },
    create: {
      openid: "dev_openid_a",
      nickname: "测试用户A",
      status: UserStatus.NORMAL
    }
  });

  const userB = await prisma.user.upsert({
    where: { openid: "dev_openid_b" },
    update: { nickname: "测试用户B", status: UserStatus.NORMAL },
    create: {
      openid: "dev_openid_b",
      nickname: "测试用户B",
      status: UserStatus.NORMAL
    }
  });

  const team = await prisma.team.upsert({
    where: { id: "seed_team_allinle" },
    update: { name: "ALLINLE 测试团队" },
    create: {
      id: "seed_team_allinle",
      name: "ALLINLE 测试团队",
      ownerUserId: userA.id
    }
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: userA.id } },
    update: { role: TeamRole.OWNER, status: MemberStatus.ACTIVE },
    create: { teamId: team.id, userId: userA.id, role: TeamRole.OWNER, status: MemberStatus.ACTIVE }
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: userB.id } },
    update: { role: TeamRole.MEMBER, status: MemberStatus.ACTIVE },
    create: { teamId: team.id, userId: userB.id, role: TeamRole.MEMBER, status: MemberStatus.ACTIVE }
  });

  await seedLedger(userA.id);
  await seedPracticeRoom(userA.id, userB.id);
  await seedSystemConfig();

  console.log("Seed finished");
  console.log(`Admin username: ${adminUsername}`);
  console.log(`Admin password: ${adminPassword}`);
}

async function seedLedger(ownerUserId: string) {
  const existing = await prisma.ledgerGame.findFirst({
    where: { ownerUserId, title: "Seed 个人记账样例" }
  });
  if (existing) return;

  const buyIn = new Prisma.Decimal(1000);
  const cashOut = new Prisma.Decimal(1500);
  const profit = cashOut.minus(buyIn);

  const game = await prisma.ledgerGame.create({
    data: {
      ownerUserId,
      type: LedgerGameType.PERSONAL,
      title: "Seed 个人记账样例",
      blindLevel: "1/2",
      gameDate: new Date("2026-07-07T00:00:00.000Z"),
      status: LedgerGameStatus.CONFIRMED,
      totalBuyIn: buyIn,
      totalCashOut: cashOut,
      totalProfit: profit,
      note: "seed 示例记录"
    }
  });

  const player = await prisma.ledgerPlayer.create({
    data: {
      gameId: game.id,
      userId: ownerUserId,
      displayName: "测试用户A",
      totalBuyIn: buyIn,
      totalCashOut: cashOut,
      profit,
      confirmStatus: LedgerConfirmStatus.CONFIRMED
    }
  });

  await prisma.ledgerTransaction.createMany({
    data: [
      {
        gameId: game.id,
        playerId: player.id,
        type: LedgerTransactionType.BUY_IN,
        amount: buyIn,
        note: "初始买入"
      },
      {
        gameId: game.id,
        playerId: player.id,
        type: LedgerTransactionType.CASH_OUT,
        amount: cashOut,
        note: "结束带出"
      }
    ]
  });

  await prisma.ledgerConfirmation.create({
    data: {
      gameId: game.id,
      userId: ownerUserId,
      status: LedgerConfirmStatus.CONFIRMED,
      note: "seed 确认"
    }
  });
}

async function seedPracticeRoom(ownerUserId: string, memberUserId: string) {
  const existing = await prisma.practiceRoom.findUnique({ where: { roomCode: "SEED01" } });
  if (existing) return;

  await prisma.practiceRoom.create({
    data: {
      roomCode: "SEED01",
      ownerUserId,
      mode: PracticeRoomMode.FRIENDS,
      playerCount: 6,
      smallBlind: 5,
      bigBlind: 10,
      initialPracticeChips: 2000,
      status: PracticeRoomStatus.READY,
      players: {
        create: [
          {
            userId: ownerUserId,
            seatNo: 1,
            chips: 2000,
            readyStatus: true,
            initialChipsConfirmed: true
          },
          {
            userId: memberUserId,
            seatNo: 2,
            chips: 2000,
            readyStatus: true,
            initialChipsConfirmed: true
          }
        ]
      }
    }
  });
}

async function seedSystemConfig() {
  const entries: Record<string, Prisma.InputJsonValue> = {
    defaultPracticeChips: 10000,
    allowedPlayerCounts: [2, 3, 4, 5, 6, 7, 8, 9],
    defaultBlinds: [
      { smallBlind: 5, bigBlind: 10 },
      { smallBlind: 50, bigBlind: 100 }
    ],
    botDifficulties: ["BEGINNER", "NORMAL", "ADVANCED"]
  };

  await Promise.all(
    Object.entries(entries).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
