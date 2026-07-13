import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { BotModule } from "./bot/bot.module";
import { CommonModule } from "./common/modules/common.module";
import { EventLogModule } from "./event-log/event-log.module";
import { HealthModule } from "./health/health.module";
import { LedgerModule } from "./ledger/ledger.module";
import { PracticeGameModule } from "./practice-game/practice-game.module";
import { PracticeRoomModule } from "./practice-room/practice-room.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RiskModule } from "./risk/risk.module";
import { SecurityModule } from "./security/security.module";
import { StatsModule } from "./stats/stats.module";
import { TeamsModule } from "./teams/teams.module";
import { TeamLedgerModule } from "./team-ledger/team-ledger.module";
import { UsersModule } from "./users/users.module";
import { AppWebSocketModule } from "./websocket/websocket.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    CommonModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    LedgerModule,
    TeamLedgerModule,
    PracticeRoomModule,
    PracticeGameModule,
    BotModule,
    StatsModule,
    RiskModule,
    AdminModule,
    AppWebSocketModule,
    EventLogModule,
    HealthModule,
    SecurityModule,
  ],
})
export class AppModule {}
