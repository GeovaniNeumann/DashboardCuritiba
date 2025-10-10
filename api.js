// Arquivo: dashboard/js/api.js

class ClientAPI {
    constructor() {
        this.storageKey = 'clients_data';
        this.eventsKey = 'events_data';
        this.initData();
    }

    // Inicializa com dados mock se não existir
    initData() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify(CLIENTS_DATA));
        }
        if (!localStorage.getItem(this.eventsKey)) {
            localStorage.setItem(this.eventsKey, JSON.stringify(EVENTS_DATA));
        }
    }

    // GET - Buscar todos os clientes
    async getClients() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }
    }

    // GET - Buscar eventos do calendário
    async getEvents() {
        try {
            const data = localStorage.getItem(this.eventsKey);
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
            return [];
        }
    }

    // PUT - Atualizar cliente
    async updateClient(clientId, updates) {
        try {
            const clients = await this.getClients();
            const events = await this.getEvents();
            const index = clients.findIndex(c => c.id === clientId);
            
            if (index !== -1) {
                clients[index] = { ...clients[index], ...updates };
                
                // Atualizar evento no calendário se a data de contato mudou
                if (updates.next_contact) {
                    const eventIndex = events.findIndex(e => e.extendedProps.clientId === clientId);
                    if (eventIndex !== -1) {
                        events[eventIndex].start = updates.next_contact;
                        events[eventIndex].title = `Contato: ${clients[index].name}`;
                    }
                }
                
                localStorage.setItem(this.storageKey, JSON.stringify(clients));
                localStorage.setItem(this.eventsKey, JSON.stringify(events));
                return clients[index];
            }
            throw new Error('Cliente não encontrado');
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            throw error;
        }
    }

    // POST - Criar novo cliente
    async createClient(clientData) {
        try {
            const clients = await this.getClients();
            const events = await this.getEvents();
            const newId = Math.max(...clients.map(c => c.id)) + 1;
            
            const newClient = {
                id: newId,
                ...clientData,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1
            };
            
            // Criar evento no calendário
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
            return newClient;
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw error;
        }
    }

    // DELETE - Remover cliente
    async deleteClient(clientId) {
        try {
            let clients = await this.getClients();
            let events = await this.getEvents();
            
            clients = clients.filter(c => c.id !== clientId);
            events = events.filter(e => e.extendedProps.clientId !== clientId);
            
            localStorage.setItem(this.storageKey, JSON.stringify(clients));
            localStorage.setItem(this.eventsKey, JSON.stringify(events));
            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }
}

const clientAPI = new ClientAPI();