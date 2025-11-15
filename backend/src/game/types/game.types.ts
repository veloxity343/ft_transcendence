export enum GameMode {
  MATCHMAKING = 'matchmaking',
  PRIVATE = 'private',
  SPECTATE = 'spectate',
}

export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export enum PaddleDirection {
  NONE = 0,
  UP = 1,
  DOWN = 2,
}
