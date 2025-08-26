// Conectar ao WebSocket
const socket = io();

let seats = [];
let controlledSeat = null; // Cadeira atualmente controlada pelo Arduino

// Elementos DOM
const seatSelect = document.getElementById('seatSelect');
const currentSeat = document.getElementById('currentSeat');
const arduinoStatus = document.getElementById('arduinoStatus');
const lastActivity = document.getElementById('lastActivity');
const connectionStatus = document.getElementById('connectionStatus');

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    loadSeats();
    setupEventListeners();
    setupSocketListeners();
    updateConnectionStatus('Conectando ao Arduino...');
});

function setupEventListeners() {
    // Mudança no select - configura Arduino automaticamente
    seatSelect.addEventListener('change', (e) => {
        const selectedSeatCode = e.target.value;
        if (selectedSeatCode && selectedSeatCode !== controlledSeat) {
            setArduinoSeat(selectedSeatCode);
        }
    });
}

function setupSocketListeners() {
    // Confirmação de configuração do Arduino
    socket.on('arduinoConfigured', (data) => {
        console.log('Arduino configurado:', data);
        controlledSeat = data.seatCode;
        currentSeat.textContent = data.seatCode;
        lastActivity.textContent = 'Configurado agora';
        
        // Atualizar select para corresponder
        seatSelect.value = data.seatCode;
    });

    // Atualizar status físico da cadeira (Arduino)
    socket.on('seatPhysicalUpdate', (data) => {
        console.log('Status físico atualizado:', data);
        
        // Atualizar última atividade apenas se for a cadeira controlada
        if (data.seatCode === controlledSeat) {
            const action = data.physicalStatus === 'pending' ? 'Botão pressionado' : 'Botão liberado';
            lastActivity.textContent = `${action} (${new Date().toLocaleTimeString()})`;
        }
    });

    // Status de conexão
    socket.on('connect', () => {
        updateConnectionStatus('Arduino Conectado', true);
        loadSeats(); // Recarregar cadeiras ao conectar
    });

    socket.on('disconnect', () => {
        updateConnectionStatus('Desconectado do Servidor', false);
    });
}

async function loadSeats() {
    try {
        const response = await fetch('/api/seats');
        seats = await response.json();
        
        populateSeatSelect();
        
    } catch (error) {
        console.error('Erro ao carregar cadeiras:', error);
        updateConnectionStatus('Erro ao carregar cadeiras', false);
    }
}

function populateSeatSelect() {
    seatSelect.innerHTML = '<option value="">Selecione uma cadeira...</option>';
    
    seats.forEach(seat => {
        const option = document.createElement('option');
        option.value = seat.seat_code;
        option.textContent = `${seat.seat_code} ${seat.is_vip ? '(VIP)' : ''}`;
        seatSelect.appendChild(option);
    });
}

async function setArduinoSeat(seatCode) {
    try {
        arduinoStatus.textContent = 'Configurando...';
        
        // Enviar comando para o servidor configurar o Arduino
        const response = await fetch('/api/set-arduino-seat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seatCode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            arduinoStatus.textContent = 'Conectado';
            console.log(`Arduino configurado para cadeira ${seatCode}`);
        } else {
            arduinoStatus.textContent = 'Erro na configuração';
            console.error(result.message || 'Erro ao configurar Arduino');
        }
        
    } catch (error) {
        console.error('Erro ao configurar Arduino:', error);
        arduinoStatus.textContent = 'Erro de comunicação';
    }
}

function updateConnectionStatus(message, isConnected = null) {
    connectionStatus.textContent = message;
    
    // Remover classes anteriores
    connectionStatus.classList.remove('connected', 'disconnected');
    
    // Adicionar classe baseada no status
    if (isConnected === true) {
        connectionStatus.classList.add('connected');
    } else if (isConnected === false) {
        connectionStatus.classList.add('disconnected');
    }
}
