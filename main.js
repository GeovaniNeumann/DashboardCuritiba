// =============================================
// VARIÁVEIS GLOBAIS
// =============================================
let allClients = []; // Lista completa de clientes
let filteredClients = []; // Clientes filtrados
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
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#17a2b8';
    }
    
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

/**
 * Formata número decimal para moeda brasileira
 * @param {number} valorReais - Valor em reais (ex: 40000.00)
 * @returns {string} Valor formatado (ex: "R$ 40.000,00")
 */
function formatarParaMoeda(valorReais) {
    return valorReais.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// FUNÇÕES CORRIGIDAS - COPIE ESTA VERSÃO

/**
 * Formata número decimal para moeda brasileira
 * @param {number} valorReais - Valor em reais (ex: 35000.00)
 * @returns {string} Valor formatado (ex: "R$ 35.000,00")
 */
function formatarParaMoeda(valorReais) {
    return valorReais.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Converte string de moeda para número decimal (CORRIGIDA)
 * @param {string} valorString - String no formato "35.000,00"
 * @returns {number} Valor em reais (ex: 35000.00)
 */
/**
 * Versão SUPER SIMPLES - sempre funciona
 */
function prepararParaBancoDeDados(valorString) {
    if (!valorString) return 0;
    
    // Remove tudo que não é número, mantém apenas dígitos
    const apenasNumeros = valorString.replace(/\D/g, '');
    
    // Se não tem números, retorna 0
    if (apenasNumeros === '') return 0;
    
    // Pega os últimos 2 dígitos como centavos
    const centavos = apenasNumeros.slice(-2);
    const reais = apenasNumeros.slice(0, -2) || '0';
    
    // Combina e converte para número
    const numero = parseFloat(`${reais}.${centavos}`);
    
    return isNaN(numero) ? 0 : numero;
}

/**
 * Aplica máscara de moeda em input (CORRIGIDA)
 * @param {HTMLInputElement} input - Elemento input
 */
function aplicarMascaraMoeda(input) {
    input.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/\D/g, '');
        
        if (valor === '') {
            e.target.value = '0,00';
            return;
        }
        
        // Garante pelo menos 3 dígitos para ter centavos
        valor = valor.padStart(3, '0');
        
        const centavos = valor.slice(-2);
        let reais = valor.slice(0, -2);
        
        // Se não há reais, define como "0"
        if (reais === '') {
            reais = '0';
        }
        
        // Formata reais com separadores de milhar
        const reaisFormatados = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        e.target.value = `${reaisFormatados},${centavos}`;
    });
    
    // Dispara o evento input para formatar o valor inicial
    input.dispatchEvent(new Event('input'));
}

// =============================================
// FUNÇÕES DE GEOCODING (NOVAS)
// =============================================

/**
 * Geocodifica um endereço para obter coordenadas (lat, lng)
 * @param {string} endereco - Endereço completo
 * @returns {Promise<{lat: number, lng: number, endereco_formatado: string}>}
 */
async function geocodificarEndereco(endereco) {
    if (!endereco || endereco.trim() === '') {
        console.warn('⚠️ Endereço vazio para geocodificação');
        return null;
    }

    try {
        console.log(`🗺️ Geocodificando endereço: ${endereco}`);
        
        // Usando Nominatim (OpenStreetMap) - gratuito e não requer API key
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&countrycodes=br`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const resultado = data[0];
            const coordenadas = {
                lat: parseFloat(resultado.lat),
                lng: parseFloat(resultado.lon),
                endereco_formatado: resultado.display_name
            };
            
            console.log('✅ Endereço geocodificado:', coordenadas);
            return coordenadas;
        } else {
            console.warn('❌ Endereço não encontrado:', endereco);
            return null;
        }
    } catch (error) {
        console.error('💥 Erro na geocodificação:', error);
        return null;
    }
}

/**
 * Busca coordenadas para um cliente e atualiza no banco
 * @param {Object} client - Cliente
 * @param {string} novoEndereco - Novo endereço (opcional)
 */
async function atualizarCoordenadasCliente(client, novoEndereco = null) {
    const endereco = novoEndereco || client.address;
    
    if (!endereco) {
        console.warn('⚠️ Cliente sem endereço para geocodificação:', client.name);
        return;
    }

    try {
        showNotification(`Buscando localização para ${client.name}...`, 'info');
        
        const coordenadas = await geocodificarEndereco(endereco);
        
        if (coordenadas) {
            // Atualiza o cliente com as novas coordenadas
            const updates = {
                lat: coordenadas.lat,
                lng: coordenadas.lng,
                address: coordenadas.endereco_formatado // Atualiza com endereço formatado
            };
            
            await clientAPI.updateClient(client.id, updates);
            showNotification(`Localização de ${client.name} atualizada com sucesso!`, 'success');
            
            // Recarrega os clientes para atualizar as visualizações
            await loadClients();
        } else {
            showNotification(`Não foi possível encontrar a localização de ${client.name}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar coordenadas:', error);
        showNotification('Erro ao buscar localização', 'error');
    }
}

