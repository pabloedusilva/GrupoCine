// Conectar ao WebSocket
const socket = io();

let seats = [];
let selectedSeat = null;

// Elementos DOM
const statusMessage = document.getElementById('statusMessage');
const seatingArea = document.getElementById('seatingArea');
const seatSelect = document.getElementById('seatSelect');
const pressButton = document.getElementById('pressButton');
const releaseButton = document.getElementById('releaseButton');
const connectionStatus = document.getElementById('connectionStatus');

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    loadSeats();
    setupEventListeners();
    setupSocketListeners();
    updateConnectionStatus('simulated', 'Modo Simulação Ativo');
});

function setupEventListeners() {
    // Selecionar cadeira
    seatSelect.addEventListener('change', (e) => {
        selectedSeat = e.target.value;
        updateButtonStates();
        highlightSelectedSeat();
    });

    // Botões de simulação
    pressButton.addEventListener('click', () => {
        if (selectedSeat) {
            simulateButton('PRESSED');
        }
    });

    releaseButton.addEventListener('click', () => {
        if (selectedSeat) {
            simulateButton('RELEASED');
        }
    });
}

function setupSocketListeners() {
    // Atualizar status da cadeira em tempo real
    socket.on('seatStatusUpdate', (data) => {
        console.log('Status atualizado:', data);
        updateSeatVisual(data.seatCode, data.status);
        
        // Atualizar dados locais
        const seatIndex = seats.findIndex(s => s.seat_code === data.seatCode);
        if (seatIndex !== -1) {
            seats[seatIndex].status = data.status;
        }
    });

    // Atualizar status físico da cadeira (Arduino)
    socket.on('seatPhysicalUpdate', (data) => {
        console.log('Status físico atualizado:', data);
        updateSeatPhysicalVisual(data.seatCode, data.physicalStatus);
        
        // Atualizar dados locais
        const seatIndex = seats.findIndex(s => s.seat_code === data.seatCode);
        if (seatIndex !== -1) {
            seats[seatIndex].physical_status = data.physicalStatus;
        }

        // Mostrar mensagem de feedback
        const action = data.physicalStatus === 'pending' ? 'sentou' : 'levantou';
        showMessage(`🎬 Simulação: Pessoa ${action} na cadeira ${data.seatCode}`, 'success');
    });

    // Sessão finalizada
    socket.on('sessionFinished', (data) => {
        console.log('Sessão finalizada:', data);
        showMessage('🔄 Sessão finalizada pelo administrador. Atualizando...', 'info');
        setTimeout(() => {
            loadSeats();
        }, 1000);
    });

    // Status de conexão
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        updateConnectionStatus('simulated', 'Modo Simulação Ativo');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        updateConnectionStatus('disconnected', 'Desconectado do Servidor');
    });
}

// Carregar estado das cadeiras
async function loadSeats() {
    try {
        const response = await fetch('/api/seats');
        seats = await response.json();
        renderSeats();
        populateSeatSelect();
    } catch (error) {
        console.error('Erro ao carregar cadeiras:', error);
        showMessage("Erro ao carregar informações das cadeiras.", "error");
    }
}

// Preencher select de cadeiras
function populateSeatSelect() {
    seatSelect.innerHTML = '<option value="">Selecione uma cadeira</option>';
    
    seats.forEach(seat => {
        const option = document.createElement('option');
        option.value = seat.seat_code;
        option.textContent = `${seat.seat_code} ${seat.is_vip ? '(VIP)' : ''}`;
        seatSelect.appendChild(option);
    });
}

// Renderizar mapa de cadeiras
function renderSeats() {
    seatingArea.innerHTML = '';
    
    // Agrupar por fileira dinamicamente
    const rowsMap = new Map();
    seats.forEach(s => {
        if (!rowsMap.has(s.row_letter)) rowsMap.set(s.row_letter, []);
        rowsMap.get(s.row_letter).push(s);
    });
    
    // Ordenar fileiras e assentos
    const rowLetters = Array.from(rowsMap.keys()).sort();
    rowLetters.forEach(rowLetter => {
        const rowSeats = rowsMap.get(rowLetter).sort((a,b) => a.seat_number - b.seat_number);
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';

        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = rowLetter;
        rowDiv.appendChild(rowLabel);

        rowSeats.forEach(seatData => {
            const seatCode = seatData.seat_code;
            const seatDiv = document.createElement('div');
            seatDiv.className = 'seat';
            seatDiv.dataset.seatCode = seatCode;
            seatDiv.textContent = seatData.seat_number;

            // Aplicar classes baseadas no status
            const displayStatus = getDisplayStatus(seatData);
            seatDiv.classList.add(displayStatus);
            if (seatData.is_vip) seatDiv.classList.add('vip');

            // Clique para selecionar cadeira
            seatDiv.addEventListener('click', () => {
                seatSelect.value = seatCode;
                selectedSeat = seatCode;
                updateButtonStates();
                highlightSelectedSeat();
            });

            rowDiv.appendChild(seatDiv);
        });

        seatingArea.appendChild(rowDiv);
    });
}

