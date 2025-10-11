// Verificação de autenticação
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Formata um valor em centavos para moeda brasileira
 @param {number} centavos - Valor em centavos (ex: 1000000 = R$ 10.000,00)
 @returns {string} Valor formatado sem o "R$"
 */
function formatarParaMoeda(centavos) {
    const value = centavos / 100;
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
    return formatter.format(value).replace('R$', '').trim();
}

/**
 * Converte string de moeda para centavos (para armazenar no banco)
 * @param {string} currencyString - String no formato "10.000,00"
 * @returns {number} Valor em centavos
 */
function prepararParaBancoDeDados(currencyString) {
    if (!currencyString) return 0;
    
    const stringSemPontos = currencyString.replace(/\./g, '');
    const stringComPontoDecimal = stringSemPontos.replace(',', '.');
    const valorDecimal = parseFloat(stringComPontoDecimal);
    
    // Converte para centavos multiplicando por 100
    return Math.round(valorDecimal * 100);
}

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================
let filteredClients = [];
let porteChartInstance = null;
let revenueChartInstance = null;
let calendarInstance = null;
let mapInstance = null;
let selectedClients = new Set();
let isSelectingMode = false;

// Função auxiliar para formatar valores monetários
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para mostrar notificações (MELHORADA)
function showNotification(message, type = 'info') {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        color: white;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Função para fechar modais
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

// 7. Modais de Edição/Criação (ATUALIZADOS COM FORMATAÇÃO MONETÁRIA)
function openEditModal(client) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Cliente: ${client.name}</h3>
            <form id="edit-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" value="${client.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" name="cnpj" value="${client.cnpj || ''}" required>
                </div>
                <div class="form-group">
                    <label>Porte:</label>
                    <select name="porte">
                        <option value="Grande" ${client.porte === 'Grande' ? 'selected' : ''}>Grande</option>
                        <option value="Médio" ${client.porte === 'Médio' ? 'selected' : ''}>Médio</option>
                        <option value="Pequeno" ${client.porte === 'Pequeno' ? 'selected' : ''}>Pequeno</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo" ${client.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${client.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Faturamento YTD:</label>
                    <input type="text" name="revenue_ytd" value="${formatarParaMoeda(client.revenue_ytd || 0)}" required placeholder="Ex: 10.000,00">
                </div>
                <div class="form-group">
                    <label>Frequência (dias):</label>
                    <input type="number" name="frequency_days" value="${client.frequency_days || 0}" required>
                </div>
                <div class="form-group">
                    <label>Último Serviço:</label>
                    <input type="date" name="last_service" value="${client.last_service || ''}" required>
                </div>
                <div class="form-group">
                    <label>Próximo Contato:</label>
                    <input type="date" name="next_contact" value="${client.next_contact || ''}" required>
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <textarea name="address" required>${client.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${client.email || ''}">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="tel" name="phone" value="${client.phone || ''}">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = {
            name: formData.get('name'),
            cnpj: formData.get('cnpj'),
            porte: formData.get('porte'),
            status: formData.get('status'),
            revenue_ytd: prepararParaBancoDeDados(formData.get('revenue_ytd')), // CONVERTIDO PARA CENTAVOS
            frequency_days: parseInt(formData.get('frequency_days')),
            last_service: formData.get('last_service'),
            next_contact: formData.get('next_contact'),
            address: formData.get('address'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };
        
        await updateClient(client.id, updates);
        closeModal();
    });

    document.body.appendChild(modal);
}

function openCreateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>➕ Adicionar Novo Cliente</h3>
            <form id="create-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" name="cnpj" required>
                </div>
                <div class="form-group">
                    <label>Porte:</label>
                    <select name="porte">
                        <option value="Grande">Grande</option>
                        <option value="Médio">Médio</option>
                        <option value="Pequeno">Pequeno</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Faturamento YTD:</label>
                    <input type="text" name="revenue_ytd" required placeholder="Ex: 10.000,00">
                </div>
                <div class="form-group">
                    <label>Frequência (dias):</label>
                    <input type="number" name="frequency_days" required>
                </div>
                <div class="form-group">
                    <label>Último Serviço:</label>
                    <input type="date" name="last_service" required>
                </div>
                <div class="form-group">
                    <label>Próximo Contato:</label>
                    <input type="date" name="next_contact" required>
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <textarea name="address" required></textarea>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="tel" name="phone">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Cliente</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newClient = {
            name: formData.get('name'),
            cnpj: formData.get('cnpj'),
            porte: formData.get('porte'),
            status: formData.get('status'),
            revenue_ytd: prepararParaBancoDeDados(formData.get('revenue_ytd')), // CONVERTIDO PARA CENTAVOS
            frequency_days: parseInt(formData.get('frequency_days')),
            last_service: formData.get('last_service'),
            next_contact: formData.get('next_contact'),
            address: formData.get('address'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };
        
        await createClient(newClient);
        closeModal();
    });

    document.body.appendChild(modal);
}

