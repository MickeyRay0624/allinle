import { describe, it, expect, vi } from "vitest";

// Simulate Redis lock behavior
describe("GameLock Behavior", () => {
  // Mock lock store to simulate Redis SET NX
  let lockStore: Map<string, string>;

  function acquireLock(key: string, ttlMs: number): string | null {
    if (lockStore.has(key)) return null;
    const lockId = Math.random().toString(36).slice(2);
    lockStore.set(key, lockId);
    return lockId;
  }

  function releaseLock(key: string, lockId: string): boolean {
    if (lockStore.get(key) === lockId) {
      lockStore.delete(key);
      return true;
    }
    return false;
  }

  beforeEach(() => {
    lockStore = new Map();
  });

  it("should allow only one concurrent action per room", () => {
    const roomKey = "room:lock:ROOM001";
    const lock1 = acquireLock(roomKey, 3000);
    const lock2 = acquireLock(roomKey, 3000);

    expect(lock1).not.toBeNull();
    expect(lock2).toBeNull(); // Second request should fail
  });

  it("should release lock and allow next action", () => {
    const roomKey = "room:lock:ROOM001";
    const lock1 = acquireLock(roomKey, 3000);
    expect(lock1).not.toBeNull();

    releaseLock(roomKey, lock1!);
    
    const lock2 = acquireLock(roomKey, 3000);
    expect(lock2).not.toBeNull(); // Now it should succeed
  });

  it("should not release lock with wrong lockId", () => {
    const roomKey = "room:lock:ROOM001";
    const lock1 = acquireLock(roomKey, 3000);
    
    const result = releaseLock(roomKey, "wrong_lock_id");
    expect(result).toBe(false);
    expect(lockStore.has(roomKey)).toBe(true);
  });

  it("should increment version on each action", () => {
    let version = 0;
    const actions: number[] = [];

    function processAction(incomingVersion: number): number | null {
      if (incomingVersion !== version) return null; // Stale version
      version++;
      actions.push(version);
      return version;
    }

    expect(processAction(0)).toBe(1);
    expect(processAction(1)).toBe(2);
    expect(processAction(1)).toBeNull(); // Stale version rejected
    expect(processAction(2)).toBe(3);
    expect(version).toBe(3);
  });
});
