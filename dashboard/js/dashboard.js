// Dashboard JavaScript
const socket = io();

let seats = [];
let activeCodes = [];
let activityLog = [];
let sessionStart = new Date();

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
const occupancyRateEl = document.getElementById('occupancyRate');
const usedCodesEl = document.getElementById('usedCodes');
const sessionStartEl = document.getElementById('sessionStart');
const historyTableBody = document.getElementById('historyTableBody');
const searchHistoryInput = document.getElementById('searchHistory');
const statusFilter = document.getElementById('statusFilter');

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', function() {
    socket.emit('joinDashboard');
    loadDashboardData();
    setupEventListeners();
    updateSessionInfo();
    
    // Atualizar dados periodicamente
    setInterval(loadDashboardData, 30000); // A cada 30 segundos
    setInterval(updateStats, 5000); // A cada 5 segundos
});

// Configurar event listeners
function setupEventListeners() {
    generateCodeBtn.addEventListener('click', generateCode);
    searchHistoryInput.addEventListener('input', filterHistory);
    statusFilter.addEventListener('change', filterHistory);
    
    // Modal event listeners
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalConfirm').addEventListener('click', confirmAction);
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
    
    // Taxa de ocupação
    const occupancyRate = totalSeats > 0 ? ((occupiedSeats / totalSeats) * 100).toFixed(1) : 0;
    occupancyRateEl.textContent = `${occupancyRate}%`;
    
    // Códigos usados
    const usedCodes = seats.filter(s => s.status === 'occupied').length;
    usedCodesEl.textContent = usedCodes;
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
        case 'available': return 'Disponível';
        case 'purchased': return 'Comprada';
        case 'occupied': return 'Ocupada';
        default: return 'Desconhecido';
    }
}

// Renderizar mapa de assentos administrativo
function renderAdminSeats() {
    adminSeatingArea.innerHTML = '';
    
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
            seatDiv.className = 'admin-seat';
            seatDiv.dataset.seatCode = seatCode;
            seatDiv.textContent = i;
            seatDiv.title = `${seatCode} - ${seatData ? getStatusText(seatData.status) : 'Disponível'}`;
            
            if (seatData) {
                seatDiv.classList.add(seatData.status);
                if (seatData.is_vip) {
                    seatDiv.classList.add('vip');
                }
            } else {
                seatDiv.classList.add('available');
            }
            
            // Event listener para clique na cadeira
            seatDiv.addEventListener('click', () => {
                seatSelect.value = seatCode;
                showSeatDetails(seatCode);
            });
            
            rowDiv.appendChild(seatDiv);
        }
        
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
        // Para este exemplo, vamos buscar o histórico das últimas sessões
        const historyData = seats.filter(s => s.accessed_at).map(s => ({
            seat_code: s.seat_code,
            unique_code: s.unique_code || 'N/A',
            status: s.status,
            accessed_at: s.accessed_at,
            session_end: null,
            duration_minutes: 0,
            user_ip: '127.0.0.1'
        }));
        
        renderHistory(historyData);
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
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

// Atualizar informações da sessão
function updateSessionInfo() {
    sessionStartEl.textContent = sessionStart.toLocaleTimeString();
}

// Exportar relatório
function exportReport() {
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
            totalSeats: seats.length,
            occupiedSeats: seats.filter(s => s.status === 'occupied').length,
            purchasedSeats: seats.filter(s => s.status === 'purchased').length,
            availableSeats: seats.filter(s => s.status === 'available').length,
            occupancyRate: ((seats.filter(s => s.status === 'occupied').length / seats.length) * 100).toFixed(1)
        },
        seats: seats,
        activeCodes: activeCodes,
        activityLog: activityLog
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `cinema-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Relatório exportado com sucesso!', 'success');
}

// Limpar histórico
function clearHistory() {
    showConfirmModal(
        'Limpar Histórico',
        'Tem certeza que deseja limpar todo o histórico de atividades?',
        () => {
            activityLog = [];
            renderActivityFeed();
            showNotification('Histórico limpo com sucesso!', 'success');
        }
    );
}

// Finalizar todas as sessões
function endAllSessions() {
    showConfirmModal(
        'Finalizar Todas as Sessões',
        'Tem certeza que deseja finalizar todas as sessões ativas? Esta ação não pode ser desfeita.',
        async () => {
            try {
                const activeSessions = seats.filter(s => s.status === 'occupied');
                
                for (const seat of activeSessions) {
                    await fetch('/api/end-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ seatCode: seat.seat_code })
                    });
                }
                
                loadDashboardData();
                showNotification(`${activeSessions.length} sessões finalizadas com sucesso!`, 'success');
                
            } catch (error) {
                console.error('Erro ao finalizar sessões:', error);
                showNotification('Erro ao finalizar sessões', 'error');
            }
        }
    );
}

// Mostrar modal de confirmação
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';
    
    // Armazenar callback
    window.currentConfirmAction = onConfirm;
}

// Fechar modal
function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    window.currentConfirmAction = null;
}

// Confirmar ação
function confirmAction() {
    if (window.currentConfirmAction) {
        window.currentConfirmAction();
        window.currentConfirmAction = null;
    }
    closeModal();
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
