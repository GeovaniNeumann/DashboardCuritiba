# Dashboard de Gestão de Carteira de Clientes - Versão Completa

Este projeto é um **Dashboard de Gestão de Carteira de Clientes** completo desenvolvido utilizando apenas **HTML5, CSS3 e JavaScript puro**. Ele simula a gestão da carteira de 250 clientes de uma empresa de esterilização de materiais médicos em Curitiba, com todas as funcionalidades solicitadas implementadas.

## 🚀 Funcionalidades Implementadas

### 1. **Sistema de Persistência com localStorage**
- Substitui o arquivo `data.js` por uma API simulada
- Dados persistem entre sessões do navegador
- Sistema completo de CRUD (Create, Read, Update, Delete)

### 2. **CRUD Completo de Clientes**
- ✅ **Criar**: Adicionar novos clientes através de formulário modal
- ✅ **Ler**: Visualizar lista completa de clientes com filtros
- ✅ **Atualizar**: Editar informações dos clientes diretamente
- ✅ **Deletar**: Remover clientes com confirmação

### 3. **Otimização de Rotas**
- Seleção de múltiplos clientes no mapa
- Algoritmo de otimização de rota (vizinho mais próximo)
- Visualização da ordem de visitação otimizada
- Funcionalidade de impressão da rota
- Integração preparada para API do OpenRouteService

### 4. **Funcionalidades Originais Mantidas**
- KPIs em tempo real (total de clientes, ativos, faturamento, frequência)
- Gráficos interativos (distribuição por porte e faturamento)
- Calendário de contatos com FullCalendar
- Mapa interativo com Leaflet.js
- Sistema de filtros avançado
- Design responsivo

## 🛠 Tecnologias Utilizadas

- **HTML5, CSS3, JavaScript (Puro)**
- **Chart.js** - Gráficos e visualizações
- **FullCalendar** - Calendário de agendamentos
- **Leaflet.js** - Mapas interativos
- **localStorage** - Persistência de dados
- **OpenStreetMap** - Mapas base

## 📁 Estrutura do Projeto


## 🚀 Como Executar

1. **Baixe todos os arquivos** na mesma estrutura de pastas
2. **Abra o arquivo `index.html`** em qualquer navegador moderno
3. **Pronto!** O dashboard funcionará imediatamente

## 💡 Funcionalidades de Destaque

### 🗂 Gestão de Clientes
- Adição de novos clientes com formulário completo
- Edição em tempo real de todas as informações
- Exclusão segura com confirmação
- Filtros por nome, porte e status

### 🗺️ Otimização de Rotas
1. Clique em "Selecionar Clientes para Rota"
2. Selecione os clientes no mapa
3. Clique em "Otimizar Rota"
4. Visualize a ordem otimizada de visitação
5. Imprima a rota para uso em campo

### 📊 Análises em Tempo Real
- KPIs atualizados automaticamente
- Gráficos que respondem aos filtros
- Calendário sincronizado com os dados
- Mapa com localização dos clientes

## 🔧 Personalização

### Para usar API real de roteamento:
1. Registre-se em [OpenRouteService](https://openrouteservice.org/)
2. Obtenha uma chave API gratuita
3. Substitua a chave em `routing.js`:
```javascript
this.apiKey = 'sua_chave_aqui';