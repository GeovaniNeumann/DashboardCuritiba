// Arquivo: js/api.js

class ClientAPI {
    constructor() {
        this.storageKey = 'clients_data';
        this.eventsKey = 'events_data';
        this.initData();
    }

    initData() {
        // Limpa localStorage para teste (opcional - remova depois)
        // localStorage.removeItem(this.storageKey);
        // localStorage.removeItem(this.eventsKey);
        
        if (!localStorage.getItem(this.storageKey)) {
            console.log('📦 Inicializando dados no localStorage...');
            localStorage.setItem(this.storageKey, JSON.stringify(CLIENTS_DATA));
            localStorage.setItem(this.eventsKey, JSON.stringify(EVENTS_DATA));
            console.log('✅ Dados iniciais salvos no localStorage');
        } else {
            console.log('📦 Dados já existem no localStorage');
        }
    }

    async getClients() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                console.log('❌ Nenhum dado encontrado no localStorage');
                return [];
            }
            const clients = JSON.parse(data);
            console.log('📊 Clientes carregados:', clients.length);
            return clients;
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            return [];
        }
    }

    async getEvents() {
        try {
            const data = localStorage.getItem(this.eventsKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
            return [];
        }
    }

    async updateClient(clientId, updates) {
        try {
            const clients = await this.getClients();
            const events = await this.getEvents();
            const index = clients.findIndex(c => c.id === clientId);
            
            if (index !== -1) {
                clients[index] = { ...clients[index], ...updates };
                
                // Atualiza evento no calendário
                if (updates.next_contact) {
                    const eventIndex = events.findIndex(e => e.extendedProps.clientId === clientId);
                    if (eventIndex !== -1) {
                        events[eventIndex].start = updates.next_contact;
                        events[eventIndex].title = `Contato: ${clients[index].name}`;
                    }
                }
                
                localStorage.setItem(this.storageKey, JSON.stringify(clients));
                localStorage.setItem(this.eventsKey, JSON.stringify(events));
                console.log('✅ Cliente atualizado:', clientId);
                return clients[index];
            }
            throw new Error('Cliente não encontrado');
        } catch (error) {
            console.error('❌ Erro ao atualizar cliente:', error);
            throw error;
        }
    }

    async createClient(clientData) {
        try {
            const clients = await this.getClients();
            const events = await this.getEvents();
            
            const maxId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) : 0;
            const newId = maxId + 1;
            
            const newClient = {
                id: newId,
                ...clientData,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1
            };
            
            const newEvent = {
                title: `Contato: ${newClient.name}`,
                start: newClient.next_contact,
                allDay: true,
                classNames: [newClient.porte.toLowerCase()],
                extendedProps: {
                    clientId: newId
                }
            };
            
            clients.push(newClient);
            events.push(newEvent);
            
            localStorage.setItem(this.storageKey, JSON.stringify(clients));
            localStorage.setItem(this.eventsKey, JSON.stringify(events));
            
            console.log('✅ Novo cliente criado:', newClient.name);
            return newClient;
        } catch (error) {
            console.error('❌ Erro ao criar cliente:', error);
            throw error;
        }
    }

    async deleteClient(clientId) {
        try {
            let clients = await this.getClients();
            let events = await this.getEvents();
            
            const clientName = clients.find(c => c.id === clientId)?.name;
            
            clients = clients.filter(c => c.id !== clientId);
            events = events.filter(e => e.extendedProps.clientId !== clientId);
            
            localStorage.setItem(this.storageKey, JSON.stringify(clients));
            localStorage.setItem(this.eventsKey, JSON.stringify(events));
            
            console.log('✅ Cliente deletado:', clientName);
            return true;
        } catch (error) {
            console.error('❌ Erro ao deletar cliente:', error);
            throw error;
        }
    }
}

const clientAPI = new ClientAPI();