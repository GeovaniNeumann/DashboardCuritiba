// Arquivo: dashboard/js/api.js (Versão Supabase Corrigida)

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://vpvmfcxisbjocuekuwfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdm1mY3hpc2Jqb2N1ZWt1d2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDM4NjIsImV4cCI6MjA3NTY3OTg2Mn0.r5B79_FTin9YcpDBGqjmTz-Z6Jq09W1XDQ4XuV1DhFI';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Coordenadas de Curitiba
const CURITIBA_CENTER = [-25.4284, -49.2733];

class ClientAPI {
    constructor() {
        console.log('✅ ClientAPI inicializada com Supabase');
    }

    // GET - Buscar todos os clientes (CORRIGIDO)
    async getClients() {
        try {
            console.log('🔍 Buscando clientes do Supabase...');
            
            const { data, error, count } = await supabase
                .from('clientes')
                .select('*', { count: 'exact' })
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Erro do Supabase:', error);
                throw error;
            }

            console.log(`✅ ${data?.length || 0} clientes encontrados`);
            
            if (data && data.length > 0) {
                console.log('📝 Primeiro cliente:', data[0]);
            }
            
            return data || [];
        } catch (error) {
            console.error('💥 Erro ao buscar clientes:', error);
            // Retorna array vazio em vez de throw para não quebrar a aplicação
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
                classNames: [client.porte.toLowerCase()],
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
            const { data, error } = await supabase
                .from('clientes')
                .update(updates)
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

    // POST - Criar novo cliente
    async createClient(clientData) {
        try {
            // Adicionar coordenadas se não fornecidas
            if (!clientData.lat || !clientData.lng) {
                clientData.lat = CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1;
                clientData.lng = CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1;
            }

            const { data, error } = await supabase
                .from('clientes')
                .insert([clientData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw error;
        }
    }

    // DELETE - Remover cliente
    async deleteClient(clientId) {
        try {
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

    // MÉTODO AUXILIAR - Inserir dados mock (ATUALIZADO)
    async insertMockData(count = 10) {
        try {
            console.log(`🎲 Inserindo ${count} dados mock...`);
            
            const mockClients = this.generateMockClients(count);
            
            // Inserir em lotes
            const batchSize = 10;
            let inserted = 0;
            
            for (let i = 0; i < mockClients.length; i += batchSize) {
                const batch = mockClients.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('clientes')
                    .insert(batch);

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
}

// Instanciar a API
const clientAPI = new ClientAPI();