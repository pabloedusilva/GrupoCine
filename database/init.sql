-- Script de criação do banco de dados para o sistema de cinema
CREATE DATABASE IF NOT EXISTS cinema_seats;
USE cinema_seats;

-- Tabela de cadeiras
CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_code VARCHAR(10) NOT NULL UNIQUE,
    row_letter CHAR(1) NOT NULL,
    seat_number INT NOT NULL,
    is_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de códigos únicos
CREATE TABLE IF NOT EXISTS seat_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_id INT NOT NULL,
    unique_code VARCHAR(5) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    INDEX idx_unique_code (unique_code),
    INDEX idx_seat_id (seat_id),
    INDEX idx_expires_at (expires_at)
);

-- Tabela de sessões/histórico
CREATE TABLE IF NOT EXISTS seat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_id INT NOT NULL,
    code_id INT NOT NULL,
    user_ip VARCHAR(45),
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    status ENUM('active', 'completed', 'expired') DEFAULT 'active',
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    FOREIGN KEY (code_id) REFERENCES seat_codes(id) ON DELETE CASCADE
);

-- Inserir cadeiras de A1 até E10 (50 cadeiras)
INSERT INTO seats (seat_code, row_letter, seat_number, is_vip) VALUES
-- Fileira A (VIP)
('A1', 'A', 1, TRUE), ('A2', 'A', 2, TRUE), ('A3', 'A', 3, TRUE), ('A4', 'A', 4, TRUE), ('A5', 'A', 5, TRUE),
('A6', 'A', 6, TRUE), ('A7', 'A', 7, TRUE), ('A8', 'A', 8, TRUE), ('A9', 'A', 9, TRUE), ('A10', 'A', 10, TRUE),
-- Fileira B
('B1', 'B', 1, FALSE), ('B2', 'B', 2, FALSE), ('B3', 'B', 3, FALSE), ('B4', 'B', 4, FALSE), ('B5', 'B', 5, FALSE),
('B6', 'B', 6, FALSE), ('B7', 'B', 7, FALSE), ('B8', 'B', 8, FALSE), ('B9', 'B', 9, FALSE), ('B10', 'B', 10, FALSE),
-- Fileira C
('C1', 'C', 1, FALSE), ('C2', 'C', 2, FALSE), ('C3', 'C', 3, FALSE), ('C4', 'C', 4, FALSE), ('C5', 'C', 5, FALSE),
('C6', 'C', 6, FALSE), ('C7', 'C', 7, FALSE), ('C8', 'C', 8, FALSE), ('C9', 'C', 9, FALSE), ('C10', 'C', 10, FALSE),
-- Fileira D
('D1', 'D', 1, FALSE), ('D2', 'D', 2, FALSE), ('D3', 'D', 3, FALSE), ('D4', 'D', 4, FALSE), ('D5', 'D', 5, FALSE),
('D6', 'D', 6, FALSE), ('D7', 'D', 7, FALSE), ('D8', 'D', 8, FALSE), ('D9', 'D', 9, FALSE), ('D10', 'D', 10, FALSE),
-- Fileira E
('E1', 'E', 1, FALSE), ('E2', 'E', 2, FALSE), ('E3', 'E', 3, FALSE), ('E4', 'E', 4, FALSE), ('E5', 'E', 5, FALSE),
('E6', 'E', 6, FALSE), ('E7', 'E', 7, FALSE), ('E8', 'E', 8, FALSE), ('E9', 'E', 9, FALSE), ('E10', 'E', 10, FALSE);
