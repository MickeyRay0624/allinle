-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `unionid` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `status` ENUM('NORMAL', 'LIMITED', 'BANNED') NOT NULL DEFAULT 'NORMAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_openid_key`(`openid`),
    UNIQUE INDEX `User_unionid_key`(`unionid`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_ownerUserId_idx`(`ownerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMember` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `status` ENUM('ACTIVE', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TeamMember_userId_idx`(`userId`),
    UNIQUE INDEX `TeamMember_teamId_userId_key`(`teamId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerGame` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NULL,
    `type` ENUM('PERSONAL', 'TEAM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `blindLevel` VARCHAR(191) NULL,
    `gameDate` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NULL,
    `status` ENUM('DRAFT', 'ONGOING', 'FINISHED', 'CONFIRMED', 'DISPUTED') NOT NULL DEFAULT 'DRAFT',
    `totalBuyIn` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalCashOut` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalProfit` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LedgerGame_ownerUserId_type_idx`(`ownerUserId`, `type`),
    INDEX `LedgerGame_teamId_idx`(`teamId`),
    INDEX `LedgerGame_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `totalBuyIn` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalCashOut` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `profit` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `confirmStatus` ENUM('PENDING', 'CONFIRMED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LedgerPlayer_gameId_idx`(`gameId`),
    INDEX `LedgerPlayer_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `type` ENUM('BUY_IN', 'REBUY', 'CASH_OUT', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerTransaction_gameId_idx`(`gameId`),
    INDEX `LedgerTransaction_playerId_idx`(`playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerConfirmation` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'DISPUTED') NOT NULL,
    `note` TEXT NULL,
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerConfirmation_userId_idx`(`userId`),
    UNIQUE INDEX `LedgerConfirmation_gameId_userId_key`(`gameId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticeRoom` (
    `id` VARCHAR(191) NOT NULL,
    `roomCode` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `mode` ENUM('FRIENDS', 'SOLO') NOT NULL,
    `playerCount` INTEGER NOT NULL,
    `smallBlind` INTEGER NOT NULL,
    `bigBlind` INTEGER NOT NULL,
    `initialPracticeChips` INTEGER NOT NULL,
    `status` ENUM('WAITING', 'READY', 'PLAYING', 'FINISHED', 'CLOSED') NOT NULL DEFAULT 'WAITING',
    `complianceConfirmedRequired` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PracticeRoom_roomCode_key`(`roomCode`),
    INDEX `PracticeRoom_ownerUserId_idx`(`ownerUserId`),
    INDEX `PracticeRoom_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticeRoomPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `seatNo` INTEGER NOT NULL,
    `chips` INTEGER NOT NULL,
    `readyStatus` BOOLEAN NOT NULL DEFAULT false,
    `initialChipsConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `isBot` BOOLEAN NOT NULL DEFAULT false,
    `botLevel` ENUM('BEGINNER', 'NORMAL', 'ADVANCED') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PracticeRoomPlayer_roomId_idx`(`roomId`),
    INDEX `PracticeRoomPlayer_userId_idx`(`userId`),
    UNIQUE INDEX `PracticeRoomPlayer_roomId_seatNo_key`(`roomId`, `seatNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticeHand` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `handNo` INTEGER NOT NULL,
    `dealerSeat` INTEGER NOT NULL,
    `smallBlindSeat` INTEGER NOT NULL,
    `bigBlindSeat` INTEGER NOT NULL,
    `boardCards` JSON NULL,
    `potSize` INTEGER NOT NULL DEFAULT 0,
    `winnerInfo` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    INDEX `PracticeHand_roomId_idx`(`roomId`),
    UNIQUE INDEX `PracticeHand_roomId_handNo_key`(`roomId`, `handNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticeAction` (
    `id` VARCHAR(191) NOT NULL,
    `handId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `seatNo` INTEGER NOT NULL,
    `actionType` ENUM('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN') NOT NULL,
    `amount` INTEGER NULL,
    `street` ENUM('PREFLOP', 'FLOP', 'TURN', 'RIVER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PracticeAction_handId_idx`(`handId`),
    INDEX `PracticeAction_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `detail` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RiskLog_userId_idx`(`userId`),
    INDEX `RiskLog_roomId_idx`(`roomId`),
    INDEX `RiskLog_eventType_idx`(`eventType`),
    INDEX `RiskLog_riskLevel_idx`(`riskLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `status` ENUM('NORMAL', 'DISABLED') NOT NULL DEFAULT 'NORMAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_username_key`(`username`),
    INDEX `AdminUser_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `adminUserId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `detail` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAuditLog_adminUserId_idx`(`adminUserId`),
    INDEX `AdminAuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemConfig` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SystemConfig_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerGame` ADD CONSTRAINT `LedgerGame_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerGame` ADD CONSTRAINT `LedgerGame_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerPlayer` ADD CONSTRAINT `LedgerPlayer_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `LedgerGame`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerPlayer` ADD CONSTRAINT `LedgerPlayer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerTransaction` ADD CONSTRAINT `LedgerTransaction_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `LedgerGame`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerTransaction` ADD CONSTRAINT `LedgerTransaction_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `LedgerPlayer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerConfirmation` ADD CONSTRAINT `LedgerConfirmation_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `LedgerGame`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerConfirmation` ADD CONSTRAINT `LedgerConfirmation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeRoom` ADD CONSTRAINT `PracticeRoom_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeRoomPlayer` ADD CONSTRAINT `PracticeRoomPlayer_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `PracticeRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeRoomPlayer` ADD CONSTRAINT `PracticeRoomPlayer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeHand` ADD CONSTRAINT `PracticeHand_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `PracticeRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeAction` ADD CONSTRAINT `PracticeAction_handId_fkey` FOREIGN KEY (`handId`) REFERENCES `PracticeHand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeAction` ADD CONSTRAINT `PracticeAction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiskLog` ADD CONSTRAINT `RiskLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiskLog` ADD CONSTRAINT `RiskLog_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `PracticeRoom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminAuditLog` ADD CONSTRAINT `AdminAuditLog_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
