const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    let connection;
    
    try {
        console.log('🔧 Inicializando banco de dados...');
        
        // Conectar ao MySQL sem especificar banco
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
        
        console.log('✅ Conectado ao MySQL server');
        
        // Criar banco de dados se não existir
        await connection.query('CREATE DATABASE IF NOT EXISTS cinema_seats');
        console.log('✅ Banco de dados "cinema_seats" verificado/criado');
        
        // Usar o banco de dados
        await connection.query('USE cinema_seats');
        
        // Verificar se as tabelas já existem
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'cinema_seats'
        `);
        
        const existingTables = tables.map(row => row.TABLE_NAME);
        const requiredTables = ['seats', 'seat_codes', 'seat_sessions'];
        
        if (requiredTables.every(table => existingTables.includes(table))) {
            console.log('✅ Todas as tabelas já existem');
            await connection.end();
            return true;
        }
        
        console.log('🔧 Criando estrutura das tabelas...');
        
        // Criar tabelas uma por uma
        await connection.query(`
            CREATE TABLE IF NOT EXISTS seats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seat_code VARCHAR(10) UNIQUE NOT NULL,
                row_letter CHAR(1) NOT NULL,
                seat_number INT NOT NULL,
                is_vip BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_seat_code (seat_code),
                INDEX idx_row_seat (row_letter, seat_number)
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS seat_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seat_id INT NOT NULL,
                unique_code VARCHAR(5) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_used BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
                INDEX idx_unique_code (unique_code),
                INDEX idx_seat_active (seat_id, is_active),
                INDEX idx_expires (expires_at)
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS seat_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seat_id INT NOT NULL,
                code_id INT NOT NULL,
                user_ip VARCHAR(45),
                status ENUM('active', 'completed', 'expired') DEFAULT 'active',
                accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP NULL,
                FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
                FOREIGN KEY (code_id) REFERENCES seat_codes(id) ON DELETE CASCADE,
                INDEX idx_seat_status (seat_id, status),
                INDEX idx_accessed (accessed_at)
            )
        `);
        
        console.log('✅ Estrutura do banco criada com sucesso');
        
        // Verificar se há dados nas tabelas
        const [seatCount] = await connection.query('SELECT COUNT(*) as count FROM seats');
        console.log(`📊 Total de cadeiras: ${seatCount[0].count}`);
        
        if (seatCount[0].count === 0) {
            console.log('📝 Inserindo dados iniciais...');
            // Inserir dados básicos se não existirem
            await insertInitialData(connection);
        }
        
        await connection.end();
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error.message);
        if (connection) {
            await connection.end();
        }
        return false;
    }
}

async function insertInitialData(connection) {
    try {
        // Inserir cadeiras básicas (A1-E10)
        console.log('📝 Inserindo dados das cadeiras...');
        
        const seatInserts = [];
        for (let row = 0; row < 5; row++) {
            const rowLetter = String.fromCharCode(65 + row); // A, B, C, D, E
            for (let seatNum = 1; seatNum <= 10; seatNum++) {
                const seatCode = `${rowLetter}${seatNum}`;
                const isVip = row === 0 && seatNum <= 5; // A1-A5 são VIP
                seatInserts.push(`('${seatCode}', '${rowLetter}', ${seatNum}, ${isVip ? 1 : 0})`);
            }
        }
        
        // Inserir assentos em lote
        await connection.query(`
            INSERT INTO seats (seat_code, row_letter, seat_number, is_vip) 
            VALUES ${seatInserts.join(', ')}
        `);
        
        console.log('✅ 50 assentos inseridos (A1-E10)');
        
    } catch (error) {
        console.error('❌ Erro ao inserir dados iniciais:', error.message);
        throw error;
    }
}

module.exports = {
    initializeDatabase
};

// Executar se for chamado diretamente
if (require.main === module) {
    initializeDatabase();
}
