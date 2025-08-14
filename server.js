const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection, executeQuery, generateUniqueCode } = require('./database/connection');
const { initializeDatabase } = require('./database/init');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/dashboard', express.static('dashboard'));

// Rota para servir o dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'dashboard.html'));
});

// API Routes

// Obter status de todas as cadeiras
app.get('/api/seats', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id,
                s.seat_code,
                s.row_letter,
                s.seat_number,
                s.is_vip,
                CASE 
                    WHEN sc.id IS NOT NULL AND sc.is_active = 1 AND sc.expires_at > NOW() THEN 'purchased'
                    WHEN ss.id IS NOT NULL AND ss.status = 'active' THEN 'occupied'
                    ELSE 'available'
                END as status,
                sc.unique_code,
                sc.expires_at,
                ss.accessed_at
            FROM seats s
            LEFT JOIN seat_codes sc ON s.id = sc.seat_id AND sc.is_active = 1 AND sc.expires_at > NOW()
            LEFT JOIN seat_sessions ss ON s.id = ss.seat_id AND ss.status = 'active'
            ORDER BY s.row_letter, s.seat_number
        `;
        
        const seats = await executeQuery(query);
        res.json(seats);
    } catch (error) {
        console.error('Erro ao buscar cadeiras:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Validar código da cadeira
app.post('/api/validate-seat', async (req, res) => {
    try {
        const { seatCode, uniqueCode, userIP } = req.body;
        
        if (!seatCode || !uniqueCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código da cadeira e código único são obrigatórios' 
            });
        }

        // Buscar cadeira e código
        const query = `
            SELECT 
                s.id as seat_id,
                s.seat_code,
                sc.id as code_id,
                sc.unique_code,
                sc.is_used,
                sc.expires_at
            FROM seats s
            INNER JOIN seat_codes sc ON s.id = sc.seat_id
            WHERE s.seat_code = ? AND sc.unique_code = ? AND sc.is_active = 1
        `;
        
        const results = await executeQuery(query, [seatCode, uniqueCode]);
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Código inválido ou cadeira não encontrada' 
            });
        }

        const seatData = results[0];
        
        // Verificar se já foi usado
        if (seatData.is_used) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este código já foi utilizado' 
            });
        }
        
        // Verificar se expirou
        if (new Date(seatData.expires_at) < new Date()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código expirado' 
            });
        }

        // Marcar código como usado
        await executeQuery(
            'UPDATE seat_codes SET is_used = 1, used_at = NOW() WHERE id = ?',
            [seatData.code_id]
        );
        
        // Criar sessão ativa
        await executeQuery(
            'INSERT INTO seat_sessions (seat_id, code_id, user_ip) VALUES (?, ?, ?)',
            [seatData.seat_id, seatData.code_id, userIP || req.ip]
        );
        
        // Notificar todos os clientes via WebSocket
        io.emit('seatStatusUpdate', {
            seatCode: seatData.seat_code,
            status: 'occupied',
            timestamp: new Date()
        });
        
        res.json({ 
            success: true, 
            message: 'Acesso liberado com sucesso!',
            seatCode: seatData.seat_code
        });
        
    } catch (error) {
        console.error('Erro ao validar código:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Gerar novo código para uma cadeira (para administradores)
app.post('/api/generate-code', async (req, res) => {
    try {
        const { seatCode } = req.body;
        
        if (!seatCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código da cadeira é obrigatório' 
            });
        }

        // Verificar se a cadeira existe
        const seatResults = await executeQuery(
            'SELECT id FROM seats WHERE seat_code = ?',
            [seatCode]
        );
        
        if (seatResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cadeira não encontrada' 
            });
        }

        const seatId = seatResults[0].id;
        
        // Desativar códigos anteriores para esta cadeira
        await executeQuery(
            'UPDATE seat_codes SET is_active = 0 WHERE seat_id = ? AND is_active = 1',
            [seatId]
        );
        
        // Gerar novo código único
        let newCode;
        let codeExists = true;
        
        // Garantir que o código seja único
        while (codeExists) {
            newCode = generateUniqueCode();
            const existingCode = await executeQuery(
                'SELECT id FROM seat_codes WHERE unique_code = ? AND is_active = 1',
                [newCode]
            );
            codeExists = existingCode.length > 0;
        }
        
        // Inserir novo código
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (process.env.CODE_EXPIRY_HOURS || 2));
        
        await executeQuery(
            'INSERT INTO seat_codes (seat_id, unique_code, expires_at) VALUES (?, ?, ?)',
            [seatId, newCode, expiresAt]
        );
        
        // Notificar dashboard
        io.emit('newCodeGenerated', {
            seatCode,
            uniqueCode: newCode,
            expiresAt
        });
        
        res.json({ 
            success: true, 
            message: 'Código gerado com sucesso!',
            seatCode,
            uniqueCode: newCode,
            expiresAt
        });
        
    } catch (error) {
        console.error('Erro ao gerar código:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Finalizar sessão (liberar cadeira)
app.post('/api/end-session', async (req, res) => {
    try {
        const { seatCode } = req.body;
        
        if (!seatCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código da cadeira é obrigatório' 
            });
        }

        // Buscar sessão ativa
        const sessionQuery = `
            SELECT ss.id, s.seat_code
            FROM seat_sessions ss
            INNER JOIN seats s ON ss.seat_id = s.id
            WHERE s.seat_code = ? AND ss.status = 'active'
        `;
        
        const sessions = await executeQuery(sessionQuery, [seatCode]);
        
        if (sessions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Sessão ativa não encontrada para esta cadeira' 
            });
        }

        // Finalizar sessão
        await executeQuery(
            'UPDATE seat_sessions SET status = ?, session_end = NOW() WHERE id = ?',
            ['completed', sessions[0].id]
        );
        
        // Notificar todos os clientes
        io.emit('seatStatusUpdate', {
            seatCode,
            status: 'available',
            timestamp: new Date()
        });
        
        res.json({ 
            success: true, 
            message: 'Sessão finalizada com sucesso!',
            seatCode
        });
        
    } catch (error) {
        console.error('Erro ao finalizar sessão:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Obter histórico de uma cadeira
app.get('/api/seat-history/:seatCode', async (req, res) => {
    try {
        const { seatCode } = req.params;
        
        const query = `
            SELECT 
                ss.id,
                sc.unique_code,
                ss.user_ip,
                ss.accessed_at,
                ss.session_end,
                ss.status,
                TIMESTAMPDIFF(MINUTE, ss.accessed_at, COALESCE(ss.session_end, NOW())) as duration_minutes
            FROM seat_sessions ss
            INNER JOIN seats s ON ss.seat_id = s.id
            INNER JOIN seat_codes sc ON ss.code_id = sc.id
            WHERE s.seat_code = ?
            ORDER BY ss.accessed_at DESC
            LIMIT 50
        `;
        
        const history = await executeQuery(query, [seatCode]);
        res.json(history);
        
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// WebSocket connections
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('qrScanned', (data) => {
        console.log('QR Code escaneado:', data);
        // Emitir para dashboard em tempo real
        socket.broadcast.emit('qrScanEvent', {
            seatCode: data,
            timestamp: new Date(),
            socketId: socket.id
        });
    });

    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log('Cliente entrou no dashboard');
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
    console.log('🚀 Iniciando CineMax - Sistema de Assentos QR...');
    
    // Inicializar banco de dados
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
        console.error('❌ Não foi possível inicializar o banco de dados.');
        console.error('💡 Verifique:');
        console.error('   - Se o MySQL está rodando');
        console.error('   - Se as credenciais no .env estão corretas');
        console.error('   - Se o usuário tem permissões para criar bancos');
        process.exit(1);
    }
    
    // Testar conexão com o banco
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('❌ Não foi possível conectar ao banco de dados após inicialização.');
        process.exit(1);
    }
    
    server.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📱 Interface do usuário: http://localhost:${PORT}`);
        console.log(`📊 Dashboard administrativo: http://localhost:${PORT}/dashboard`);
        console.log(`🔧 Para gerar QR codes: Abra utils/qr-generator.html`);
        console.log('');
        console.log('✅ Sistema pronto para uso!');
    });
}

startServer();
