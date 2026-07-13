-- CreateTable
CREATE TABLE `TeamLedgerRoom` (
    `id` VARCHAR(191) NOT NULL,
    `roomCode` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('WAITING', 'ACTIVE', 'FINISHED', 'CLOSED') NOT NULL DEFAULT 'WAITING',
    `currentHandNo` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TeamLedgerRoom_roomCode_key`(`roomCode`),
    INDEX `TeamLedgerRoom_ownerUserId_idx`(`ownerUserId`),
    INDEX `TeamLedgerRoom_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamLedgerParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `seatNo` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `status` ENUM('ACTIVE', 'LEFT', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    `buyInAmount` DECIMAL(18, 2) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,

    INDEX `TeamLedgerParticipant_roomId_idx`(`roomId`),
    INDEX `TeamLedgerParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `TeamLedgerParticipant_roomId_seatNo_key`(`roomId`, `seatNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamLedgerHand` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `handNo` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'CONFIRMING', 'LOCKED', 'DISPUTED') NOT NULL DEFAULT 'OPEN',
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamLedgerHand_roomId_idx`(`roomId`),
    INDEX `TeamLedgerHand_status_idx`(`status`),
    UNIQUE INDEX `TeamLedgerHand_roomId_handNo_key`(`roomId`, `handNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `handId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'SUBMITTED', 'CONFIRMED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `disputeNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamLedgerEntry_handId_idx`(`handId`),
    INDEX `TeamLedgerEntry_participantId_idx`(`participantId`),
    UNIQUE INDEX `TeamLedgerEntry_handId_participantId_key`(`handId`, `participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SettlementSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NULL,
    `fromName` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NULL,
    `toName` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SettlementSuggestion_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamLedgerRoom` ADD CONSTRAINT `TeamLedgerRoom_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLedgerParticipant` ADD CONSTRAINT `TeamLedgerParticipant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `TeamLedgerRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLedgerParticipant` ADD CONSTRAINT `TeamLedgerParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLedgerHand` ADD CONSTRAINT `TeamLedgerHand_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `TeamLedgerRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLedgerEntry` ADD CONSTRAINT `TeamLedgerEntry_handId_fkey` FOREIGN KEY (`handId`) REFERENCES `TeamLedgerHand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLedgerEntry` ADD CONSTRAINT `TeamLedgerEntry_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `TeamLedgerParticipant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SettlementSuggestion` ADD CONSTRAINT `SettlementSuggestion_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `TeamLedgerRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

