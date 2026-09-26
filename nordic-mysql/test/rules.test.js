'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanName, unitCount, resolveBattle } = require('../rules');

test('nomes, quantidades e ataques válidos', () => {
  assert.equal(cleanName('  Vila   Nórdica ', 50), 'Vila Nórdica');
  assert.equal(unitCount(-1), null);
  assert.equal(unitCount(1.5), null);
  assert.equal(unitCount(12), 12);
  const win = resolveBattle({ spear: 12, sword: 8 }, { spear: 12, sword: 8 });
  assert.equal(win.attackPower, 320);
  assert.equal(win.defensePower, 260);
  assert.equal(win.victory, true);
  assert(win.lostSpear < 12);
  const lose = resolveBattle({ spear: 1, sword: 0 }, { spear: 12, sword: 8 });
  assert.equal(lose.victory, false);
  assert.equal(lose.lostSpear, 1);
});
