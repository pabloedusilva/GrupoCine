// Conectar ao WebSocket
const socket = io();

let html5QrCode;
let currentSeatCode = null;
let seats = [];

// Elementos DOM
const codeInputSection = document.getElementById('codeInputSection');
const currentScanDiv = document.getElementById('currentScan');
const codeInput = document.getElementById('codeInput');
const validateBtn = document.getElementById('validateBtn');
const statusMessage = document.getElementById('statusMessage');
const seatingArea = document.getElementById('seatingArea');

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeQRScanner();
    loadSeats();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    validateBtn.addEventListener('click', validateSeatCode);
    
    codeInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
        validateBtn.disabled = e.target.value.length !== 5;
    });
    
    codeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.value.length === 5) {
            validateSeatCode();
        }
    });
}

// Inicializar scanner QR
function initializeQRScanner() {
    html5QrCode = new Html5Qrcode("reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Erro ao iniciar scanner:", err);
        showMessage("Erro ao acessar a câmera. Verifique as permissões.", "error");
    });
}

// Callback quando QR code é lido com sucesso
function onScanSuccess(decodedText, decodedResult) {
    currentSeatCode = decodedText.trim().toUpperCase();
    
    // Notificar servidor sobre o scan
    socket.emit('qrScanned', currentSeatCode);
    
    // Mostrar seção de input do código
    showCodeInputSection(currentSeatCode);
    
    // Parar o scanner temporariamente
    html5QrCode.pause();
    
    console.log("QR Code escaneado:", currentSeatCode);
}

// Callback quando há erro no scan
function onScanFailure(error) {
    // Ignorar erros de scan contínuo
    if (error.includes("NotFoundException")) {
        return;
    }
    console.warn("Erro no scan:", error);
}

// Mostrar seção de input do código
function showCodeInputSection(seatCode) {
    currentScanDiv.innerHTML = `
        <div class="scan-info">Cadeira Escaneada: <strong>${seatCode}</strong></div>
        <p>Digite o código único de 5 caracteres para esta cadeira:</p>
    `;
    
    codeInputSection.classList.add('active');
    codeInput.value = '';
    codeInput.focus();
    validateBtn.disabled = true;
}

// Validar código da cadeira
async function validateSeatCode() {
    if (!currentSeatCode || codeInput.value.length !== 5) {
        showMessage("Por favor, escaneie uma cadeira e digite o código de 5 caracteres.", "error");
        return;
    }
    
    const uniqueCode = codeInput.value.trim().toUpperCase();
    
    // Mostrar loader
    validateBtn.disabled = true;
    validateBtn.innerHTML = '<div class="loader"></div>';
    
    try {
        const response = await fetch('/api/validate-seat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                seatCode: currentSeatCode,
                uniqueCode: uniqueCode,
                userIP: null // O servidor pegará automaticamente
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`✅ ${result.message}`, "success");
            
            // Atualizar visual da cadeira
            updateSeatVisual(currentSeatCode, 'occupied');
            
            // Resetar interface
            resetScanInterface();
            
            // Reiniciar scanner após 3 segundos
            setTimeout(() => {
                html5QrCode.resume();
            }, 3000);
            
        } else {
            showMessage(`❌ ${result.message}`, "error");
            
            // Limpar input para nova tentativa
            codeInput.value = '';
            codeInput.focus();
        }
        
    } catch (error) {
        console.error('Erro ao validar código:', error);
        showMessage("Erro de conexão. Tente novamente.", "error");
    } finally {
        validateBtn.disabled = false;
        validateBtn.innerHTML = 'Validar Código';
    }
}

// Carregar estado das cadeiras
async function loadSeats() {
    try {
        const response = await fetch('/api/seats');
        seats = await response.json();
        renderSeats();
    } catch (error) {
        console.error('Erro ao carregar cadeiras:', error);
        showMessage("Erro ao carregar informações das cadeiras.", "error");
    }
}

// Renderizar mapa de cadeiras
function renderSeats() {
    seatingArea.innerHTML = '';
    
    const rows = ['A', 'B', 'C', 'D', 'E'];
    const seatsPerRow = 10;
    
    rows.forEach(rowLetter => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        // Label da fileira
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = rowLetter;
        rowDiv.appendChild(rowLabel);
        
        // Cadeiras da fileira
        for (let i = 1; i <= seatsPerRow; i++) {
            const seatCode = `${rowLetter}${i}`;
            const seatData = seats.find(s => s.seat_code === seatCode);
            
            const seatDiv = document.createElement('div');
            seatDiv.className = 'seat';
            seatDiv.dataset.seatCode = seatCode;
            seatDiv.textContent = i;
            
            if (seatData) {
                // Aplicar classes baseadas no status
                seatDiv.classList.add(seatData.status);
                
                if (seatData.is_vip) {
                    seatDiv.classList.add('vip');
                }
            } else {
                seatDiv.classList.add('available');
            }
            
            rowDiv.appendChild(seatDiv);
        }
        
        seatingArea.appendChild(rowDiv);
    });
}

// Atualizar visual de uma cadeira específica
function updateSeatVisual(seatCode, newStatus) {
    const seatElement = document.querySelector(`[data-seat-code="${seatCode}"]`);
    if (seatElement) {
        // Remover classes de status existentes
        seatElement.classList.remove('available', 'purchased', 'occupied');
        // Adicionar nova classe de status
        seatElement.classList.add(newStatus);
    }
}

// Resetar interface de scan
function resetScanInterface() {
    codeInputSection.classList.remove('active');
    currentSeatCode = null;
    codeInput.value = '';
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
