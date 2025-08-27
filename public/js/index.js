// Conectar ao WebSocket
const socket = io();

let currentSeatCode = null;
let seats = [];
let currentControlledSeat = null; // cadeira atualmente controlada pelo Arduino

// Elementos DOM
const statusMessage = document.getElementById('statusMessage');
const seatingArea = document.getElementById('seatingArea');
// Modal
const seatModal = document.getElementById('seatModal');
const seatInfo = document.getElementById('seatInfo');
const modalCodeInput = document.getElementById('modalCodeInput');
const closeSeatModalBtn = document.getElementById('closeSeatModal');
const cancelSeatModalBtn = document.getElementById('cancelSeatModal');
const confirmSeatValidationBtn = document.getElementById('confirmSeatValidation');

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    loadSeats();
    setupGlobalListeners();
    fetchCurrentControlledSeat();
});

async function fetchCurrentControlledSeat() {
    try {
        const res = await fetch('/api/arduino/current-seat');
        const data = await res.json();
        currentControlledSeat = data.seatCode || null;
        // Re-render para garantir atualização visual correta
        if (seats.length) renderSeats();
    } catch (e) {
        console.error('Erro ao buscar cadeira controlada:', e);
    }
}

function setupGlobalListeners() {
    // Fechar modal
    closeSeatModalBtn.addEventListener('click', hideSeatModal);
    cancelSeatModalBtn.addEventListener('click', hideSeatModal);
    seatModal.addEventListener('click', (e) => {
        if (e.target === seatModal) hideSeatModal();
    });
    // Input sempre maiúsculo
    modalCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    modalCodeInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            confirmSeatValidation();
        }
    });
    confirmSeatValidationBtn.addEventListener('click', confirmSeatValidation);
}

function showSeatModal(seatCode) {
    currentSeatCode = seatCode;
    seatInfo.textContent = `Cadeira: ${seatCode}`;
    modalCodeInput.value = '';
    seatModal.classList.add('active');
    seatModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modalCodeInput.focus(), 0);
}

function hideSeatModal() {
    seatModal.classList.remove('active');
    seatModal.setAttribute('aria-hidden', 'true');
}

async function confirmSeatValidation() {
    const code = modalCodeInput.value.trim().toUpperCase();
    if (!currentSeatCode || code.length !== 5) {
        showMessage('Informe o código de 5 caracteres.', 'error');
        return;
    }
    const previousHtml = confirmSeatValidationBtn.innerHTML;
    confirmSeatValidationBtn.disabled = true;
    confirmSeatValidationBtn.innerHTML = '<div class="loader"></div>';

    try {
        const response = await fetch('/api/validate-seat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seatCode: currentSeatCode, uniqueCode: code, userIP: null })
        });
        const result = await response.json();
        if (result.success) {
            showMessage(`✅ ${result.message}`, 'success');
            updateSeatVisual(currentSeatCode, 'occupied');
            // Atualizar dados locais
            const seatIndex = seats.findIndex(s => s.seat_code === currentSeatCode);
            if (seatIndex !== -1) seats[seatIndex].status = 'occupied';
            hideSeatModal();
        } else {
            showMessage(`❌ ${result.message}`, 'error');
            modalCodeInput.focus();
            modalCodeInput.select();
        }
    } catch (err) {
        console.error('Erro ao validar código:', err);
        showMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
        confirmSeatValidationBtn.disabled = false;
        confirmSeatValidationBtn.innerHTML = previousHtml || 'Validar';
    }
}

// Carregar estado das cadeiras
async function loadSeats() {
    try {
        const response = await fetch('/api/seats');
        seats = await response.json();
        renderSeats();
        setupSocketListeners();
    } catch (error) {
        console.error('Erro ao carregar cadeiras:', error);
        showMessage("Erro ao carregar informações das cadeiras.", "error");
    }
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
    });

    // Sessão finalizada
    socket.on('sessionFinished', (data) => {
        console.log('Sessão finalizada:', data);
        showMessage('🔄 Sessão finalizada pelo administrador. Atualizando...', 'info');
        setTimeout(() => {
            loadSeats();
        }, 1000);
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
            if (seatData.status === 'occupied') seatDiv.classList.add('disabled');

            // Clique para abrir modal (exceto ocupada)
            seatDiv.addEventListener('click', () => {
                if (seatData.status === 'occupied') return;
                showSeatModal(seatCode);
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
    // Mostrar pending SOMENTE se for a cadeira atualmente controlada e botão pressionado
    if (currentControlledSeat && seatData.seat_code === currentControlledSeat && seatData.physical_status === 'pending') {
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
        // Se a cadeira que mudou é a controlada ou se era pending em outra, re-render parcial
        // Remover classes de status existentes
        seatElement.classList.remove('available', 'purchased', 'occupied', 'pending');
        
        // Aplicar novo status visual
        const seatData = seats[seatIndex];
        if (seatData) {
            const displayStatus = getDisplayStatus(seatData);
            seatElement.classList.add(displayStatus);
        }

        // Garantir que nenhuma outra cadeira não controlada permaneça visualmente como pending
        if (physicalStatus === 'pending') {
            document.querySelectorAll('.seat.pending').forEach(el => {
                const code = el.dataset.seatCode;
                if (code !== currentControlledSeat) {
                    el.classList.remove('pending');
                    const seatObj = seats.find(s => s.seat_code === code);
                    if (seatObj) {
                        const status = getDisplayStatus(seatObj);
                        el.classList.add(status);
                    }
                }
            });
        }
    }
}

// Resetar interface de scan
function resetScanInterface() {
    currentSeatCode = null;
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

// WebSocket event listeners
socket.on('connect', () => {
    console.log('Conectado ao servidor');
});

socket.on('seatStatusUpdate', (data) => {
    console.log('Atualização de status da cadeira:', data);
    updateSeatVisual(data.seatCode, data.status);
    
    // Atualizar dados locais
    const seatIndex = seats.findIndex(s => s.seat_code === data.seatCode);
    if (seatIndex !== -1) {
        seats[seatIndex].status = data.status;
    }
});

socket.on('newCodeGenerated', (data) => {
    console.log('Novo código gerado:', data);
    
    // Atualizar status da cadeira para "purchased"
    updateSeatVisual(data.seatCode, 'purchased');
    
    // Atualizar dados locais
    const seatIndex = seats.findIndex(s => s.seat_code === data.seatCode);
    if (seatIndex !== -1) {
        seats[seatIndex].status = 'purchased';
        seats[seatIndex].unique_code = data.uniqueCode;
        seats[seatIndex].expires_at = data.expiresAt;
    }
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    showMessage("Conexão perdida. Recarregue a página.", "error");
});

// Atualizar lista de cadeiras periodicamente
setInterval(loadSeats, 30000); // A cada 30 segundos
