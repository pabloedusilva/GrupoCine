// Dashboard JavaScript
const socket = io();

let seats = [];
let activeCodes = [];
let activityLog = [];

// Elementos DOM
const totalSeatsEl = document.getElementById('totalSeats');
const occupiedSeatsEl = document.getElementById('occupiedSeats');
const purchasedSeatsEl = document.getElementById('purchasedSeats');
const availableSeatsEl = document.getElementById('availableSeats');
const seatSelect = document.getElementById('seatSelect');
const generateCodeBtn = document.getElementById('generateCodeBtn');
const codeResult = document.getElementById('codeResult');
const generatedCodeEl = document.getElementById('generatedCode');
const codeSeatEl = document.getElementById('codeSeat');
const codeExpiryEl = document.getElementById('codeExpiry');
const adminSeatingArea = document.getElementById('adminSeatingArea');
const activityList = document.getElementById('activityList');
const activeCodesList = document.getElementById('activeCodesList');
const historyTableBody = document.getElementById('historyTableBody');
const searchHistoryInput = document.getElementById('searchHistory');
const statusFilter = document.getElementById('statusFilter');

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', function() {
    socket.emit('joinDashboard');
    loadDashboardData();
    setupEventListeners();
    
    // Atualizar dados periodicamente
    setInterval(loadDashboardData, 30000); // A cada 30 segundos
    setInterval(updateStats, 5000); // A cada 5 segundos
});

// Configurar event listeners
function setupEventListeners() {
    generateCodeBtn.addEventListener('click', generateCode);
    searchHistoryInput.addEventListener('input', filterHistory);
    statusFilter.addEventListener('change', filterHistory);
}

// Carregar dados do dashboard
async function loadDashboardData() {
    try {
        const response = await fetch('/api/seats');
        seats = await response.json();
        
        populateSeatSelect();
        renderAdminSeats();
        updateStats();
        loadActiveCodes();
        loadHistory();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar dados do dashboard', 'error');
    }
}

// Atualizar estatísticas
function updateStats() {
    const totalSeats = seats.length;
    const occupiedSeats = seats.filter(s => s.status === 'occupied').length;
    const purchasedSeats = seats.filter(s => s.status === 'purchased').length;
    const availableSeats = seats.filter(s => s.status === 'available').length;
    
    totalSeatsEl.textContent = totalSeats;
    occupiedSeatsEl.textContent = occupiedSeats;
    purchasedSeatsEl.textContent = purchasedSeats;
    availableSeatsEl.textContent = availableSeats;
}

// Preencher select de cadeiras
function populateSeatSelect() {
    seatSelect.innerHTML = '<option value="">Selecione uma cadeira</option>';
    
    seats.forEach(seat => {
        const option = document.createElement('option');
        option.value = seat.seat_code;
        option.textContent = `${seat.seat_code} ${seat.is_vip ? '(VIP)' : ''} - ${getStatusText(seat.status)}`;
        seatSelect.appendChild(option);
    });
}

// Obter texto do status
function getStatusText(status) {
    switch(status) {
        case 'available': return 'Aguarando validação';
        case 'purchased': return 'Aguarando validação';
        case 'occupied': return 'Ocupada';
        default: return 'Desconhecido';
    }
}

// Renderizar mapa de assentos administrativo
function renderAdminSeats() {
    adminSeatingArea.innerHTML = '';
    // Agrupar dinamicamente
    const rowsMap = new Map();
    seats.forEach(s => {
        if (!rowsMap.has(s.row_letter)) rowsMap.set(s.row_letter, []);
        rowsMap.get(s.row_letter).push(s);
    });
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
            seatDiv.className = 'admin-seat';
            seatDiv.dataset.seatCode = seatCode;
            seatDiv.textContent = seatData.seat_number;
            seatDiv.title = `${seatCode} - ${getStatusText(seatData.status)}`;

            seatDiv.classList.add(seatData.status || 'available');
            if (seatData.is_vip) seatDiv.classList.add('vip');

            seatDiv.addEventListener('click', () => {
                seatSelect.value = seatCode;
                showSeatDetails(seatCode);
            });

            rowDiv.appendChild(seatDiv);
        });

        adminSeatingArea.appendChild(rowDiv);
    });
}

// Mostrar detalhes da cadeira
async function showSeatDetails(seatCode) {
    try {
        const response = await fetch(`/api/seat-history/${seatCode}`);
        const history = await response.json();
        
        let detailsHtml = `<h3>Histórico da Cadeira ${seatCode}</h3>`;
        
        if (history.length === 0) {
            detailsHtml += '<p>Nenhum histórico encontrado.</p>';
        } else {
            detailsHtml += '<div class="seat-history-list">';
            history.slice(0, 5).forEach(session => {
                const startTime = new Date(session.accessed_at).toLocaleString();
                const endTime = session.session_end ? new Date(session.session_end).toLocaleString() : 'Em andamento';
                const duration = session.duration_minutes || 0;
                
                detailsHtml += `
                    <div class="history-item">
                        <p><strong>Código:</strong> ${session.unique_code}</p>
                        <p><strong>Início:</strong> ${startTime}</p>
                        <p><strong>Fim:</strong> ${endTime}</p>
                        <p><strong>Duração:</strong> ${duration} minutos</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${session.status}">${session.status}</span></p>
                    </div>
                `;
            });
            detailsHtml += '</div>';
        }
        
        showNotification(detailsHtml, 'info', 10000);
        
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        showNotification('Erro ao carregar histórico da cadeira', 'error');
    }
}

