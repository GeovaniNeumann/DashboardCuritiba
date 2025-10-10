// Arquivo: dashboard/js/main.js (Atualizado com todas as funcionalidades)

// Variáveis globais
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

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Função para fechar modais
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

// 1. Cálculo e Exibição dos KPIs
function updateKPIs(clients) {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.revenue_ytd, 0);
    const totalFrequency = clients.reduce((sum, c) => sum + c.frequency_days, 0);
    const avgFrequency = totalClients > 0 ? (totalFrequency / totalClients).toFixed(0) : 0;

    document.getElementById('kpi-total-clients').textContent = totalClients;
    document.getElementById('kpi-active-clients').textContent = activeClients;
    document.getElementById('kpi-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpi-avg-frequency').textContent = `${avgFrequency} dias`;
}

// 2. Renderização da Tabela de Clientes
function renderClientTable(clients) {
    const tbody = document.getElementById('client-table-body');
    tbody.innerHTML = '';

    clients.forEach(client => {
        const row = tbody.insertRow();
        
        // Nome
        row.insertCell().textContent = client.name;
        
        // Porte
        row.insertCell().textContent = client.porte;
        
        // Status
        const statusCell = row.insertCell();
        statusCell.textContent = client.status;
        statusCell.classList.add(client.status === 'Ativo' ? 'status-ativo' : 'status-inativo');
        
        // Faturamento YTD
        row.insertCell().textContent = formatCurrency(client.revenue_ytd);
        
        // Último Serviço
        row.insertCell().textContent = new Date(client.last_service).toLocaleDateString('pt-BR');
        
        // Próximo Contato
        row.insertCell().textContent = new Date(client.next_contact).toLocaleDateString('pt-BR');
        
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

// 3. Lógica de Gráficos (Chart.js)
function prepareChartData(clients) {
    const porteCounts = { Grande: 0, Médio: 0, Pequeno: 0 };
    const porteRevenue = { Grande: 0, Médio: 0, Pequeno: 0 };

    clients.forEach(client => {
        porteCounts[client.porte]++;
        porteRevenue[client.porte] += client.revenue_ytd;
    });

    return { porteCounts, porteRevenue };
}

function updateCharts(clients) {
    const { porteCounts, porteRevenue } = prepareChartData(clients);
    const labels = ['Grande', 'Médio', 'Pequeno'];
    const colors = ['#dc3545', '#ffc107', '#17a2b8'];

    // Gráfico de Distribuição por Porte (Pizza)
    const porteData = labels.map(label => porteCounts[label]);
    if (porteChartInstance) {
        porteChartInstance.data.datasets[0].data = porteData;
        porteChartInstance.update();
    } else {
        const ctxPorte = document.getElementById('porteChart').getContext('2d');
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
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Faturamento por Porte (Barra)
    const revenueData = labels.map(label => porteRevenue[label]);
    if (revenueChartInstance) {
        revenueChartInstance.data.datasets[0].data = revenueData;
        revenueChartInstance.update();
    } else {
        const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
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
                    legend: { display: false },
                    tooltip: { 
                        callbacks: { 
                            label: (context) => formatCurrency(context.parsed.y) 
                        } 
                    }
                }
            }
        });
    }
}

// 4. Lógica do Calendário (FullCalendar)
async function initCalendar() {
    const events = await clientAPI.getEvents();
    const calendarEl = document.getElementById('calendar');
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventClick: function(info) {
            const clientId = info.event.extendedProps.clientId;
            const client = filteredClients.find(c => c.id === clientId);
            if (client) {
                openEditModal(client);
            }
        },
        eventDidMount: function(info) {
            // Adiciona um tooltip simples para melhor visualização
            info.el.title = info.event.title + ' em ' + info.event.start.toLocaleDateString('pt-BR');
        }
    });
    calendarInstance.render();
}