/**
 * Busca coordenadas para todos os clientes sem localização
 */
async function geocodificarClientesSemCoordenadas() {
    const clientesSemCoordenadas = allClients.filter(client => 
        !client.lat || !client.lng
    );
    
    if (clientesSemCoordenadas.length === 0) {
        showNotification('Todos os clientes já têm coordenadas!', 'info');
        return;
    }
    
    showNotification(`Buscando localização para ${clientesSemCoordenadas.length} clientes...`, 'info');
    
    for (const client of clientesSemCoordenadas) {
        if (client.address) {
            await atualizarCoordenadasCliente(client);
            // Aguarda 1 segundo entre requisições para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    showNotification('Geocodificação de clientes concluída!', 'success');
}

// =============================================
// FUNÇÕES PRINCIPAIS DO DASHBOARD
// =============================================

// Verificação de autenticação
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Função para configurar o botão de logout
function setupLogoutButton() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const existingBtn = document.getElementById('logout-btn');
    if (existingBtn) existingBtn.remove();
    
    let headerContainer = header.querySelector('div');
    if (!headerContainer || headerContainer.style.display !== 'flex') {
        headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.width = '100%';
        
        while (header.firstChild) {
            headerContainer.appendChild(header.firstChild);
        }
        header.appendChild(headerContainer);
    }
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Sair';
    logoutBtn.className = 'btn-secondary';
    logoutBtn.style.marginLeft = 'auto';
    logoutBtn.style.marginRight = '1rem';
    
    logoutBtn.addEventListener('click', function() {
        console.log('🔒 Tentando fazer logout...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        window.location.href = 'login.html';
    });
    
    headerContainer.appendChild(logoutBtn);
    console.log('✅ Botão de logout configurado');
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

// 2. Renderização da Tabela de Clientes
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
        cell.colSpan = 8; // Aumentado para 8 colunas
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
        statusCell.className = client.status === 'Ativo' ? 'status-ativo' : 'status-inativo';
        
        // Faturamento YTD
        const revenueCell = row.insertCell();
        revenueCell.textContent = formatCurrency(client.revenue_ytd || 0);
        
        // Localização
        const locationCell = row.insertCell();
        if (client.lat && client.lng) {
            locationCell.innerHTML = '📍<span style="color: green; margin-left: 5px;">✓</span>';
            locationCell.title = 'Localização disponível';
        } else {
            locationCell.innerHTML = '❌<span style="color: red; margin-left: 5px;">Sem localização</span>';
            locationCell.title = 'Clique para buscar localização';
            locationCell.style.cursor = 'pointer';
            locationCell.onclick = () => atualizarCoordenadasCliente(client);
        }
        
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
        actionsCell.style.whiteSpace = 'nowrap';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️ Editar';
        editBtn.className = 'btn-edit';
        editBtn.style.marginRight = '5px';
        editBtn.style.padding = '6px 12px';
        editBtn.style.fontSize = '12px';
        editBtn.style.minWidth = '80px';
        editBtn.onclick = () => openEditModal(client);
        
        const locationBtn = document.createElement('button');
        locationBtn.textContent = '🗺️ Localizar';
        locationBtn.className = 'btn-primary';
        locationBtn.style.marginRight = '5px';
        locationBtn.style.padding = '6px 12px';
        locationBtn.style.fontSize = '12px';
        locationBtn.style.minWidth = '80px';
        locationBtn.onclick = () => atualizarCoordenadasCliente(client);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Excluir';
        deleteBtn.className = 'btn-delete';
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.minWidth = '80px';
        deleteBtn.onclick = () => deleteClient(client.id);
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(locationBtn);
        actionsCell.appendChild(deleteBtn);
    });
}

// 3. Lógica de Gráficos (Chart.js)
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

// 4. Lógica do Calendário (FullCalendar)
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

