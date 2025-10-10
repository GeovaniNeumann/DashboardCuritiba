// Arquivo: js/main.js

console.log('🚀 main.js iniciando...');

// Variáveis globais
let filteredClients = [];
let porteChartInstance = null;
let revenueChartInstance = null;
let calendarInstance = null;
let mapInstance = null;

// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

// 1. KPIs
function updateKPIs(clients) {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.revenue_ytd, 0);
    const avgFrequency = totalClients > 0 ? 
        (clients.reduce((sum, c) => sum + c.frequency_days, 0) / totalClients).toFixed(0) : 0;

    document.getElementById('kpi-total-clients').textContent = totalClients;
    document.getElementById('kpi-active-clients').textContent = activeClients;
    document.getElementById('kpi-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpi-avg-frequency').textContent = `${avgFrequency} dias`;
}

// 2. Tabela
function renderClientTable(clients) {
    const tbody = document.getElementById('client-table-body');
    tbody.innerHTML = '';

    clients.forEach(client => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = client.name;
        row.insertCell().textContent = client.porte;
        
        const statusCell = row.insertCell();
        statusCell.textContent = client.status;
        statusCell.classList.add(client.status === 'Ativo' ? 'status-ativo' : 'status-inativo');
        
        row.insertCell().textContent = formatCurrency(client.revenue_ytd);
        row.insertCell().textContent = new Date(client.last_service).toLocaleDateString('pt-BR');
        row.insertCell().textContent = new Date(client.next_contact).toLocaleDateString('pt-BR');
        
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

// 3. Gráficos
function updateCharts(clients) {
    const porteCounts = { Grande: 0, Médio: 0, Pequeno: 0 };
    const porteRevenue = { Grande: 0, Médio: 0, Pequeno: 0 };

    clients.forEach(client => {
        porteCounts[client.porte]++;
        porteRevenue[client.porte] += client.revenue_ytd;
    });

    const labels = ['Grande', 'Médio', 'Pequeno'];
    const colors = ['#dc3545', '#ffc107', '#17a2b8'];

    // Gráfico de Pizza
    if (porteChartInstance) porteChartInstance.destroy();
    const ctxPorte = document.getElementById('porteChart').getContext('2d');
    porteChartInstance = new Chart(ctxPorte, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: labels.map(label => porteCounts[label]),
                backgroundColor: colors
            }]
        },
        options: { responsive: true }
    });

    // Gráfico de Barras
    if (revenueChartInstance) revenueChartInstance.destroy();
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento YTD',
                data: labels.map(label => porteRevenue[label]),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => formatCurrency(value) }
                }
            }
        }
    });
}

// 4. Calendário
async function initCalendar() {
    try {
        const events = await clientAPI.getEvents();
        const calendarEl = document.getElementById('calendar');
        
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            events: events
        });
        calendarInstance.render();
        console.log('✅ Calendário inicializado');
    } catch (error) {
        console.error('❌ Erro no calendário:', error);
    }
}

// 5. Mapa
function initMap() {
    mapInstance = L.map('map').setView(CURITIBA_CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapInstance);
    updateMap(filteredClients);
}

function updateMap(clients) {
    // Limpa marcadores
    mapInstance.eachLayer(layer => {
        if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
    });

    clients.forEach(client => {
        const color = client.porte === 'Grande' ? 'red' : 
                     client.porte === 'Médio' ? 'orange' : 'blue';
        
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
            iconSize: [12, 12]
        });

        L.marker([client.lat, client.lng], { icon: icon })
            .addTo(mapInstance)
            .bindPopup(`<b>${client.name}</b><br>${client.porte}`);
    });
}

// 6. CRUD
async function loadClients() {
    try {
        console.log('📥 Carregando clientes...');
        const clients = await clientAPI.getClients();
        filteredClients = clients;
        updateAllViews();
        showNotification(`✅ ${clients.length} clientes carregados`, 'success');
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        showNotification('❌ Erro ao carregar clientes', 'error');
    }
}

async function updateClient(clientId, updates) {
    try {
        await clientAPI.updateClient(clientId, updates);
        await loadClients();
    } catch (error) {
        showNotification('❌ Erro ao atualizar cliente', 'error');
    }
}

async function createClient(clientData) {
    try {
        await clientAPI.createClient(clientData);
        await loadClients();
        showNotification('✅ Cliente criado!', 'success');
    } catch (error) {
        showNotification('❌ Erro ao criar cliente', 'error');
    }
}

async function deleteClient(clientId) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            await clientAPI.deleteClient(clientId);
            await loadClients();
            showNotification('✅ Cliente excluído!', 'success');
        } catch (error) {
            showNotification('❌ Erro ao excluir cliente', 'error');
        }
    }
}

// 7. Modais
function openEditModal(client) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Editar ${client.name}</h3>
            <form id="edit-form">
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo" ${client.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${client.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Próximo Contato:</label>
                    <input type="date" name="next_contact" value="${client.next_contact}" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await updateClient(client.id, {
            status: formData.get('status'),
            next_contact: formData.get('next_contact')
        });
        closeModal();
    });

    document.body.appendChild(modal);
}

function openCreateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Novo Cliente</h3>
            <form id="create-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>Porte:</label>
                    <select name="porte">
                        <option value="Pequeno">Pequeno</option>
                        <option value="Médio">Médio</option>
                        <option value="Grande">Grande</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Criar</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await createClient({
            name: formData.get('name'),
            porte: formData.get('porte'),
            status: 'Ativo',
            revenue_ytd: 0,
            frequency_days: 30,
            last_service: new Date().toISOString().split('T')[0],
            next_contact: new Date().toISOString().split('T')[0],
            address: 'Endereço a definir',
            email: '',
            phone: ''
        });
        closeModal();
    });

    document.body.appendChild(modal);
}

// 8. Filtros
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

// 9. Atualização geral
function updateAllViews() {
    updateKPIs(filteredClients);
    renderClientTable(filteredClients);
    updateCharts(filteredClients);
    updateMap(filteredClients);
}

// 10. Inicialização
async function initDashboard() {
    console.log('🎯 Inicializando dashboard...');
    
    try {
        await loadClients();
        await initCalendar();
        initMap();
        
        // Event listeners
        document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
        document.getElementById('search-client').addEventListener('keyup', applyFilters);
        document.getElementById('add-client-btn').addEventListener('click', openCreateModal);
        
        console.log('✅ Dashboard inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
}

// Inicia quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}