// 1. Cálculo e Exibição dos KPIs
function updateKPIs(clients) {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.revenue_ytd || 0), 0);
    const totalFrequency = clients.reduce((sum, c) => sum + (c.frequency_days || 0), 0);
    const avgFrequency = totalClients > 0 ? (totalFrequency / totalClients).toFixed(0) : 0;

    document.getElementById('kpi-total-clients').textContent = totalClients;
    document.getElementById('kpi-active-clients').textContent = activeClients;
    document.getElementById('kpi-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpi-avg-frequency').textContent = `${avgFrequency} dias`;
}

// 2. Renderização da Tabela de Clientes (CORRIGIDA)
function renderClientTable(clients) {
    const tbody = document.getElementById('client-table-body');
    
    if (!tbody) {
        console.error('❌ Elemento client-table-body não encontrado!');
        return;
    }
    
    tbody.innerHTML = '';

    if (clients.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'Nenhum cliente encontrado';
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem';
        cell.style.color = '#666';
        return;
    }

    clients.forEach(client => {
        const row = tbody.insertRow();
        
        // Nome
        row.insertCell().textContent = client.name || 'N/A';
        
        // Porte
        row.insertCell().textContent = client.porte || 'N/A';
        
        // Status
        const statusCell = row.insertCell();
        statusCell.textContent = client.status || 'N/A';
        statusCell.classList.add(client.status === 'Ativo' ? 'status-ativo' : 'status-inativo');
        
        // Faturamento YTD
        const revenueCell = row.insertCell();
        revenueCell.textContent = formatCurrency(client.revenue_ytd || 0);
        
        // Último Serviço
        const lastServiceCell = row.insertCell();
        lastServiceCell.textContent = client.last_service ? 
            new Date(client.last_service).toLocaleDateString('pt-BR') : 'N/A';
        
        // Próximo Contato
        const nextContactCell = row.insertCell();
        nextContactCell.textContent = client.next_contact ? 
            new Date(client.next_contact).toLocaleDateString('pt-BR') : 'N/A';
        
        // Ações
        const actionsCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️ Editar';
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => openEditModal(client);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Excluir';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => deleteClient(client.id);
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
    });
}

// 3. Lógica de Gráficos (Chart.js) - MANTIDA
function prepareChartData(clients) {
    const porteCounts = { Grande: 0, Médio: 0, Pequeno: 0 };
    const porteRevenue = { Grande: 0, Médio: 0, Pequeno: 0 };

    clients.forEach(client => {
        const porte = client.porte || 'Pequeno';
        porteCounts[porte] = (porteCounts[porte] || 0) + 1;
        porteRevenue[porte] = (porteRevenue[porte] || 0) + (client.revenue_ytd || 0);
    });

    return { porteCounts, porteRevenue };
}

function updateCharts(clients) {
    const { porteCounts, porteRevenue } = prepareChartData(clients);
    const labels = ['Grande', 'Médio', 'Pequeno'];
    const colors = ['#dc3545', '#ffc107', '#17a2b8'];

    // Gráfico de Distribuição por Porte (Pizza)
    const porteData = labels.map(label => porteCounts[label] || 0);
    
    const ctxPorte = document.getElementById('porteChart');
    if (!ctxPorte) {
        console.error('❌ Elemento porteChart não encontrado!');
        return;
    }

    if (porteChartInstance) {
        porteChartInstance.destroy();
    }

    porteChartInstance = new Chart(ctxPorte, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: porteData,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            }
        }
    });

    // Gráfico de Faturamento por Porte (Barra)
    const revenueData = labels.map(label => porteRevenue[label] || 0);
    
    const ctxRevenue = document.getElementById('revenueChart');
    if (!ctxRevenue) {
        console.error('❌ Elemento revenueChart não encontrado!');
        return;
    }

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento YTD (R$)',
                data: revenueData,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { 
                        callback: (value) => formatCurrency(value) 
                    } 
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 4. Lógica do Calendário (FullCalendar) - CORRIGIDA E TRADUZIDA
async function initCalendar() {
    try {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('❌ Elemento calendar não encontrado!');
            return;
        }

        const events = await clientAPI.getEvents();
        
        if (calendarInstance) {
            calendarInstance.destroy();
        }

        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
            },
            allDayText: 'Dia Todo',
            events: events,
            eventClick: function(info) {
                const clientId = info.event.extendedProps.clientId;
                const client = filteredClients.find(c => c.id === clientId);
                if (client) {
                    openEditModal(client);
                }
            }
        });
        
        calendarInstance.render();
        console.log('✅ Calendário inicializado com', events.length, 'eventos');
    } catch (error) {
        console.error('❌ Erro ao inicializar calendário:', error);
    }
}