// 5. Lógica do Mapa (Leaflet.js) - ATUALIZADA
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

        // Adicionar controle de busca
        const searchControl = L.control({
            position: 'topright'
        });
        
        searchControl.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'search-control');
            div.innerHTML = `
                <input type="text" id="map-search" placeholder="Buscar endereço..." 
                       style="padding: 8px; width: 200px; border: 1px solid #ccc; border-radius: 4px;">
                <button onclick="buscarEnderecoNoMapa()" 
                        style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    Buscar
                </button>
            `;
            return div;
        };
        
        searchControl.addTo(mapInstance);

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

    let bounds = L.latLngBounds();

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
                <div style="min-width: 200px;">
                    <b>${client.name}</b><br>
                    <small>${client.address || 'Endereço não disponível'}</small><br>
                    Porte: ${client.porte}<br>
                    Faturamento: ${formatCurrency(client.revenue_ytd || 0)}<br>
                    Status: ${client.status}<br>
                    <div style="margin-top: 8px;">
                        <button onclick="openEditModal(${JSON.stringify(client).replace(/"/g, '&quot;')})" class="btn-edit" style="margin-right: 5px; padding: 6px 12px; font-size: 12px; min-width: 80px;">
                            ✏️ Editar
                        </button>
                        <button onclick="selectClientForRoute(${client.id})" class="btn-primary" style="padding: 6px 12px; font-size: 12px; min-width: 80px;">
                            ${selectedClients.has(client.id) ? '❌ Remover' : '📍 Selecionar'}
                        </button>
                    </div>
                </div>
            `);

        // Adiciona às bounds para ajustar o zoom
        bounds.extend([client.lat, client.lng]);

        if (selectedClients.has(client.id)) {
            marker.getElement().classList.add('selected');
        }
    });

    // Ajusta o zoom para mostrar todos os marcadores (se houver)
    if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [20, 20] });
    }
}

// Função para buscar endereço no mapa
async function buscarEnderecoNoMapa() {
    const searchInput = document.getElementById('map-search');
    const endereco = searchInput.value.trim();
    
    if (!endereco) {
        showNotification('Digite um endereço para buscar', 'error');
        return;
    }

    try {
        showNotification('Buscando endereço...', 'info');
        
        const coordenadas = await geocodificarEndereco(endereco);
        
        if (coordenadas) {
            mapInstance.setView([coordenadas.lat, coordenadas.lng], 15);
            
            // Adiciona marcador no local encontrado
            L.marker([coordenadas.lat, coordenadas.lng])
                .addTo(mapInstance)
                .bindPopup(`<b>Local encontrado:</b><br>${coordenadas.endereco_formatado}`)
                .openPopup();
                
            showNotification('Endereço encontrado!', 'success');
        } else {
            showNotification('Endereço não encontrado', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        showNotification('Erro ao buscar endereço', 'error');
    }
}

// 6. Sistema de CRUD
async function loadClients() {
    try {
        console.log('🔄 Carregando clientes...');
        showNotification('Carregando clientes...', 'info');
        
        if (!clientAPI.currentUser) {
            console.log('🔄 Sincronizando API com auth...');
            await clientAPI.updateCurrentUser();
        }
        
        const clients = await clientAPI.getClients();
        console.log('📊 Clientes recebidos:', clients);
        
        allClients = [...clients];
        filteredClients = [...clients];
        
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
        allClients = [];
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
        // Se tem endereço, busca coordenadas antes de criar
        if (clientData.address) {
            showNotification('Buscando localização do cliente...', 'info');
            const coordenadas = await geocodificarEndereco(clientData.address);
            
            if (coordenadas) {
                clientData.lat = coordenadas.lat;
                clientData.lng = coordenadas.lng;
                clientData.address = coordenadas.endereco_formatado; // Usa endereço formatado
            }
        }
        
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

// 7. Modais de Cliente (ATUALIZADOS COM GEOCODING E BOTÕES PADRONIZADOS)
function openCreateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>➕ Adicionar Novo Cliente</h3>
            <form id="client-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" name="cnpj">
                </div>
                <div class="form-group">
                    <label>Porte:</label>
                    <select name="porte">
                        <option value="Pequeno">Pequeno</option>
                        <option value="Médio">Médio</option>
                        <option value="Grande">Grande</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Faturamento YTD (R$):</label>
                    <input type="text" name="revenue_ytd" class="currency-input" value="0,00" style="text-align: left;">
                </div>
                <div class="form-group">
                    <label>Frequência de Contato (dias):</label>
                    <input type="number" name="frequency_days" value="30" required>
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <input type="text" name="address" placeholder="Digite o endereço completo para localização no mapa">
                    <small style="color: #666; font-size: 0.8rem;">O sistema buscará automaticamente as coordenadas no mapa</small>
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="text" name="phone">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
                <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="padding: 10px 20px; min-width: 100px;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; min-width: 100px;">Criar Cliente</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const clientData = {
            name: formData.get('name'),
            cnpj: formData.get('cnpj'),
            porte: formData.get('porte'),
            revenue_ytd: prepararParaBancoDeDados(formData.get('revenue_ytd')),
            frequency_days: parseInt(formData.get('frequency_days')),
            address: formData.get('address'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            status: formData.get('status'),
            last_service: new Date().toISOString().split('T')[0],
            next_contact: new Date(Date.now() + parseInt(formData.get('frequency_days')) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        try {
            await createClient(clientData);
            closeModal();
        } catch (error) {
            showNotification('Erro ao criar cliente: ' + error.message, 'error');
        }
    });

    document.body.appendChild(modal);
    
    // Inicializar máscara de moeda
    const currencyInput = modal.querySelector('.currency-input');
    if (currencyInput) {
        aplicarMascaraMoeda(currencyInput);
        
        // CORREÇÃO: Cursor no início
        setTimeout(() => {
            currencyInput.setSelectionRange(0, 0);
            currencyInput.focus();
        }, 100);
    }
}

function openEditModal(client) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // CORREÇÃO: Formatar corretamente o valor do faturamento
    const revenueValue = client.revenue_ytd || 0;
    const formattedRevenue = formatarParaMoeda(revenueValue).replace('R$', '').trim();
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Cliente: ${client.name}</h3>
            <form id="client-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" value="${client.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" name="cnpj" value="${client.cnpj || ''}">
                </div>
                <div class="form-group">
                    <label>Porte:</label>
                    <select name="porte">
                        <option value="Pequeno" ${client.porte === 'Pequeno' ? 'selected' : ''}>Pequeno</option>
                        <option value="Médio" ${client.porte === 'Médio' ? 'selected' : ''}>Médio</option>
                        <option value="Grande" ${client.porte === 'Grande' ? 'selected' : ''}>Grande</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Faturamento YTD (R$):</label>
                    <input type="text" name="revenue_ytd" class="currency-input" value="${formattedRevenue}" style="text-align: left;">
                </div>
                <div class="form-group">
                    <label>Frequência de Contato (dias):</label>
                    <input type="number" name="frequency_days" value="${client.frequency_days || 30}" required>
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <input type="text" name="address" value="${client.address || ''}" placeholder="Digite o endereço completo para atualizar a localização">
                    <small style="color: #666; font-size: 0.8rem;">Atualize o endereço para recalcular a localização no mapa</small>
                    ${client.lat && client.lng ? 
                        `<div style="color: green; margin-top: 5px;">
                            ✅ Localização atual: ${client.lat.toFixed(6)}, ${client.lng.toFixed(6)}
                        </div>` : 
                        `<div style="color: red; margin-top: 5px;">
                            ❌ Sem localização no mapa
                        </div>`
                    }
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" name="email" value="${client.email || ''}">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="text" name="phone" value="${client.phone || ''}">
                </div>
                <div class="form-group">
                    <label>Último Serviço:</label>
                    <input type="date" name="last_service" value="${client.last_service || ''}">
                </div>
                <div class="form-group">
                    <label>Próximo Contato:</label>
                    <input type="date" name="next_contact" value="${client.next_contact || ''}">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo" ${client.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${client.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="padding: 10px 20px; min-width: 100px;">Cancelar</button>
                    <button type="button" class="btn-primary" onclick="atualizarLocalizacaoCliente(this.form, ${client.id})" style="padding: 10px 20px; min-width: 140px; background: #17a2b8;">
                        🗺️ Atualizar Localização
                    </button>
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; min-width: 100px;">Atualizar Cliente</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const updates = {
            name: formData.get('name'),
            cnpj: formData.get('cnpj'),
            porte: formData.get('porte'),
            revenue_ytd: prepararParaBancoDeDados(formData.get('revenue_ytd')),
            frequency_days: parseInt(formData.get('frequency_days')),
            address: formData.get('address'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            last_service: formData.get('last_service'),
            next_contact: formData.get('next_contact'),
            status: formData.get('status')
        };

        try {
            await updateClient(client.id, updates);
            closeModal();
        } catch (error) {
            showNotification('Erro ao atualizar cliente: ' + error.message, 'error');
        }
    });

    document.body.appendChild(modal);
    
    // Inicializar máscara de moeda
    const currencyInput = modal.querySelector('.currency-input');
    if (currencyInput) {
        aplicarMascaraMoeda(currencyInput);
        
        // CORREÇÃO ADICIONAL: Garantir que o cursor fique no início
        setTimeout(() => {
            currencyInput.setSelectionRange(0, 0);
            currencyInput.focus();
        }, 100);
    }
}

// Função para atualizar localização a partir do modal
async function atualizarLocalizacaoCliente(form, clientId) {
    const formData = new FormData(form);
    const novoEndereco = formData.get('address');
    const client = allClients.find(c => c.id === clientId);
    
    if (client && novoEndereco) {
        await atualizarCoordenadasCliente(client, novoEndereco);
    } else {
        showNotification('Digite um endereço válido', 'error');
    }
}

// 8. Funções de Filtro e Busca (CORRIGIDAS)
function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    const searchTerm = document.getElementById('search-client')?.value.toLowerCase() || '';
    const porteFilter = document.getElementById('filter-porte')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    console.log('Filtros:', { searchTerm, porteFilter, statusFilter });

    filteredClients = allClients.filter(client => {
        const matchesSearch = !searchTerm || 
            (client.name && client.name.toLowerCase().includes(searchTerm)) ||
            (client.cnpj && client.cnpj.includes(searchTerm)) ||
            (client.email && client.email.toLowerCase().includes(searchTerm)) ||
            (client.address && client.address.toLowerCase().includes(searchTerm));
        
        const matchesPorte = porteFilter === 'all' || client.porte === porteFilter;
        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

        return matchesSearch && matchesPorte && matchesStatus;
    });

    console.log(`📊 Filtro aplicado: ${filteredClients.length} de ${allClients.length} clientes`);
    updateAllViews();
}

function clearFilters() {
    console.log('🧹 Limpando filtros...');
    
    const searchInput = document.getElementById('search-client');
    const porteFilter = document.getElementById('filter-porte');
    const statusFilter = document.getElementById('filter-status');
    
    if (searchInput) searchInput.value = '';
    if (porteFilter) porteFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    
    applyFilters();
    showNotification('Filtros limpos com sucesso!', 'success');
}

// 9. Atualizar todas as visualizações
function updateAllViews() {
    console.log('🔄 Atualizando todas as visualizações...');
    updateKPIs(filteredClients);
    renderClientTable(filteredClients);
    updateCharts(filteredClients);
    updateMap(filteredClients);
}

// 10. Roteirização
function selectClientForRoute(clientId) {
    if (selectedClients.has(clientId)) {
        selectedClients.delete(clientId);
    } else {
        selectedClients.add(clientId);
    }
    
    updateMap(filteredClients);
    
    const selectClientsBtn = document.getElementById('select-clients-btn');
    if (selectClientsBtn) {
        selectClientsBtn.textContent = `Selecionar Clientes para Rota (${selectedClients.size})`;
        selectClientsBtn.style.padding = '10px 20px';
        selectClientsBtn.style.minWidth = '220px';
    }
}

// 11. Botão de Mock Data
function addMockDataButton() {
    const container = document.querySelector('.kpi-container');
    if (!container) return;
    
    const existingBtn = document.getElementById('mock-data-btn');
    if (existingBtn) return;
    
    const mockBtn = document.createElement('button');
    mockBtn.id = 'mock-data-btn';
    mockBtn.textContent = '➕ Adicionar Dados de Teste';
    mockBtn.className = 'btn-primary';
    mockBtn.style.marginTop = '1rem';
    mockBtn.style.width = '100%';
    mockBtn.style.padding = '12px 20px';
    
    mockBtn.addEventListener('click', async () => {
        try {
            await clientAPI.insertMockData(10);
            await loadClients();
            mockBtn.remove();
        } catch (error) {
            showNotification('Erro ao inserir dados mock: ' + error.message, 'error');
        }
    });
    
    container.appendChild(mockBtn);
}

// 12. Configuração de Event Listeners (CORRIGIDA)
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Filtros
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchClient = document.getElementById('search-client');
    const filterPorte = document.getElementById('filter-porte');
    const filterStatus = document.getElementById('filter-status');
    
    if (applyFiltersBtn) {
        console.log('✅ Botão aplicar filtros encontrado');
        applyFiltersBtn.style.padding = '10px 20px';
        applyFiltersBtn.style.minWidth = '120px';
        applyFiltersBtn.addEventListener('click', applyFilters);
    } else {
        console.error('❌ Botão aplicar filtros não encontrado');
    }
    
    if (searchClient) {
        console.log('✅ Campo de busca encontrado');
        searchClient.addEventListener('keyup', applyFilters);
    }
    
    if (filterPorte) {
        console.log('✅ Filtro de porte encontrado');
        filterPorte.addEventListener('change', applyFilters);
    }
    
    if (filterStatus) {
        console.log('✅ Filtro de status encontrado');
        filterStatus.addEventListener('change', applyFilters);
    }
    
    // Botão limpar filtros
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        console.log('✅ Botão limpar filtros encontrado');
        clearFiltersBtn.style.padding = '10px 20px';
        clearFiltersBtn.style.minWidth = '120px';
        clearFiltersBtn.addEventListener('click', clearFilters);
    } else {
        console.error('❌ Botão limpar filtros não encontrado');
    }
    
    // Ações
    const addClientBtn = document.getElementById('add-client-btn');
    const optimizeRouteBtn = document.getElementById('optimize-route-btn');
    const selectClientsBtn = document.getElementById('select-clients-btn');
    const geocodeAllBtn = document.getElementById('geocode-all-btn');
    
    if (addClientBtn) {
        console.log('✅ Botão adicionar cliente encontrado');
        addClientBtn.style.padding = '10px 20px';
        addClientBtn.style.minWidth = '140px';
        addClientBtn.addEventListener('click', openCreateModal);
    } else {
        console.error('❌ Botão adicionar cliente não encontrado');
    }
    
    if (optimizeRouteBtn) {
        console.log('✅ Botão otimizar rota encontrado');
        optimizeRouteBtn.style.padding = '10px 20px';
        optimizeRouteBtn.style.minWidth = '140px';
        optimizeRouteBtn.addEventListener('click', () => {
            const selectedClientsArray = Array.from(selectedClients).map(id => 
                filteredClients.find(c => c.id === id)
            ).filter(Boolean);
            
            if (typeof routeOptimizer !== 'undefined' && selectedClientsArray.length > 0) {
                routeOptimizer.optimizeRoute(selectedClientsArray);
            } else {
                showNotification('Selecione clientes no mapa primeiro', 'error');
            }
        });
    } else {
        console.error('❌ Botão otimizar rota não encontrado');
    }
    
    if (selectClientsBtn) {
        console.log('✅ Botão selecionar clientes encontrado');
        selectClientsBtn.style.padding = '10px 20px';
        selectClientsBtn.style.minWidth = '220px';
        selectClientsBtn.addEventListener('click', () => {
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
    } else {
        console.error('❌ Botão selecionar clientes não encontrado');
    }
    
    // Adicionar botão de geocodificação em massa se não existir
    if (!geocodeAllBtn) {
        const actionsContainer = document.querySelector('.actions');
        if (actionsContainer) {
            const newGeocodeBtn = document.createElement('button');
            newGeocodeBtn.id = 'geocode-all-btn';
            newGeocodeBtn.textContent = '🗺️ Buscar Todas Localizações';
            newGeocodeBtn.className = 'btn-primary';
            newGeocodeBtn.style.background = '#17a2b8';
            newGeocodeBtn.style.padding = '10px 20px';
            newGeocodeBtn.style.minWidth = '200px';
            newGeocodeBtn.addEventListener('click', geocodificarClientesSemCoordenadas);
            actionsContainer.appendChild(newGeocodeBtn);
        }
    }
    
    console.log('✅ Event listeners configurados com sucesso');
}

// Gestão de Usuários
function initUserManagement() {
    console.log('👥 Inicializando gestão de usuários...');
    
    const content = document.querySelector('.content');
    if (!content) return;
    
    if (document.querySelector('.user-management-section')) return;
    
    const userSection = document.createElement('div');
    userSection.className = 'user-management-section';
    userSection.style.cssText = `
        background-color: var(--card-background);
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        margin-top: 2rem;
    `;
    
    userSection.innerHTML = `
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="margin: 0;">👥 Gestão de Usuários</h2>
            <button class="btn-primary" id="add-user-btn" style="padding: 10px 20px; min-width: 160px;">+ Adicionar Usuário</button>
        </div>
        <div class="user-list">
            <table id="user-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; color: var(--text-light);">Nome</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; color: var(--text-light);">E-mail</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; color: var(--text-light);">Perfil</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; color: var(--text-light);">Status</th>
                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; color: var(--text-light);">Ações</th>
                    </tr>
                </thead>
                <tbody id="user-table-body">
                    <!-- Dados serão carregados aqui -->
                </tbody>
            </table>
        </div>
    `;

    content.appendChild(userSection);

    loadUsers();
    
    document.getElementById('add-user-btn').addEventListener('click', openAddUserModal);
    
    console.log('✅ Gestão de usuários inicializada');
}

async function loadUsers() {
    try {
        const demoUsers = [
            {
                id: 'mock-admin-id',
                name: 'Administrador',
                email: 'admin@admin.com',
                role: 'admin',
                status: 'Ativo',
                created_at: new Date().toISOString()
            },
            {
                id: 'mock-user-id',
                name: 'João Silva',
                email: 'joao@empresa.com',
                role: 'user',
                status: 'Ativo',
                created_at: new Date().toISOString()
            }
        ];
        
        renderUserTable(demoUsers);
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        const demoUsers = [
            {
                id: 'mock-admin-id',
                name: 'Administrador',
                email: 'admin@admin.com',
                role: 'admin',
                status: 'Ativo',
                created_at: new Date().toISOString()
            }
        ];
        renderUserTable(demoUsers);
    }
}

function renderUserTable(users) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (users.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'Nenhum usuário encontrado';
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem';
        cell.style.color = '#666';
        return;
    }

    users.forEach(user => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = user.name || 'N/A';
        row.insertCell().textContent = user.email;
        
        const roleCell = row.insertCell();
        roleCell.textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
        roleCell.className = user.role === 'admin' ? 'role-admin' : 'role-user';
        
        const statusCell = row.insertCell();
        statusCell.textContent = user.status || 'Ativo';
        statusCell.className = user.status === 'Ativo' ? 'status-ativo' : 'status-inativo';
        
        const actionsCell = row.insertCell();
        actionsCell.style.whiteSpace = 'nowrap';
        
        if (user.email !== 'admin@admin.com') {
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'btn-edit';
            editBtn.style.marginRight = '0.5rem';
            editBtn.style.padding = '6px 12px';
            editBtn.style.fontSize = '12px';
            editBtn.style.minWidth = '40px';
            editBtn.onclick = () => openEditUserModal(user);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.className = 'btn-delete';
            deleteBtn.style.padding = '6px 12px';
            deleteBtn.style.fontSize = '12px';
            deleteBtn.style.minWidth = '40px';
            deleteBtn.onclick = () => deleteUser(user.id);
            
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        } else {
            actionsCell.textContent = '-';
            actionsCell.style.color = '#666';
        }
    });
}

function openAddUserModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>➕ Adicionar Novo Usuário</h3>
            <form id="add-user-form">
                <div class="form-group">
                    <label>Nome completo:</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Senha:</label>
                    <input type="password" name="password" required minlength="6">
                    <small style="color: #666; font-size: 0.8rem;">Mínimo 6 caracteres</small>
                </div>
                <div class="form-group">
                    <label>Confirmar senha:</label>
                    <input type="password" name="confirmPassword" required>
                </div>
                <div class="form-group">
                    <label>Perfil:</label>
                    <select name="role">
                        <option value="user">Usuário</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
                <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="padding: 10px 20px; min-width: 100px;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; min-width: 100px;">Criar Usuário</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role'),
            status: formData.get('status')
        };

        if (userData.password !== userData.confirmPassword) {
            showNotification('As senhas não coincidem!', 'error');
            return;
        }

        if (userData.password.length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres!', 'error');
            return;
        }

        try {
            await createUser(userData);
            closeModal();
        } catch (error) {
            showNotification('Erro ao criar usuário: ' + error.message, 'error');
        }
    });

    document.body.appendChild(modal);
}

function openEditUserModal(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Usuário: ${user.name}</h3>
            <form id="edit-user-form">
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" name="name" value="${user.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" name="email" value="${user.email}" required>
                </div>
                <div class="form-group">
                    <label>Nova senha:</label>
                    <input type="password" name="password" placeholder="Deixe em branco para manter a atual">
                    <small style="color: #666; font-size: 0.8rem;">Mínimo 6 caracteres</small>
                </div>
                <div class="form-group">
                    <label>Confirmar nova senha:</label>
                    <input type="password" name="confirmPassword" placeholder="Deixe em branco para manter a atual">
                </div>
                <div class="form-group">
                    <label>Perfil:</label>
                    <select name="role">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuário</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Ativo" ${user.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${user.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="padding: 10px 20px; min-width: 100px;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; min-width: 100px;">Atualizar Usuário</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role'),
            status: formData.get('status')
        };

        if (userData.password && userData.password !== userData.confirmPassword) {
            showNotification('As senhas não coincidem!', 'error');
            return;
        }

        if (userData.password && userData.password.length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres!', 'error');
            return;
        }

        try {
            await updateUser(user.id, userData);
            closeModal();
        } catch (error) {
            showNotification('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    });

    document.body.appendChild(modal);
}

async function createUser(userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    name: userData.name,
                    role: userData.role
                }
            }
        });

        if (error) throw error;

        showNotification('Usuário criado com sucesso! (Verifique o e-mail para confirmação, se necessário)', 'success');
        await loadUsers();
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        throw new Error('Não foi possível criar o usuário: ' + error.message);
    }
}

async function updateUser(userId, userData) {
    try {
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: {
                name: userData.name,
                role: userData.role
            }
        });

        if (updateError) throw updateError;

        if (userData.password) {
            const { error: passwordError } = await supabase.auth.updateUser({
                password: userData.password
            });
            
            if (passwordError) throw passwordError;
        }

        showNotification('Usuário atualizado com sucesso!', 'success');
        await loadUsers();
        
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw new Error('Não foi possível atualizar o usuário: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação é irreversível e o usuário será removido do Supabase Auth.')) {
        try {
            showNotification('Usuário excluído da lista local. **A exclusão real no Supabase Auth requer uma função de backend (Edge Function) para ser segura.**', 'warning');
            await loadUsers();
            
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            showNotification('Erro ao excluir usuário', 'error');
        }
    }
}

// Adicionar ao main.js existente - NOVAS FUNCIONALIDADES

// Função para registrar visita rápida
function openQuickVisitModal(client) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>📝 Registrar Visita - ${client.name}</h3>
            <form id="quick-visit-form">
                <div class="form-group">
                    <label>Promotor:</label>
                    <select name="promotor_id" required>
                        ${visitsManager.promotors
                            .filter(p => p.role === 'promotor' && p.status === 'Ativo')
                            .map(p => `<option value="${p.id}">${p.name}</option>`)
                            .join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Data da Visita:</label>
                    <input type="date" name="visit_date" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Duração (minutos):</label>
                    <input type="number" name="duration" value="60" min="15" max="480">
                </div>
                <div class="form-group">
                    <label>Objetivo:</label>
                    <select name="purpose">
                        <option value="Visita comercial">Visita comercial</option>
                        <option value="Apresentação de produto">Apresentação de produto</option>
                        <option value="Negociação de contrato">Negociação de contrato</option>
                        <option value="Pós-venda">Pós-venda</option>
                        <option value="Coleta de amostras">Coleta de amostras</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Observações:</label>
                    <textarea name="observations" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">✅ Registrar Visita</button>
                </div>
            </form>
        </div>
    `;

    modal.querySelector('#quick-visit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const visitData = {
            client_id: client.id,
            client_name: client.name,
            promotor_id: parseInt(formData.get('promotor_id')),
            promotor_name: visitsManager.promotors.find(p => p.id == formData.get('promotor_id')).name,
            visit_date: formData.get('visit_date'),
            duration: parseInt(formData.get('duration')),
            purpose: formData.get('purpose'),
            observations: formData.get('observations')
        };

        try {
            await visitsManager.registerVisit(visitData);
            showNotification('Visita registrada com sucesso!', 'success');
            closeModal();
        } catch (error) {
            showNotification('Erro ao registrar visita: ' + error.message, 'error');
        }
    });

    document.body.appendChild(modal);
}

