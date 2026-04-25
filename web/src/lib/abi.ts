export const manahAbi = [
  {
    "type": "function",
    "name": "ANGLE_MAX_CENTIDEG",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ARROWS_PER_PLAYER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "BULLSEYE_LOCK_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EYE_HEIGHT_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "GAME_FORFEIT_AFTER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "GRAVITY_MM_PER_TICK_SQ",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PLAYERS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_POINTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_SPEED_MM_PER_TICK",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_WIND_MM_PER_TICK_SQ",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_PLAYERS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "POWER_MAX_BP",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TARGET_RADIUS_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TARGET_X_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TARGET_Y_MAX_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TARGET_Y_MIN_MM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TICKS_PER_SHOT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TURN_TIMEOUT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createRoom",
    "inputs": [
      {
        "name": "maxPlayers",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "stake",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getPlayer",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "joined",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "arrowsUsed",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "score",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "lastActionAt",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoom",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "host",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxPlayers",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "numPlayers",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum Manah.RoomStatus"
      },
      {
        "name": "stake",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "startedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "targetY",
        "type": "int128",
        "internalType": "int128"
      },
      {
        "name": "targetSeed",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "players",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "joinRoom",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "nextRoomId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pot",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewScore",
    "inputs": [
      {
        "name": "distFromBullseyeMm",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "settleGame",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "shoot",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "angle",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "power",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "skipTurn",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "startGame",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ArrowLanded",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "arrowIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "hit",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "distFromBullseyeMm",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "pointsAwarded",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "newScore",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GameSettled",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "payout",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "winningScore",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GameStarted",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "targetSeed",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "targetY",
        "type": "int128",
        "indexed": false,
        "internalType": "int128"
      },
      {
        "name": "pot",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PlayerJoined",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "numPlayers",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoomCreated",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "host",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "maxPlayers",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "stake",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TickComputed",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "tickIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "x",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TurnSkipped",
    "inputs": [
      {
        "name": "roomId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "arrowsUsed",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyJoined",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AngleOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GameNotOver",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPlayerCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidStake",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoArrowsLeft",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAPlayer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotEnoughPlayers",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PayoutFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PowerOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoomFull",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoomNotActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoomNotJoinable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TurnNotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongStakeAmount",
    "inputs": []
  }
] as const;
