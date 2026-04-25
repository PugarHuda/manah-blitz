const { Server } = require("socket.io");

const TURN_TIME_SECONDS = 30;
const PAUSE_TIME_SECONDS = 30;

const difficultyConfig = {
  easy: { distance: 3, gravity: 8, hitRadius: 0.7 },
  medium: { distance: 5, gravity: 9.8, hitRadius: 0.6 },
  hard: { distance: 8, gravity: 11, hitRadius: 0.5 },
};

/** @type {Map<string, {
 * players: string[],
 * state: any,
 * timerHandle: NodeJS.Timeout | null
 * }>} */
const rooms = new Map();

const io = new Server(3002, {
  cors: {
    origin: "*",
  },
});

function createPlayer(playerId) {
  return {
    id: playerId,
    totalScore: 0,
    arrowsLeft: 3,
    pausesLeft: 2,
    turnScores: [],
  };
}

function createInitialState(roomId, difficulty) {
  return {
    mode: "playingAR",
    roomId,
    difficulty,
    players: [],
    currentPlayerIndex: 0,
    turnPhase: "aiming",
    timeLeft: TURN_TIME_SECONDS,
    isPaused: false,
    pauseTimer: 0,
    winnerId: null,
  };
}

function ensureRoom(roomId, difficulty) {
  const existing = rooms.get(roomId);
  if (existing) {
    return existing;
  }
  const room = {
    players: [],
    state: createInitialState(roomId, difficulty),
    timerHandle: null,
  };
  rooms.set(roomId, room);
  return room;
}

function emitState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room_state", { state: room.state });
}

function startTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.timerHandle) return;

  room.timerHandle = setInterval(() => {
    const state = room.state;
    if (state.turnPhase === "done") {
      clearInterval(room.timerHandle);
      room.timerHandle = null;
      return;
    }

    if (state.isPaused) {
      state.pauseTimer = Math.max(0, state.pauseTimer - 0.1);
      if (state.pauseTimer <= 0) {
        state.isPaused = false;
        state.pauseTimer = 0;
      }
    } else if (state.turnPhase === "aiming") {
      state.timeLeft = Math.max(0, state.timeLeft - 0.1);
      if (state.timeLeft <= 0) {
        state.turnPhase = "shooting";
      }
    }

    io.to(roomId).emit("timer_update", {
      timeLeft: state.timeLeft,
      isPaused: state.isPaused,
      pauseTimer: state.pauseTimer,
    });
  }, 100);
}

function resolveScore(direction, power) {
  const distancePenalty = Math.abs(direction.x) * 0.35 + Math.abs(direction.y - 0.1) * 0.35;
  const powerPenalty = Math.abs(power - 0.72) * 0.3;
  const fit = Math.max(0, 1 - distancePenalty - powerPenalty);
  return Math.max(1, Math.min(10, Math.round(fit * 10)));
}

function nextTurn(state) {
  const outOfArrows = state.players.every((p) => p.arrowsLeft <= 0);
  if (outOfArrows) {
    const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
    state.turnPhase = "done";
    state.winnerId = sorted[0] ? sorted[0].id : null;
    return;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turnPhase = "aiming";
  state.timeLeft = TURN_TIME_SECONDS;
}

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, playerId, difficulty }) => {
    if (!roomId || !playerId) return;

    const safeDifficulty = difficultyConfig[difficulty] ? difficulty : "medium";
    const room = ensureRoom(roomId, safeDifficulty);

    socket.join(roomId);

    if (!room.players.includes(playerId) && room.players.length < 4) {
      room.players.push(playerId);
      room.state.players.push(createPlayer(playerId));
    }

    emitState(roomId);
  });

  socket.on("start_game", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.state.turnPhase = "aiming";
    room.state.timeLeft = TURN_TIME_SECONDS;
    startTimer(roomId);
    emitState(roomId);
  });

  socket.on("shoot", ({ roomId, playerId, direction, power }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const state = room.state;
    const current = state.players[state.currentPlayerIndex];

    if (!current || current.id !== playerId || state.turnPhase !== "aiming" || state.isPaused) {
      socket.emit("error_event", { message: "Invalid turn or state for shoot action" });
      return;
    }

    if (current.arrowsLeft <= 0) {
      socket.emit("error_event", { message: "No arrows left" });
      return;
    }

    current.arrowsLeft -= 1;
    state.turnPhase = "shooting";

    io.to(roomId).emit("shoot_event", { playerId, direction, power });

    const score = resolveScore(direction, power);
    current.totalScore += score;
    current.turnScores.push(score);

    state.turnPhase = "impact";

    setTimeout(() => {
      state.turnPhase = "replay";
      emitState(roomId);

      setTimeout(() => {
        nextTurn(state);
        emitState(roomId);
      }, 1100);
    }, 250);

    emitState(roomId);
  });

  socket.on("pause", ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const state = room.state;
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== playerId || state.turnPhase !== "aiming" || state.isPaused) {
      return;
    }

    if (current.pausesLeft <= 0) {
      socket.emit("error_event", { message: "Pause quota exhausted" });
      return;
    }

    current.pausesLeft -= 1;
    state.isPaused = true;
    state.pauseTimer = PAUSE_TIME_SECONDS;
    emitState(roomId);
  });

  socket.on("resume", ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const state = room.state;
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== playerId || !state.isPaused) {
      return;
    }

    state.isPaused = false;
    state.pauseTimer = 0;
    emitState(roomId);
  });
});

console.log("Manah server listening on :3002");
