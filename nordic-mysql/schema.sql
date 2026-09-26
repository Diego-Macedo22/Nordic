-- Execute uma vez: mysql -u root -p < schema.sql
-- Protótipo de dois jogadores; a autenticação por senha virá numa migração posterior.
CREATE DATABASE IF NOT EXISTS nordic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nordic;

CREATE TABLE IF NOT EXISTS worlds (
  code CHAR(14) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  owner_nickname VARCHAR(24) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS players (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  world_code CHAR(14) NOT NULL,
  nickname VARCHAR(24) NOT NULL,
  spear INT UNSIGNED NOT NULL DEFAULT 12,
  sword INT UNSIGNED NOT NULL DEFAULT 8,
  wins INT UNSIGNED NOT NULL DEFAULT 0,
  losses INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_world_nickname (world_code, nickname),
  CONSTRAINT fk_players_world FOREIGN KEY (world_code) REFERENCES worlds(code) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attacks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  world_code CHAR(14) NOT NULL,
  attacker_id BIGINT UNSIGNED NOT NULL,
  defender_id BIGINT UNSIGNED NOT NULL,
  sent_spear INT UNSIGNED NOT NULL,
  sent_sword INT UNSIGNED NOT NULL,
  lost_spear INT UNSIGNED NOT NULL,
  lost_sword INT UNSIGNED NOT NULL,
  victory BOOLEAN NOT NULL,
  attack_power INT UNSIGNED NOT NULL,
  defense_power INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_attacks_world_time (world_code, created_at),
  CONSTRAINT fk_attacks_world FOREIGN KEY (world_code) REFERENCES worlds(code) ON DELETE CASCADE,
  CONSTRAINT fk_attacks_attacker FOREIGN KEY (attacker_id) REFERENCES players(id),
  CONSTRAINT fk_attacks_defender FOREIGN KEY (defender_id) REFERENCES players(id)
) ENGINE=InnoDB;