// 5. Lógica do Mapa (Leaflet.js) - CORRIGIDA
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) {
        console.error('❌ Elemento map não encontrado!');
        return;
    }

    try {
        mapInstance = L.map('map').setView([-25.4284, -49.2733], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        console.log('✅ Mapa inicializado');
        updateMap(filteredClients);
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
    }
}

function updateMap(clients) {
    if (!mapInstance) return;
    
    // Remove marcadores antigos
    mapInstance.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            mapInstance.removeLayer(layer);
        }
    });

    clients.forEach(client => {
        // Verifica se tem coordenadas
        if (!client.lat || !client.lng) {
            console.warn('⚠️ Cliente sem coordenadas:', client.name);
            return;
        }

        let color;
        switch (client.porte) {
            case 'Grande': color = 'red'; break;
            case 'Médio': color = 'orange'; break;
            case 'Pequeno': color = 'blue'; break;
            default: color = 'gray';
        }

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const marker = L.marker([client.lat, client.lng], { icon: customIcon })
            .addTo(mapInstance)
            .bindPopup(`
                <b>${client.name}</b><br>
                Porte: ${client.porte}<br>
                Faturamento: ${formatCurrency(client.revenue_ytd || 0)}<br>
                Status: ${client.status}<br>
                <button onclick="selectClientForRoute(${client.id})" class="btn-edit" style="margin-top: 5px;">
                    ${selectedClients.has(client.id) ? '❌ Remover' : '📍 Selecionar'}
                </button>
            `);

        if (selectedClients.has(client.id)) {
            marker.getElement().classList.add('selected');
        }
    });
}

