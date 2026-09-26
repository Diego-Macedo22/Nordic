'use strict';

function cleanName(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
}

function unitCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100000 ? value : null;
}

// A mesma fórmula simples da versão atual do jogo. A batalha deste laboratório é imediata.
function resolveBattle({ spear, sword }, defender) {
  const attackPower = spear * 10 + sword * 25;
  const defensePower = defender.spear * 15 + defender.sword * 10;
  const victory = attackPower > defensePower;
  const ratio = victory ? Math.min(0.3, defensePower / (attackPower + 1)) : 1;
  return {
    victory,
    attackPower,
    defensePower,
    lostSpear: Math.round(spear * ratio),
    lostSword: Math.round(sword * ratio)
  };
}

module.exports = { cleanName, unitCount, resolveBattle };
