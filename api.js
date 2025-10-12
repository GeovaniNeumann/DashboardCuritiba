// Arquivo: dashboard/js/api.js (Versão Corrigida e Compatível)

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://vpvmfcxisbjocuekuwfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdm1mY3hpc2Jqb2N1ZWt1d2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDM4NjIsImV4cCI6MjA3NTY3OTg2Mn0.r5B79_FTin9YcpDBGqjmTz-Z6Jq09W1XDQ4XuV1DhFI';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Coordenadas de Curitiba
const CURITIBA_CENTER = [-25.4284, -49.2733];

class ClientAPI {
    constructor() {
        console.log('✅ ClientAPI inicializada');
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        await this.checkAuth();
    }

    // Verificar autenticação
    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!error && user) {
                this.currentUser = user;
                console.log('👤 Usuário autenticado:', user.email);
                return true;
            }
            console.log('⚠️ Usuário não autenticado');
            return false;
        } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
            return false;
        }
    }

    // GET - Buscar todos os clientes (COM FALLBACK)
    async getClients() {
        try {
            console.log('🔍 Buscando clientes...');
            
            // Se não está autenticado, tenta autenticar primeiro
            if (!this.currentUser) {
                const isAuthenticated = await this.checkAuth();
                if (!isAuthenticated) {
                    console.log('⚠️ Retornando dados mock - usuário não autenticado');
                    return this.getMockClients();
                }
            }

            let query = supabase
                .from('clientes')
                .select('*')
                .order('created_at', { ascending: false });

            // Filtro por usuário se não for admin
            const userRole = this.currentUser?.user_metadata?.role || 'user';
            if (userRole !== 'admin' && this.currentUser) {
                query = query.eq('user_id', this.currentUser.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro ao buscar clientes:', error);
                console.log('🔄 Retornando dados mock devido ao erro');
                return this.getMockClients();
            }

            console.log(`✅ ${data?.length || 0} clientes encontrados`);
            return data || [];
            
        } catch (error) {
            console.error('💥 Erro crítico ao buscar clientes:', error);
            return this.getMockClients();
        }
    }

    // GET - Buscar eventos do calendário
    async getEvents() {
        try {
            const clients = await this.getClients();
            
            const events = clients.map(client => ({
                title: `Contato: ${client.name}`,
                start: client.next_contact,
                allDay: true,
                classNames: [client.porte?.toLowerCase() || 'pequeno'],
                extendedProps: {
                    clientId: client.id
                }
            }));

            return events;
        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
            return [];
        }
    }

    // PUT - Atualizar cliente
    async updateClient(clientId, updates) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log('📝 Atualizando cliente:', clientId);

            const { data, error } = await supabase
                .from('clientes')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', clientId)
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Cliente atualizado');
            return data;
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            throw error;
        }
    }

    // POST - Criar novo cliente
    async createClient(clientData) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log('➕ Criando novo cliente...');

            // Adicionar coordenadas se não fornecidas
            if (!clientData.lat || !clientData.lng) {
                clientData.lat = CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1;
                clientData.lng = CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1;
            }

            const { data, error } = await supabase
                .from('clientes')
                .insert([{
                    ...clientData,
                    user_id: this.currentUser.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Cliente criado');
            return data;
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw error;
        }
    }

    // DELETE - Remover cliente
    async deleteClient(clientId) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log('🗑️ Excluindo cliente:', clientId);

            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', clientId);

            if (error) throw error;
            
            console.log('✅ Cliente excluído');
            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }

    // DADOS MOCK PARA TESTE (Fallback)
    getMockClients() {
        console.log('🎲 Carregando dados mock...');
        
        const mockClients = [];
        const CLIENT_NAMES = [
            "Hospital Santa Clara", "Clínica São Lucas", "Maternidade Esperança", 
            "Laboratório Central", "Centro Médico Alfa", "Unidade de Saúde Beta"
        ];
        
        const PORTE = ["Grande", "Médio", "Pequeno"];
        const STATUS = ["Ativo", "Inativo"];

        for (let i = 1; i <= 6; i++) {
            const porte = PORTE[Math.floor(Math.random() * PORTE.length)];
            let revenue, frequency;

            if (porte === "Grande") {
                revenue = Math.floor(Math.random() * 100000) + 50000;
                frequency = Math.floor(Math.random() * 15) + 7;
            } else if (porte === "Médio") {
                revenue = Math.floor(Math.random() * 35000) + 15000;
                frequency = Math.floor(Math.random() * 15) + 15;
            } else {
                revenue = Math.floor(Math.random() * 5000) + 1000;
                frequency = Math.floor(Math.random() * 30) + 30;
            }

            const lastServiceDate = new Date();
            lastServiceDate.setDate(lastServiceDate.getDate() - Math.floor(Math.random() * 30));
            
            const nextContactDate = new Date(lastServiceDate);
            nextContactDate.setDate(lastServiceDate.getDate() + frequency);

            mockClients.push({
                id: i,
                name: `${CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)]} ${i}`,
                cnpj: `00.000.000/0001-${String(i).padStart(2, '0')}`,
                porte: porte,
                status: STATUS[Math.floor(Math.random() * STATUS.length)],
                revenue_ytd: revenue,
                frequency_days: frequency,
                last_service: lastServiceDate.toISOString().split('T')[0],
                next_contact: nextContactDate.toISOString().split('T')[0],
                address: `Rua Exemplo, ${Math.floor(Math.random() * 900) + 100} - Curitiba/PR`,
                email: `contato${i}@exemplo.com.br`,
                phone: `(41) 9${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.05,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.05,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        return mockClients;
    }

    // Inserir dados mock
    async insertMockData(count = 5) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log(`🎲 Inserindo ${count} dados mock...`);
            
            const mockClients = this.generateMockClients(count);
            const clientsWithUser = mockClients.map(client => ({
                ...client,
                user_id: this.currentUser.id
            }));

            const { error } = await supabase
                .from('clientes')
                .insert(clientsWithUser);

            if (error) {
                console.warn('⚠️ Erro ao inserir dados mock:', error.message);
                return false;
            }
            
            console.log('✅ Dados mock inseridos!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inserir dados mock:', error);
            return false;
        }
    }

    // Gerar clientes mock para inserção
    generateMockClients(count) {
        const CLIENT_NAMES = [
            "Hospital Santa Clara", "Clínica São Lucas", "Maternidade Esperança", 
            "Laboratório Central", "Centro Médico Alfa"
        ];
        
        const PORTE = ["Grande", "Médio", "Pequeno"];
        const clients = [];
        
        for (let i = 1; i <= count; i++) {
            const porte = PORTE[Math.floor(Math.random() * PORTE.length)];
            let revenue, frequency;

            if (porte === "Grande") {
                revenue = Math.floor(Math.random() * 100000) + 50000;
                frequency = Math.floor(Math.random() * 15) + 7;
            } else if (porte === "Médio") {
                revenue = Math.floor(Math.random() * 35000) + 15000;
                frequency = Math.floor(Math.random() * 15) + 15;
            } else {
                revenue = Math.floor(Math.random() * 5000) + 1000;
                frequency = Math.floor(Math.random() * 30) + 30;
            }

            const lastServiceDate = new Date();
            lastServiceDate.setDate(lastServiceDate.getDate() - Math.floor(Math.random() * 30));
            
            const nextContactDate = new Date(lastServiceDate);
            nextContactDate.setDate(lastServiceDate.getDate() + frequency);
            
            clients.push({
                name: `${CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)]} ${i}`,
                cnpj: `${String(i).padStart(2, '0')}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}/0001-${String(i).padStart(2, '0')}`,
                porte: porte,
                revenue_ytd: revenue,
                frequency_days: frequency,
                last_service: lastServiceDate.toISOString().split('T')[0],
                next_contact: nextContactDate.toISOString().split('T')[0],
                address: `Rua ${CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)].split(' ')[0]}, ${Math.floor(Math.random() * 900) + 100} - Curitiba/PR`,
                status: Math.random() > 0.1 ? "Ativo" : "Inativo",
                email: `contato${i}@exemplo.com.br`,
                phone: `(41) 9${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.05,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.05
            });
        }
        return clients;
    }

    // Atualizar usuário
    async updateCurrentUser() {
        return await this.checkAuth();
    }
}

// Instanciar a API
const clientAPI = new ClientAPI();