// 6. Sistema de CRUD (CORRIGIDO)
async function loadClients() {
    try {
        console.log('🔄 Carregando clientes...');
        showNotification('Carregando clientes...', 'info');
        
        // VERIFICAR SE API ESTÁ SINCRONIZADA
        if (!clientAPI.currentUser) {
            console.log('🔄 Sincronizando API com auth...');
            await clientAPI.updateCurrentUser();
        }
        
        const clients = await clientAPI.getClients();
        console.log('📊 Clientes recebidos:', clients);
        
        filteredClients = clients;
        updateAllViews();
        
        if (clients.length === 0) {
            showNotification('Nenhum cliente encontrado. Use o console para adicionar dados de teste.', 'info');
            addMockDataButton();
        } else {
            showNotification(`${clients.length} clientes carregados com sucesso!`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
        filteredClients = [];
        updateAllViews();
    }
}

async function updateClient(clientId, updates) {
    try {
        await clientAPI.updateClient(clientId, updates);
        await loadClients();
        showNotification('Cliente atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        showNotification('Erro ao atualizar cliente', 'error');
    }
}

async function createClient(clientData) {
    try {
        await clientAPI.createClient(clientData);
        await loadClients();
        showNotification('Cliente criado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        showNotification('Erro ao criar cliente', 'error');
    }
}

async function deleteClient(clientId) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            await clientAPI.deleteClient(clientId);
            await loadClients();
            showNotification('Cliente excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            showNotification('Erro ao excluir cliente', 'error');
        }
    }
}

// 8. Botão para dados mock (NOVO)
function addMockDataButton() {
    const button = document.createElement('button');
    button.textContent = '🎲 Carregar Dados de Teste (10 clientes)';
    button.className = 'btn-primary';
    button.style.marginTop = '10px';
    button.style.width = '100%';
    button.style.background = '#17a2b8';
    button.onclick = async function() {
        if (confirm('Isso irá adicionar 10 clientes de exemplo. Continuar?')) {
            try {
                showNotification('Inserindo dados de teste...', 'info');
                await clientAPI.insertMockData(10);
                showNotification('Dados inseridos! Recarregando...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                showNotification('Erro ao inserir dados: ' + error.message, 'error');
            }
        }
    };
    
    const sidebar = document.querySelector('.sidebar .action-group');
    if (sidebar) {
        sidebar.appendChild(button);
    }
}

// 9. Sistema de Seleção para Rota - MANTIDO
function selectClientForRoute(clientId) {
    if (selectedClients.has(clientId)) {
        selectedClients.delete(clientId);
    } else {
        selectedClients.add(clientId);
    }
    updateSelectedClientsDisplay();
    updateMap(filteredClients);
}

function updateSelectedClientsDisplay() {
    const selectedList = document.getElementById('selected-clients-list');
    const selectedCount = document.getElementById('selected-count');
    const selectedNames = document.getElementById('selected-clients-names');
    
    if (!selectedList || !selectedCount || !selectedNames) return;
    
    selectedCount.textContent = selectedClients.size;
    
    if (selectedClients.size > 0) {
        selectedList.style.display = 'block';
        selectedNames.innerHTML = '';
        
        selectedClients.forEach(clientId => {
            const client = filteredClients.find(c => c.id === clientId);
            if (client) {
                const item = document.createElement('div');
                item.className = 'selected-client-item';
                item.innerHTML = `
                    <span>${client.name}</span>
                    <button class="remove-selected" onclick="selectClientForRoute(${clientId})">×</button>
                `;
                selectedNames.appendChild(item);
            }
        });
    } else {
        selectedList.style.display = 'none';
    }
}

// 10. Função de Filtro (CORRIGIDA)
function applyFilters() {
    const search = document.getElementById('search-client').value.toLowerCase();
    const porte = document.getElementById('filter-porte').value;
    const status = document.getElementById('filter-status').value;

    // Para filtrar, precisamos da lista completa
    let masterClients = filteredClients;

    filteredClients = masterClients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(search) || 
                            (client.cnpj && client.cnpj.includes(search));
        const matchesPorte = porte === 'todos' || client.porte === porte;
        const matchesStatus = status === 'todos' || client.status === status;

        return matchesSearch && matchesPorte && matchesStatus;
    });

    updateAllViews();
}

// 11. Atualização de todas as visualizações
function updateAllViews() {
    updateKPIs(filteredClients);
    renderClientTable(filteredClients);
    updateCharts(filteredClients);
    updateMap(filteredClients);
    updateSelectedClientsDisplay();
}

// 12. Configuração de Event Listeners (NOVO)
function setupEventListeners() {
    // Filtros
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchClient = document.getElementById('search-client');
    const filterPorte = document.getElementById('filter-porte');
    const filterStatus = document.getElementById('filter-status');
    
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (searchClient) searchClient.addEventListener('keyup', applyFilters);
    if (filterPorte) filterPorte.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    
    // Ações
    const addClientBtn = document.getElementById('add-client-btn');
    const optimizeRouteBtn = document.getElementById('optimize-route-btn');
    const selectClientsBtn = document.getElementById('select-clients-btn');
    
    if (addClientBtn) addClientBtn.addEventListener('click', openCreateModal);
    if (optimizeRouteBtn) optimizeRouteBtn.addEventListener('click', () => {
        const selectedClientsArray = Array.from(selectedClients).map(id => 
            filteredClients.find(c => c.id === id)
        ).filter(Boolean);
        
        if (typeof routeOptimizer !== 'undefined' && selectedClientsArray.length > 0) {
            routeOptimizer.optimizeRoute(selectedClientsArray);
        } else {
            showNotification('Selecione clientes no mapa primeiro', 'error');
        }
    });
    
    if (selectClientsBtn) selectClientsBtn.addEventListener('click', () => {
        isSelectingMode = !isSelectingMode;
        const btn = document.getElementById('select-clients-btn');
        if (isSelectingMode) {
            btn.textContent = '✅ Finalizar Seleção';
            btn.style.background = 'var(--secondary-color)';
            showNotification('Modo seleção ativado. Clique nos clientes no mapa para selecioná-los.', 'info');
        } else {
            btn.textContent = 'Selecionar Clientes para Rota';
            btn.style.background = '';
            showNotification('Modo seleção desativado.', 'info');
        }
    });
}

// 13. Função de Inicialização (VERSÃO SIMPLIFICADA)
async function initDashboard() {
    try {
        console.log('🚀 Iniciando dashboard...');
        
        // VERIFICAR AUTENTICAÇÃO PRIMEIRO
        if (!checkAuth()) return;
        
        // AGUARDAR para auth carregar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // SINCRONIZAR API COM AUTH
        if (typeof clientAPI !== 'undefined') {
            await clientAPI.updateCurrentUser();
        }
        
        // CARREGAR DADOS PRINCIPAIS
        await loadClients();
        await initCalendar();
        initMap();
        setupEventListeners();
        
        // GESTÃO DE USUÁRIOS (se disponível)
        setTimeout(() => {
            if (typeof authService !== 'undefined' && authService.isAdmin && 
                typeof initUserManagement !== 'undefined') {
                if (authService.isAdmin()) {
                    initUserManagement();
                }
            }
        }, 2000);
        
        console.log('✅ Dashboard inicializado com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro na inicialização do dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

// Inicia o dashboard quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', initDashboard);

// =============================================
// TORNE AS FUNÇÕES GLOBAIS (ADICIONADO)
// =============================================
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.selectClientForRoute = selectClientForRoute;
window.formatarParaMoeda = formatarParaMoeda;
window.prepararParaBancoDeDados = prepararParaBancoDeDados;