// 5. Lógica do Mapa (Leaflet.js)
function initMap() {
    mapInstance = L.map('map').setView(CURITIBA_CENTER, 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    updateMap(filteredClients);
}

function updateMap(clients) {
    // Remove marcadores antigos
    mapInstance.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            mapInstance.removeLayer(layer);
        }
    });

    clients.forEach(client => {
        let color;
        switch (client.porte) {
            case 'Grande': color = 'red'; break;
            case 'Médio': color = 'orange'; break;
            case 'Pequeno': color = 'blue'; break;
            default: color = 'gray';
        }

        // Ícone personalizado
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
                Faturamento: ${formatCurrency(client.revenue_ytd)}<br>
                Status: ${client.status}<br>
                <button onclick="selectClientForRoute(${client.id})" class="btn-edit" style="margin-top: 5px;">
                    ${selectedClients.has(client.id) ? '❌ Remover' : '📍 Selecionar'}
                </button>
            `);

        // Marcar como selecionado se estiver na lista
        if (selectedClients.has(client.id)) {
            marker.getElement().classList.add('selected');
        }
    });
}

// 6. Sistema de CRUD
async function loadClients() {
    try {
        const clients = await clientAPI.getClients();
        filteredClients = clients;
        updateAllViews();
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
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

// 7. Modais de Edição/Criação
function openEditModal(client) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Cliente: ${client.name}</h3>
            <form id="edit-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" value="${client.name}" required>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" name="cnpj" value="${client.cnpj}" required>
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
                    <input type="number" name="revenue_ytd" value="${client.revenue_ytd}" required>
                </div>
                <div class="form-group">
                    <label>Frequência (dias):</label>
                    <input type="number" name="frequency_days" value="${client.frequency_days}" required>
                </div>
                <div class="form-group">
                    <label>Último Serviço:</label>
                    <input type="date" name="last_service" value="${client.last_service}" required>
                </div>
                <div class="form-group">
                    <label>Próximo Contato:</label>
                    <input type="date" name="next_contact" value="${client.next_contact}" required>
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <textarea name="address" required>${client.address}</textarea>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${client.email}">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="tel" name="phone" value="${client.phone}">
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
            revenue_ytd: parseInt(formData.get('revenue_ytd')),
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
                    <input type="number" name="revenue_ytd" required>
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
                    <button type="submit" class="btn-primary">Criar Cliente</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const clientData = {
            name: formData.get('name'),
            cnpj: formData.get('cnpj'),
            porte: formData.get('porte'),
            status: formData.get('status'),
            revenue_ytd: parseInt(formData.get('revenue_ytd')),
            frequency_days: parseInt(formData.get('frequency_days')),
            last_service: formData.get('last_service'),
            next_contact: formData.get('next_contact'),
            address: formData.get('address'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };
        
        await createClient(clientData);
        closeModal();
    });

    document.body.appendChild(modal);
}

// 8. Sistema de Seleção para Rota
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

function clearSelectedClients() {
    selectedClients.clear();
    updateSelectedClientsDisplay();
    updateMap(filteredClients);
}

// 9. Função de Filtro
function applyFilters() {
    const search = document.getElementById('search-client').value.toLowerCase();
    const porte = document.getElementById('filter-porte').value;
    const status = document.getElementById('filter-status').value;

    filteredClients = CLIENTS_DATA.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(search) || client.cnpj.includes(search);
        const matchesPorte = porte === 'todos' || client.porte === porte;
        const matchesStatus = status === 'todos' || client.status === status;

        return matchesSearch && matchesPorte && matchesStatus;
    });

    updateAllViews();
}

// 10. Atualização de todas as visualizações
function updateAllViews() {
    updateKPIs(filteredClients);
    renderClientTable(filteredClients);
    updateCharts(filteredClients);
    updateMap(filteredClients);
    updateSelectedClientsDisplay();
}

// 11. Função de Inicialização
async function initDashboard() {
    await loadClients();
    await initCalendar();
    initMap();
    
    // Adiciona listeners para os filtros
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('search-client').addEventListener('keyup', applyFilters);
    document.getElementById('filter-porte').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    
    // Adiciona listeners para ações
    document.getElementById('add-client-btn').addEventListener('click', openCreateModal);
    document.getElementById('optimize-route-btn').addEventListener('click', () => {
        const selectedClientsArray = Array.from(selectedClients).map(id => 
            filteredClients.find(c => c.id === id)
        ).filter(Boolean);
        
        routeOptimizer.optimizeRoute(selectedClientsArray);
    });
    
    document.getElementById('select-clients-btn').addEventListener('click', () => {
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

// Inicia o dashboard quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', initDashboard);