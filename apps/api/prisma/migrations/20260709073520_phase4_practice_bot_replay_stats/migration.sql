-- AlterTable
ALTER TABLE `PracticeHandPlayer` ADD COLUMN `bestFiveCards` JSON NULL,
    ADD COLUMN `botLevel` ENUM('BEGINNER', 'NORMAL', 'ADVANCED') NULL,
    ADD COLUMN `handRankCategory` VARCHAR(191) NULL,
    ADD COLUMN `handRankDescription` VARCHAR(191) NULL,
    ADD COLUMN `isBot` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nickname` VARCHAR(191) NULL,
    ADD COLUMN `showdown` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PracticeRoom` ADD COLUMN `endedAt` DATETIME(3) NULL,
    ADD COLUMN `startedAt` DATETIME(3) NULL;
