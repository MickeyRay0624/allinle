import { Injectable } from "@nestjs/common";

@Injectable()
export class BotService {
  listDifficultyProfiles() {
    return [
      {
        level: "BEGINNER",
        name: "入门",
        description: "偏保守，适合规则熟悉阶段"
      },
      {
        level: "NORMAL",
        name: "普通",
        description: "基础翻前范围和简单翻后策略"
      },
      {
        level: "ADVANCED",
        name: "进阶",
        description: "预留更完整的范围、位置和下注尺度策略"
      }
    ];
  }
}
