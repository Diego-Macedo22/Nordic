'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { cleanName, unitCount, resolveBattle } = require('./rules');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nordic',
  waitForConnections: true,
  connectionLimit: 8
});
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
async function body(req) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) fail(413, 'Pedido grande demais.');
    parts.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { fail(400, 'JSON inválido.'); }
}
function validCode(code) { return /^N-[0-9A-F]{12}$/.test(code); }
function player(row) {
  return { id: Number(row.id), nickname: row.nickname, spear: row.spear, sword: row.sword, wins: row.wins, losses: row.losses };
}
async function worldExists(code) {
  const [rows] = await pool.execute('SELECT code, name, owner_nickname FROM worlds WHERE code = ?', [code]);
  return rows[0] || null;
}
async function createWorld(req, res) {
  const input = await body(req);
  const name = cleanName(input.name, 50);
  const nickname = cleanName(input.nickname, 24);
  if (!name || !nickname) fail(400, 'Informe o nome do mundo e o seu apelido.');
  const code = 'N-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO worlds (code, name, owner_nickname) VALUES (?, ?, ?)', [code, name, nickname]);
    const [result] = await conn.execute('INSERT INTO players (world_code, nickname) VALUES (?, ?)', [code, nickname]);
    await conn.commit();
    json(res, 201, { world: { code, name, owner: nickname }, player: { id: Number(result.insertId), nickname, spear: 12, sword: 8, wins: 0, losses: 0 } });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}
async function joinWorld(req, res, code) {
  const input = await body(req);
  const nickname = cleanName(input.nickname, 24);
  if (!nickname) fail(400, 'Informe seu apelido.');
  if (!(await worldExists(code))) fail(404, 'Mundo não encontrado.');
  try {
    const [result] = await pool.execute('INSERT INTO players (world_code, nickname) VALUES (?, ?)', [code, nickname]);
    json(res, 201, { player: { id: Number(result.insertId), nickname, spear: 12, sword: 8, wins: 0, losses: 0 } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') fail(409, 'Este apelido já está em uso neste mundo.');
    throw e;
  }
}
async function attack(req, res, code) {
  const input = await body(req);
  const attackerId = input.attackerId, defenderId = input.defenderId;
  const spear = unitCount(input.spear), sword = unitCount(input.sword);
  if (!Number.isSafeInteger(attackerId) || !Number.isSafeInteger(defenderId) || attackerId === defenderId ||
      spear === null || sword === null || spear + sword === 0) fail(400, 'Ataque inválido.');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Bloqueios em ordem estável para duas batalhas simultâneas não sobrescreverem tropas.
    const ids = [attackerId, defenderId].sort((a, b) => a - b);
    const [rows] = await conn.execute('SELECT * FROM players WHERE id IN (?, ?) AND world_code = ? ORDER BY id FOR UPDATE', [ids[0], ids[1], code]);
    if (rows.length !== 2) fail(404, 'Jogadores não encontrados neste mundo.');
    const attacker = rows.find(p => Number(p.id) === attackerId);
    const defender = rows.find(p => Number(p.id) === defenderId);
    if (!attacker || !defender) fail(404, 'Jogadores não encontrados.');
    if (spear > attacker.spear || sword > attacker.sword) fail(409, 'Tropas insuficientes.');
    const result = resolveBattle({ spear, sword }, defender);
    await conn.execute('UPDATE players SET spear = spear - ?, sword = sword - ?, wins = wins + ?, losses = losses + ? WHERE id = ?', [result.lostSpear, result.lostSword, Number(result.victory), Number(!result.victory), attackerId]);
    if (result.victory) await conn.execute('UPDATE players SET spear = 0, sword = 0, losses = losses + 1 WHERE id = ?', [defenderId]);
    else await conn.execute('UPDATE players SET wins = wins + 1 WHERE id = ?', [defenderId]);
    const [created] = await conn.execute('INSERT INTO attacks (world_code, attacker_id, defender_id, sent_spear, sent_sword, lost_spear, lost_sword, victory, attack_power, defense_power) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [code, attackerId, defenderId, spear, sword, result.lostSpear, result.lostSword, result.victory, result.attackPower, result.defensePower]);
    await conn.commit();
    json(res, 201, { report: { id: Number(created.insertId), ...result, spear, sword, attacker: attacker.nickname, defender: defender.nickname } });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}
async function serve(req, res, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname === '/lab' ? 'lab.html' : '';
  if (!name) fail(404, 'Página não encontrada.');
  const contents = await fs.readFile(path.join(publicDir, name));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(contents);
}
async function handle(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try {
    if (req.method === 'GET' && (pathname === '/' || pathname === '/lab')) return await serve(req, res, pathname);
    if (req.method === 'GET' && pathname === '/api/health') { await pool.query('SELECT 1'); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && pathname === '/api/worlds') return await createWorld(req, res);
    const match = pathname.match(/^\/api\/worlds\/(N-[0-9A-F]{12})(?:\/(join|players|attacks))?$/);
    if (!match || !validCode(match[1])) fail(404, 'Rota não encontrada.');
    const code = match[1], route = match[2];
    if (req.method === 'GET' && !route) {
      const world = await worldExists(code);
      if (!world) fail(404, 'Mundo não encontrado.');
      return json(res, 200, { world: { code, name: world.name, owner: world.owner_nickname } });
    }
    if (req.method === 'POST' && route === 'join') return await joinWorld(req, res, code);
    if (req.method === 'GET' && route === 'players') {
      if (!(await worldExists(code))) fail(404, 'Mundo não encontrado.');
      const [rows] = await pool.execute('SELECT id, nickname, spear, sword, wins, losses FROM players WHERE world_code = ? ORDER BY id', [code]);
      return json(res, 200, { players: rows.map(player) });
    }
    if (req.method === 'POST' && route === 'attacks') return await attack(req, res, code);
    if (req.method === 'GET' && route === 'attacks') {
      const [rows] = await pool.execute('SELECT a.id, attacker.nickname AS attacker, defender.nickname AS defender, a.sent_spear AS spear, a.sent_sword AS sword, a.victory, a.created_at FROM attacks a JOIN players attacker ON attacker.id = a.attacker_id JOIN players defender ON defender.id = a.defender_id WHERE a.world_code = ? ORDER BY a.id DESC LIMIT 25', [code]);
      return json(res, 200, { reports: rows });
    }
    fail(404, 'Rota não encontrada.');
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Erro interno no servidor.' });
    else res.end();
  }
}
http.createServer(handle).listen(port, '0.0.0.0', () => console.log(`Nordic em http://localhost:${port}`));
