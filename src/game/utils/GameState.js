import { GAME_STATE } from '../constants.js';

const KEY = 'gameState';

/** Global state flag mirrored in the registry; scenes update it on entry. */
export function setGameState(game, state) {
  if (!Object.values(GAME_STATE).includes(state)) throw new Error(`Unknown game state: ${state}`);
  game.registry.set(KEY, state);
}

export function getGameState(game) {
  return game.registry.get(KEY);
}
