// Arquivo: dashboard/js/api.js (Versão Supabase)
// ESTE ARQUIVO FOI CONFIGURADO COM SUAS CREDENCIAIS

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://vpvmfcxisbjocuekuwfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdm1mY3hpc2Jqb2N1ZWt1d2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDM4NjIsImV4cCI6MjA3NTY3OTg2Mn0.r5B79_FTin9YcpDBGqjmTz-Z6Jq09W1XDQ4XuV1DhFI';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY );

// Coordenadas de Curitiba (fictícias para simulação) - Mantidas para a função de mock
const CURITIBA_CENTER = [-25.4284, -49.2733];

class ClientAPI {
    constructor() {
        console.log('ClientAPI inicializada com Supabase');
    }

    // GET - Buscar todos os clientes
    async getClients() {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            throw error;
        }
    }

    // GET - Buscar eventos do calendário
    // Gera eventos a partir dos dados de clientes
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
            throw error;
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

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            throw error;
        }
    }

    // POST - Criar novo cliente
    async createClient(clientData) {
        try {
            // Adicionar coordenadas geográficas fictícias se não fornecidas
            if (!clientData.lat || !clientData.lng) {
                clientData.lat = CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1;
                clientData.lng = CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1;
            }

            const { data, error } = await supabase
                .from('clientes')
                .insert([clientData])
                .select()
                .single();

            if (error) {
                throw error;
            }

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

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }

    // MÉTODO AUXILIAR - Inserir dados mock no Supabase (usar apenas uma vez)
    async insertMockData() {
        try {
            console.log('Inserindo dados mock no Supabase...');
            
            // Gerar 250 clientes mock
            const mockClients = this.generateMockClients(250);
            
            // Inserir em lotes de 50 (limite do Supabase por requisição)
            const batchSize = 50;
            for (let i = 0; i < mockClients.length; i += batchSize) {
                const batch = mockClients.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('clientes')
                    .insert(batch);

                if (error) {
                    throw error;
                }
                
                console.log(`Inseridos ${Math.min(i + batchSize, mockClients.length)} de ${mockClients.length} clientes`);
            }

            console.log('Dados mock inseridos com sucesso!');
            return true;
        } catch (error) {
            console.error('Erro ao inserir dados mock:', error);
            throw error;
        }
    }

    // Função auxiliar para gerar clientes mock
    generateMockClients(count) {
        const CLIENT_NAMES = [
            "Hospital Santa Clara", "Clínica São Lucas", "Maternidade Esperança", "Laboratório Central", "Centro Médico Alfa",
            "Unidade de Saúde Beta", "Consultório Odontológico Delta", "Clínica de Olhos Gama", "Hospital Regional Sul",
            "Posto de Saúde Leste", "Clínica de Fisioterapia", "Centro de Diagnóstico", "Hospital Infantil", "Ambulatório Geral",
            "Clínica Veterinária Curitiba", "Hospital de Oncologia", "Clínica de Estética", "Laboratório de Análises",
            "Hospital Universitário", "Clínica Geriátrica", "Hospital do Coração", "Clínica de Reabilitação",
            "Centro Cirúrgico Privado", "Hospital Ortopédico", "Clínica de Dermatologia"
        ];

        const PORTE = ["Grande", "Médio", "Pequeno"];

        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

        const clients = [];
        for (let i = 1; i <= count; i++) {
            const porte = PORTE[getRandomInt(0, 2)];
            let revenue;
            let frequency;

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

            const lastServiceDate = getRandomDate(new Date(2024, 0, 1), new Date(2024, 9, 10));
            const nextContactDate = new Date(lastServiceDate);
            nextContactDate.setDate(lastServiceDate.getDate() + getRandomInt(10, 60));

            clients.push({
                name: `${CLIENT_NAMES[getRandomInt(0, CLIENT_NAMES.length - 1)]} (${i})`,
                cnpj: `00.000.000/${String(i).padStart(4, '0')}-00`,
                porte: porte,
                revenue_ytd: revenue,
                frequency_days: frequency,
                last_service: lastServiceDate.toISOString().split('T')[0],
                next_contact: nextContactDate.toISOString().split('T')[0],
                address: `Rua Fictícia, ${getRandomInt(100, 999)} - Curitiba/PR`,
                status: (Math.random() > 0.95) ? "Inativo" : "Ativo",
                email: `contato@${CLIENT_NAMES[getRandomInt(0, CLIENT_NAMES.length - 1)].toLowerCase().replace(/\s+/g, '')}.com.br`,
                phone: `(41) 9${getRandomInt(1000, 9999)}-${getRandomInt(1000, 9999)}`,
                lat: CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1,
                lng: CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1
            });
        }
        return clients;
    }
}

// Instanciar a API
const clientAPI = new ClientAPI();

// INSTRUÇÕES DE USO:
// 1. Após configurar o Supabase e criar a tabela, execute no console do navegador:
//    await clientAPI.insertMockData();
// 2. Isso irá popular o banco de dados com 250 clientes de exemplo
// 3. Após a primeira execução, você pode comentar ou remover o método insertMockData()