// Gerar código para cadeira
async function generateCode() {
    const selectedSeat = seatSelect.value;
    
    if (!selectedSeat) {
        showNotification('Por favor, selecione uma cadeira', 'warning');
        return;
    }
    
    generateCodeBtn.disabled = true;
    generateCodeBtn.textContent = 'Gerando...';
    
    try {
        const response = await fetch('/api/generate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seatCode: selectedSeat })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mostrar código gerado
            generatedCodeEl.textContent = result.uniqueCode;
            codeSeatEl.textContent = result.seatCode;
            codeExpiryEl.textContent = new Date(result.expiresAt).toLocaleString();
            codeResult.style.display = 'block';
            
            // Atualizar interface
            loadDashboardData();
            addActivity('success', `Código ${result.uniqueCode} gerado para cadeira ${result.seatCode}`);
            showNotification(`Código ${result.uniqueCode} gerado com sucesso!`, 'success');
            
        } else {
            showNotification(result.message, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao gerar código:', error);
        showNotification('Erro ao gerar código', 'error');
    } finally {
        generateCodeBtn.disabled = false;
        generateCodeBtn.textContent = 'Gerar Código';
    }
}

// Carregar códigos ativos
function loadActiveCodes() {
    activeCodes = seats.filter(s => s.unique_code && s.status === 'purchased');
    renderActiveCodes();
}

// Renderizar códigos ativos
function renderActiveCodes() {
    activeCodesList.innerHTML = '';
    
    if (activeCodes.length === 0) {
        activeCodesList.innerHTML = '<p style="color: #888; text-align: center;">Nenhum código ativo</p>';
        return;
    }
    
    activeCodes.forEach(seat => {
        const codeDiv = document.createElement('div');
        codeDiv.className = 'code-item';
        
        const expiryDate = new Date(seat.expires_at);
        const timeLeft = Math.max(0, Math.floor((expiryDate - new Date()) / (1000 * 60)));
        
        codeDiv.innerHTML = `
            <div class="code-seat">${seat.seat_code} ${seat.is_vip ? '(VIP)' : ''}</div>
            <div class="code-value-small">${seat.unique_code}</div>
            <div class="code-expiry">Expira em ${timeLeft} minutos</div>
        `;
        
        // Destacar códigos que expiram em breve
        if (timeLeft <= 30) {
            codeDiv.style.borderColor = '#ff6b6b';
        }
        
        activeCodesList.appendChild(codeDiv);
    });
}

// Adicionar atividade ao log
function addActivity(type, message, details = '') {
    const activity = {
        type,
        message,
        details,
        timestamp: new Date()
    };
    
    activityLog.unshift(activity);
    
    // Manter apenas os últimos 50 itens
    if (activityLog.length > 50) {
        activityLog = activityLog.slice(0, 50);
    }
    
    renderActivityFeed();
}

// Renderizar feed de atividades
function renderActivityFeed() {
    activityList.innerHTML = '';
    
    activityLog.forEach(activity => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        
        const timeStr = activity.timestamp.toLocaleTimeString();
        
        activityDiv.innerHTML = `
            <div class="activity-time">${timeStr}</div>
            <div class="activity-text">${activity.message}</div>
            ${activity.details ? `<div class="activity-details">${activity.details}</div>` : ''}
        `;
        
        activityList.appendChild(activityDiv);
    });
}

// Carregar histórico
async function loadHistory() {
    try {
        // Buscar histórico real do servidor
        const response = await fetch('/api/seat-history');
        const historyData = await response.json();
        
        renderHistory(historyData);
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        // Se não conseguir carregar do servidor, mostrar tabela vazia
        renderHistory([]);
    }
}

// Renderizar histórico
function renderHistory(data) {
    historyTableBody.innerHTML = '';
    
    data.forEach(session => {
        const row = document.createElement('tr');
        
        const startTime = session.accessed_at ? new Date(session.accessed_at).toLocaleString() : 'N/A';
        const endTime = session.session_end ? new Date(session.session_end).toLocaleString() : '-';
        const duration = session.duration_minutes ? `${session.duration_minutes} min` : '-';
        
        row.innerHTML = `
            <td>${session.seat_code}</td>
            <td style="font-family: monospace;">${session.unique_code}</td>
            <td><span class="status-badge status-${session.status}">${session.status}</span></td>
            <td>${startTime}</td>
            <td>${endTime}</td>
            <td>${duration}</td>
            <td>${session.user_ip}</td>
        `;
        
        historyTableBody.appendChild(row);
    });
}

// Filtrar histórico
function filterHistory() {
    const searchTerm = searchHistoryInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;
    
    const rows = historyTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const seatCode = row.cells[0].textContent.toLowerCase();
        const status = row.cells[2].querySelector('.status-badge').textContent.toLowerCase();
        
        const matchesSearch = seatCode.includes(searchTerm);
        const matchesStatus = !statusFilterValue || status === statusFilterValue;
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

// Mostrar notificação
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Remover notificação após duração especificada
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// WebSocket event listeners
socket.on('connect', () => {
    console.log('Dashboard conectado ao servidor');
    addActivity('info', 'Dashboard conectado ao servidor');
});

socket.on('qrScanEvent', (data) => {
    addActivity('info', `QR Code escaneado: ${data.seatCode}`, `Cliente: ${data.socketId}`);
});

socket.on('seatStatusUpdate', (data) => {
    addActivity('success', `Cadeira ${data.seatCode} ${data.status === 'occupied' ? 'ocupada' : 'liberada'}`);
    loadDashboardData();
});

socket.on('newCodeGenerated', (data) => {
    addActivity('info', `Novo código gerado para cadeira ${data.seatCode}`, `Código: ${data.uniqueCode}`);
    loadDashboardData();
});

socket.on('disconnect', () => {
    console.log('Dashboard desconectado');
    addActivity('warning', 'Conexão perdida com o servidor');
});
