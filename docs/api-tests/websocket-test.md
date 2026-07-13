# WebSocket 测试

Namespace：`http://localhost:3000/practice-room`

1. 先用 `auth.http` 调用 `dev login A`，复制返回的用户 `token`。
2. 用 `practice-room.http` 创建好友练习房，复制返回的 `roomCode`。
3. 打开下面的测试页，填入 token 和 roomCode，点击连接。

测试页：`docs/api-tests/ws-test.html`

也可以用 Socket.IO Client 手动连接：

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/practice-room", {
  transports: ["websocket"],
  auth: { token: "你的用户 token" }
});

socket.on("room_state", console.log);
socket.on("error_message", console.error);
socket.emit("join_room", { roomCode: "ABC123" });
```

预期事件：

- `join_room` 后收到 `room_state`
- `confirm_initial_chips` 后广播 `initial_chips_confirmed` 和 `room_state`
- `player_ready` 后广播 `player_ready_changed` 和 `room_state`
- 房间进入 READY 时广播 `room_ready`
- 房主开始后广播 `room_started`、`public_game_state`
- 每个在线玩家单独收到 `private_hand_state`，只包含自己的 `holeCards`
- 行动玩家发送 `game_action` 后广播 `action_applied` 和新的 `public_game_state`
- 街道变化时广播 `street_changed`
- 本手结束时广播 `hand_finished`
- 房主发送 `next_hand` 后广播 `next_hand_started` 或 `room_finished`

第三阶段新增客户端事件：

```ts
socket.emit("get_game_state", { roomCode: "ABC123" });
socket.emit("game_action", { roomCode: "ABC123", actionType: "CALL" });
socket.emit("game_action", { roomCode: "ABC123", actionType: "BET", amount: 50 });
socket.emit("game_action", { roomCode: "ABC123", actionType: "RAISE", amount: 150 });
socket.emit("game_action", { roomCode: "ABC123", actionType: "ALL_IN" });
socket.emit("next_hand", { roomCode: "ABC123" });
```

非法行动会收到：

- `invalid_action`
- 严重同步错误会额外收到 `game_error`

注意：`public_game_state` 不包含任何玩家手牌；自己的手牌只通过 `private_hand_state` 发给当前 socket 用户。