// Função para determinar o status visual da cadeira
function getDisplayStatus(seatData) {
    // Se está ocupada (com código validado), sempre mostrar como occupied
    if (seatData.status === 'occupied') {
        return 'occupied';
    }
    
    // Se tem alguém sentado (Arduino detectou), mostrar como pending
    if (seatData.physical_status === 'pending') {
        return 'pending';
    }
    
    // Caso contrário, mostrar status padrão
    return seatData.status || 'available';
}

// Atualizar visual de uma cadeira específica (status de compra/validação)
function updateSeatVisual(seatCode, newStatus) {
    const seatElement = document.querySelector(`[data-seat-code="${seatCode}"]`);
    if (seatElement) {
        // Atualizar dados locais
        const seatIndex = seats.findIndex(s => s.seat_code === seatCode);
        if (seatIndex !== -1) {
            seats[seatIndex].status = newStatus;
        }
        
        // Remover classes de status existentes
        seatElement.classList.remove('available', 'purchased', 'occupied', 'pending');
        
        // Aplicar novo status visual
        const seatData = seats[seatIndex];
        if (seatData) {
            const displayStatus = getDisplayStatus(seatData);
            seatElement.classList.add(displayStatus);
        }
    }
}

// Atualizar visual físico de uma cadeira (Arduino)
function updateSeatPhysicalVisual(seatCode, physicalStatus) {
    const seatElement = document.querySelector(`[data-seat-code="${seatCode}"]`);
    if (seatElement) {
        // Atualizar dados locais
        const seatIndex = seats.findIndex(s => s.seat_code === seatCode);
        if (seatIndex !== -1) {
            seats[seatIndex].physical_status = physicalStatus;
        }
        
        // Remover classes de status existentes
        seatElement.classList.remove('available', 'purchased', 'occupied', 'pending');
        
        // Aplicar novo status visual
        const seatData = seats[seatIndex];
        if (seatData) {
            const displayStatus = getDisplayStatus(seatData);
            seatElement.classList.add(displayStatus);
        }
    }
}

// Destacar cadeira selecionada
function highlightSelectedSeat() {
    // Remover destaque anterior
    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('simulator-selected');
    });
    
    // Adicionar destaque à cadeira selecionada
    if (selectedSeat) {
        const seatElement = document.querySelector(`[data-seat-code="${selectedSeat}"]`);
        if (seatElement) {
            seatElement.classList.add('simulator-selected');
        }
    }
}

// Atualizar estado dos botões
function updateButtonStates() {
    const hasSelection = selectedSeat !== null && selectedSeat !== '';
    pressButton.disabled = !hasSelection;
    releaseButton.disabled = !hasSelection;
}

// Simular pressionamento de botão
async function simulateButton(action) {
    if (!selectedSeat) return;
    
    try {
        const response = await fetch('/api/simulate-button', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                seatCode: selectedSeat, 
                action: action 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const actionText = action === 'PRESSED' ? 'pressionamento' : 'liberação';
            console.log(`✅ Simulação de ${actionText} enviada para ${selectedSeat}`);
        } else {
            showMessage(`❌ Erro na simulação: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao simular botão:', error);
        showMessage('❌ Erro de conexão na simulação.', 'error');
    }
}

// Atualizar status da conexão
function updateConnectionStatus(status, text) {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');
    
    // Remover classes anteriores
    statusDot.classList.remove('connected', 'disconnected', 'simulated');
    
    // Adicionar nova classe
    statusDot.classList.add(status);
    statusText.textContent = text;
}

// Mostrar mensagem de status
function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Esconder mensagem após 5 segundos
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}