// Adicionar botão de visita rápida na tabela de clientes
function enhanceClientTable() {
    // Modificar a renderização da tabela para incluir botão de visita
    // Esta função será chamada dentro do renderClientTable
}

// Adicionar link para relatórios no menu
function addReportsLink() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const reportsLink = document.createElement('div');
        reportsLink.className = 'action-group';
        reportsLink.innerHTML = `
            <h3>📊 Relatórios</h3>
            <button class="btn-secondary" onclick="window.open('reports.html', '_blank')" 
                    style="width: 100%; margin-bottom: 0.5rem; padding: 10px 20px;">
                📈 Relatórios Gerenciais
            </button>
            <button class="btn-secondary" onclick="openVisitsReport()" 
                    style="width: 100%; padding: 10px 20px;">
                👥 Relatório de Visitas
            </button>
        `;
        sidebar.appendChild(reportsLink);
    }
}

// Inicializar sistema de visitas
document.addEventListener('DOMContentLoaded', async () => {
    await visitsManager.loadInitialData();
    addReportsLink();
    enhanceClientTable();
});

// 13. Função de Inicialização
async function initDashboard() {
    try {
        console.log('🚀 Iniciando dashboard...');
        
        if (!checkAuth()) return;
        
        setupLogoutButton();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (typeof clientAPI !== 'undefined') {
            await clientAPI.updateCurrentUser();
        }
        
        await loadClients();
        await initCalendar();
        initMap();
        setupEventListeners();
        
        setTimeout(() => {
            const isAdmin = localStorage.getItem('user_role') === 'admin';
            console.log('👤 Verificando permissões admin:', isAdmin);
            
            if (isAdmin) {
                console.log('🎯 Usuário é admin, ativando gestão de usuários...');
                initUserManagement();
            }
        }, 1500);
        
        console.log('✅ Dashboard inicializado com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro na inicialização do dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

// =============================================
// INICIALIZAÇÃO E FUNÇÕES GLOBAIS
// =============================================

document.addEventListener('DOMContentLoaded', initDashboard);

// TORNE AS FUNÇÕES GLOBAIS
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.selectClientForRoute = selectClientForRoute;
window.formatarParaMoeda = formatarParaMoeda;
window.prepararParaBancoDeDados = prepararParaBancoDeDados;
window.aplicarMascaraMoeda = aplicarMascaraMoeda;
window.globalLogout = function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'login.html';
};
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.openAddUserModal = openAddUserModal;
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser; 
window.loadUsers = loadUsers;

// NOVAS FUNÇÕES GLOBAIS PARA GEOCODING
window.geocodificarEndereco = geocodificarEndereco;
window.atualizarCoordenadasCliente = atualizarCoordenadasCliente;
window.geocodificarClientesSemCoordenadas = geocodificarClientesSemCoordenadas;
window.buscarEnderecoNoMapa = buscarEnderecoNoMapa;
window.atualizarLocalizacaoCliente = atualizarLocalizacaoCliente;   