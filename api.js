// Arquivo: dashboard/js/api.js (Versão com Autenticação)

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://vpvmfcxisbjocuekuwfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdm1mY3hpc2Jqb2N1ZWt1d2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDM4NjIsImV4cCI6MjA3NTY3OTg2Mn0.r5B79_FTin9YcpDBGqjmTz-Z6Jq09W1XDQ4XuV1DhFI';

// Inicializar o cliente Supabase com autenticação
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
        console.log('✅ ClientAPI inicializada com Supabase');
        this.currentUser = null;
        this.checkAuth();
    }

    // Verificar autenticação do usuário atual
    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!error && user) {
                this.currentUser = user;
                console.log('👤 Usuário autenticado:', user.email);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
        }
    }

    // GET - Buscar todos os clientes (COM CONTROLE DE PERMISSÃO)
    async getClients() {
        try {
            // Verificar se usuário está autenticado
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log('🔍 Buscando clientes do Supabase...');
            
            let query = supabase
                .from('clientes')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Se não for admin, filtrar apenas pelos clientes do usuário
            const userRole = this.currentUser.user_metadata?.role || 'user';
            if (userRole !== 'admin') {
                query = query.eq('user_id', this.currentUser.id);
            }

            const { data, error, count } = await query;

            if (error) {
                console.error('❌ Erro do Supabase:', error);
                throw error;
            }

            console.log(`✅ ${data?.length || 0} clientes encontrados`);
            return data || [];
        } catch (error) {
            console.error('💥 Erro ao buscar clientes:', error);
            return [];
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

    // PUT - Atualizar cliente (COM VERIFICAÇÃO DE PERMISSÃO)
    async updateClient(clientId, updates) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            // Verificar se usuário tem permissão para editar este cliente
            if (!await this.canEditClient(clientId)) {
                throw new Error('Sem permissão para editar este cliente');
            }

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
            return data;
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            throw error;
        }
    }

    // POST - Criar novo cliente (COM USER_ID)
    async createClient(clientData) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            // Adicionar coordenadas se não fornecidas
            if (!clientData.lat || !clientData.lng) {
                clientData.lat = CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1;
                clientData.lng = CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1;
            }

            const { data, error } = await supabase
                .from('clientes')
                .insert([{
                    ...clientData,
                    user_id: this.currentUser.id, // Associar cliente ao usuário
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw error;
        }
    }

    // DELETE - Remover cliente (COM VERIFICAÇÃO DE PERMISSÃO)
    async deleteClient(clientId) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            // Verificar se usuário tem permissão para excluir este cliente
            if (!await this.canEditClient(clientId)) {
                throw new Error('Sem permissão para excluir este cliente');
            }

            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', clientId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }

    // Verificar se usuário pode editar/excluir cliente
    async canEditClient(clientId) {
        try {
            const userRole = this.currentUser.user_metadata?.role || 'user';
            
            // Admin pode editar todos os clientes
            if (userRole === 'admin') {
                return true;
            }

            // Usuário comum só pode editar seus próprios clientes
            const { data: client, error } = await supabase
                .from('clientes')
                .select('user_id')
                .eq('id', clientId)
                .single();

            if (error) throw error;
            return client.user_id === this.currentUser.id;
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return false;
        }
    }

    // MÉTODO AUXILIAR - Inserir dados mock (ATUALIZADO COM USER_ID)
    async insertMockData(count = 10) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            console.log(`🎲 Inserindo ${count} dados mock...`);
            
            const mockClients = this.generateMockClients(count);
            
            // Inserir em lotes
            const batchSize = 10;
            let inserted = 0;
            
            for (let i = 0; i < mockClients.length; i += batchSize) {
                const batch = mockClients.slice(i, i + batchSize);
                
                // Adicionar user_id a todos os clientes mock
                const batchWithUserId = batch.map(client => ({
                    ...client,
                    user_id: this.currentUser.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));
                
                const { error } = await supabase
                    .from('clientes')
                    .insert(batchWithUserId);

                if (error) {
                    console.warn('⚠️ Erro no lote (pode ser CNPJ duplicado):', error.message);
                    // Continua mesmo com erro
                }
                
                inserted += batch.length;
                console.log(`📦 Inseridos ${inserted} de ${mockClients.length} clientes`);
            }

            console.log('✅ Dados mock inseridos com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inserir dados mock:', error);
            throw error;
        }
    }

    // Gerar clientes mock (ATUALIZADO com CNPJs únicos)
    generateMockClients(count) {
        const CLIENT_NAMES = [
            "Hospital Santa Clara", "Clínica São Lucas", "Maternidade Esperança", "Laboratório Central", 
            "Centro Médico Alfa", "Unidade de Saúde Beta", "Consultório Odontológico Delta", 
            "Clínica de Olhos Gama", "Hospital Regional Sul", "Posto de Saúde Leste"
        ];

        const PORTE = ["Grande", "Médio", "Pequeno"];

        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

        const clients = [];
        
        // Gera um timestamp único para evitar CNPJs duplicados
        const timestamp = Date.now();
        
        for (let i = 1; i <= count; i++) {
            const porte = PORTE[getRandomInt(0, 2)];
            let revenue, frequency;

            if (porte === "Grande") {
                revenue = getRandomInt(50000, 150000);
                frequency = getRandomInt(7, 15);
            } else if (porte === "Médio") {
                revenue = getRandomInt(15000, 49999);
                frequency = getRandomInt(15, 30);
            } else {
                revenue = getRandomInt(1000, 14999);
                frequency = getRandomInt(30, 90);
            }

            const lastServiceDate = getRandomDate(new Date(2024, 0, 1), new Date());
            const nextContactDate = new Date(lastServiceDate);
            nextContactDate.setDate(lastServiceDate.getDate() + getRandomInt(10, 60));

            // CNPJ único baseado no timestamp
            const uniqueId = timestamp + i;
            const cnpjSuffix = String(uniqueId).slice(-8).padStart(8, '0');
            
            clients.push({
                name: `${CLIENT_NAMES[getRandomInt(0, CLIENT_NAMES.length - 1)]} ${i}`,
                cnpj: `${String(i).padStart(2, '0')}.${cnpjSuffix.slice(0, 3)}.${cnpjSuffix.slice(3, 6)}/${cnpjSuffix.slice(6, 8)}-${String(i).padStart(2, '0')}`,
                porte: porte,
                revenue_ytd: revenue,
                frequency_days: frequency,
                last_service: lastServiceDate.toISOString().split('T')[0],
                next_contact: nextContactDate.toISOString().split('T')[0],
                address: `Rua ${CLIENT_NAMES[getRandomInt(0, CLIENT_NAMES.length - 1)].split(' ')[0]}, ${getRandomInt(100, 999)} - Curitiba/PR`,
                status: (Math.random() > 0.9) ? "Inativo" : "Ativo",
                email: `contato${i}@${CLIENT_NAMES[getRandomInt(0, CLIENT_NAMES.length - 1)].toLowerCase().replace(/\s+/g, '')}.com.br`,
                phone: `(41) 9${getRandomInt(1000, 9999)}-${getRandomInt(1000, 9999)}`,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.05,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.05
            });
        }
        return clients;
    }

    // Atualizar usuário atual (para sincronização)
    async updateCurrentUser() {
        await this.checkAuth();
    }
}

// Instanciar a API
const clientAPI = new ClientAPI();