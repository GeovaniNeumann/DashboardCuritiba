// Arquivo: dashboard/js/data.js

const CLIENT_NAMES = [
    "Hospital Santa Clara", "Clínica São Lucas", "Maternidade Esperança", "Laboratório Central", "Centro Médico Alfa",
    "Unidade de Saúde Beta", "Consultório Odontológico Delta", "Clínica de Olhos Gama", "Hospital Regional Sul",
    "Posto de Saúde Leste", "Clínica de Fisioterapia", "Centro de Diagnóstico", "Hospital Infantil", "Ambulatório Geral",
    "Clínica Veterinária Curitiba", "Hospital de Oncologia", "Clínica de Estética", "Laboratório de Análises",
    "Hospital Universitário", "Clínica Geriátrica", "Hospital do Coração", "Clínica de Reabilitação",
    "Centro Cirúrgico Privado", "Hospital Ortopédico", "Clínica de Dermatologia"
];

const PORTE = ["Grande", "Médio", "Pequeno"];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMockClients(count) {
    const clients = [];
    for (let i = 1; i <= count; i++) {
        const porte = PORTE[getRandomInt(0, 2)];
        let revenue;
        let frequency;

        if (porte === "Grande") {
            revenue = getRandomInt(50000, 150000);
            frequency = getRandomInt(7, 15); // Dias
        } else if (porte === "Médio") {
            revenue = getRandomInt(15000, 49999);
            frequency = getRandomInt(15, 30); // Dias
        } else { // Pequeno
            revenue = getRandomInt(1000, 14999);
            frequency = getRandomInt(30, 90); // Dias
        }

        const lastServiceDate = getRandomDate(new Date(2024, 0, 1), new Date(2024, 9, 10));
        const nextContactDate = new Date(lastServiceDate);
        nextContactDate.setDate(lastServiceDate.getDate() + getRandomInt(10, 60));

        clients.push({
            id: i,
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
            phone: `(41) 9${getRandomInt(1000, 9999)}-${getRandomInt(1000, 9999)}`
        });
    }
    return clients;
}

const CLIENTS_DATA = generateMockClients(250);

// Gerar eventos de contato para o calendário
const EVENTS_DATA = CLIENTS_DATA.map(client => {
    return {
        title: `Contato: ${client.name}`,
        start: client.next_contact,
        allDay: true,
        classNames: [client.porte.toLowerCase()], // Para estilização no calendário
        extendedProps: {
            clientId: client.id
        }
    };
});

// Coordenadas de Curitiba (fictícias para simulação)
const CURITIBA_CENTER = [-25.4284, -49.2733];

// Adiciona coordenadas fictícias aos clientes para simulação
CLIENTS_DATA.forEach(client => {
    // Gera coordenadas aleatórias próximas ao centro de Curitiba
    client.lat = CURITIBA_CENTER[0] + (Math.random() - 0.5) * 0.1;
    client.lng = CURITIBA_CENTER[1] + (Math.random() - 0.5) * 0.1;
});