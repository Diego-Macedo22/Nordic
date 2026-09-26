-- Nordic beta: execute DEPOIS do schema.sql do laboratório.
-- No terminal Linux, na pasta deste arquivo: sudo mysql < nordic_game_migration.sql
-- A migração preserva worlds, players e attacks e pode ser executada novamente.
-- Não cole esta linha de comando dentro do prompt mysql>.

CREATE DATABASE IF NOT EXISTS nordic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nordic;

-- Um retrato integral do objeto S de cada jogador: res, buildings, food,
-- buildQueue, troops, trainQueue, lastTick, attacks, reports, stats e villages.
-- O servidor deve validar cada ação e salvar o estado com controle de revisão.
CREATE TABLE IF NOT EXISTS player_game_state (
  player_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  state_json JSON NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_player_game_state_player FOREIGN KEY (player_id)
    REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- CFG/editMode pertencem ao mundo; o servidor lê esta configuração ao carregar.
CREATE TABLE IF NOT EXISTS world_game_settings (
  world_code CHAR(14) NOT NULL PRIMARY KEY,
  settings_json JSON NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_world_game_settings_world FOREIGN KEY (world_code)
    REFERENCES worlds(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Eventos PvP pendentes (o attacks existente continua guardando o resultado).
CREATE TABLE IF NOT EXISTS pending_attacks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  world_code CHAR(14) NOT NULL,
  attacker_id BIGINT UNSIGNED NOT NULL,
  defender_id BIGINT UNSIGNED NOT NULL,
  sent_spear INT UNSIGNED NOT NULL DEFAULT 0,
  sent_sword INT UNSIGNED NOT NULL DEFAULT 0,
  attack_bonus DECIMAL(8,5) NOT NULL DEFAULT 0,
  sent_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  arrive_at TIMESTAMP(3) NOT NULL,
  status ENUM('pending','resolved','cancelled') NOT NULL DEFAULT 'pending',
  resolved_attack_id BIGINT UNSIGNED NULL,
  KEY idx_pending_world_arrival (world_code,status,arrive_at),
  KEY idx_pending_defender (defender_id,status,arrive_at),
  CONSTRAINT fk_pending_world FOREIGN KEY (world_code)
    REFERENCES worlds(code) ON DELETE CASCADE,
  CONSTRAINT fk_pending_attacker FOREIGN KEY (attacker_id)
    REFERENCES players(id),
  CONSTRAINT fk_pending_defender FOREIGN KEY (defender_id)
    REFERENCES players(id),
  CONSTRAINT fk_pending_result FOREIGN KEY (resolved_attack_id)
    REFERENCES attacks(id)
) ENGINE=InnoDB;

-- Verificação no prompt mysql>: USE nordic; SHOW TABLES;
-- Esperado: worlds, players, attacks, player_game_state,
-- world_game_settings e pending_attacks.
