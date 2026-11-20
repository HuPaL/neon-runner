import Phaser from 'phaser';
import './styles/main.css';
import './styles/ui.css';
import { createConfig } from './game/config.js';

function showFatal(message) {
  const p = document.createElement('p');
  p.className = 'fatal';
  p.textContent = message;
  document.body.appendChild(p);
}

try {
  const game = new Phaser.Game(createConfig());
  document.getElementById('boot-splash')?.remove();
  // Handy for debugging in the console during development only.
  if (import.meta.env.DEV) window.__game = game;
} catch (err) {
  console.error(err);
  showFatal('Sorry, NEON RUNNER could not start on this device.');
}
