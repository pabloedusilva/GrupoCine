const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração da conexão com o MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cinema_seats',
    port: process.env.DB_PORT || 3306,
    timezone: '+00:00',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para testar a conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão com MySQL estabelecida com sucesso!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com MySQL:', error.message);
        return false;
    }
}

// Função para executar queries
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Erro ao executar query:', error);
        throw error;
    }
}

// Função para gerar código único alfanumérico
function generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    generateUniqueCode
};
