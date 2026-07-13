-- AlterTable
ALTER TABLE `PracticeAction` MODIFY `actionType` ENUM('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN', 'SMALL_BLIND', 'BIG_BLIND', 'DEAL', 'SHOWDOWN', 'WIN') NOT NULL,
    MODIFY `street` ENUM('PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN') NOT NULL;

-- AlterTable
ALTER TABLE `PracticeHand` ADD COLUMN `status` ENUM('PLAYING', 'FINISHED') NOT NULL DEFAULT 'PLAYING';

-- CreateTable
CREATE TABLE `PracticeHandPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `handId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `seatNo` INTEGER NOT NULL,
    `holeCards` JSON NULL,
    `startChips` INTEGER NOT NULL,
    `endChips` INTEGER NULL,
    `invested` INTEGER NOT NULL DEFAULT 0,
    `netResult` INTEGER NULL,
    `finalStatus` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PracticeHandPlayer_handId_idx`(`handId`),
    INDEX `PracticeHandPlayer_userId_idx`(`userId`),
    UNIQUE INDEX `PracticeHandPlayer_handId_seatNo_key`(`handId`, `seatNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PracticeHand_status_idx` ON `PracticeHand`(`status`);

-- AddForeignKey
ALTER TABLE `PracticeHandPlayer` ADD CONSTRAINT `PracticeHandPlayer_handId_fkey` FOREIGN KEY (`handId`) REFERENCES `PracticeHand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeHandPlayer` ADD CONSTRAINT `PracticeHandPlayer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
