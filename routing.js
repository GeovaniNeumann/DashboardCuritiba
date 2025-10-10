// Arquivo: dashboard/js/routing.js

class RouteOptimizer {
    constructor() {
        // Para teste, usaremos uma chave simulada
        // Em produção, obtenha uma chave gratuita em openrouteservice.org
        this.apiKey = '5b3ce3597851110001cf6248abc1fa1234567890abcdef'; // Chave de exemplo
        this.baseUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
    }

    async optimizeRoute(selectedClients) {
        if (selectedClients.length < 2) {
            this.showNotification('Selecione pelo menos 2 clientes para otimizar a rota', 'error');
            return;
        }

        // Em ambiente real, usaríamos a API do OpenRouteService
        // Por enquanto, usaremos um algoritmo de fallback
        console.log('Otimizando rota para:', selectedClients.length, 'clientes');
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Usar algoritmo de fallback
        const optimizedRoute = this.fallbackRoute(selectedClients);
        this.displayOptimizedRoute(optimizedRoute, selectedClients);
    }

    fallbackRoute(clients) {
        // Algoritmo simples do vizinho mais próximo
        if (clients.length === 0) return [];
        
        const route = [clients[0]];
        const remaining = [...clients.slice(1)];
        
        while (remaining.length > 0) {
            const last = route[route.length - 1];
            const nearest = this.findNearest(last, remaining);
            route.push(nearest.client);
            remaining.splice(nearest.index, 1);
        }
        
        // Calcular distância e duração estimadas
        const totalDistance = this.calculateTotalDistance(route);
        const totalDuration = totalDistance / 40 * 60; // Assumindo 40km/h em área urbana
        
        return {
            route: route,
            summary: {
                distance: totalDistance * 1000, // Converter para metros
                duration: totalDuration * 60 // Converter para segundos
            }
        };
    }

    findNearest(client, clientsList) {
        let minDistance = Infinity;
        let nearestIndex = 0;
        
        clientsList.forEach((other, index) => {
            const dist = this.calculateDistance(client, other);
            if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = index;
            }
        });
        
        return { client: clientsList[nearestIndex], index: nearestIndex };
    }

    calculateDistance(client1, client2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (client2.lat - client1.lat) * Math.PI / 180;
        const dLon = (client2.lng - client1.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(client1.lat * Math.PI / 180) * Math.cos(client2.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    }

    calculateTotalDistance(route) {
        let total = 0;
        for (let i = 0; i < route.length - 1; i++) {
            total += this.calculateDistance(route[i], route[i + 1]);
        }
        return total;
    }

    displayOptimizedRoute(routeData, originalClients) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🗺️ Rota Otimizada</h3>
                <div class="route-summary">
                    <p><strong>Distância total:</strong> ${(routeData.summary.distance / 1000).toFixed(1)} km</p>
                    <p><strong>Duração estimada:</strong> ${Math.round(routeData.summary.duration / 60)} minutos</p>
                    <p><strong>Número de paradas:</strong> ${routeData.route.length}</p>
                </div>
                <h4>Ordem de Visitação:</h4>
                <ol class="route-list">
                    ${routeData.route.map((client, index) => `
                        <li>
                            <strong>${index + 1}.</strong> ${client.name}
                            <br><small>${client.address}</small>
                            ${index > 0 ? `<br><small>Distância do anterior: ${this.calculateDistance(routeData.route[index-1], client).toFixed(1)} km</small>` : ''}
                        </li>
                    `).join('')}
                </ol>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="btn-primary" onclick="this.printRoute()">🖨️ Imprimir Rota</button>
                </div>
            </div>
        `;

        // Adicionar função de impressão
        modal.querySelector('.btn-primary').onclick = () => this.printRoute(routeData);

        document.body.appendChild(modal);
    }

    printRoute(routeData) {
        const printWindow = window.open('', '_blank');
        const routeContent = `
            <html>
                <head>
                    <title>Rota Otimizada - ${new Date().toLocaleDateString('pt-BR')}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #0a4f70; }
                        .summary { background: #f4f7f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                        .route-list li { margin-bottom: 10px; padding: 10px; border-left: 3px solid #4ab8a1; }
                    </style>
                </head>
                <body>
                    <h1>🗺️ Rota Otimizada de Visitas</h1>
                    <div class="summary">
                        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                        <p><strong>Distância total:</strong> ${(routeData.summary.distance / 1000).toFixed(1)} km</p>
                        <p><strong>Duração estimada:</strong> ${Math.round(routeData.summary.duration / 60)} minutos</p>
                        <p><strong>Número de paradas:</strong> ${routeData.route.length}</p>
                    </div>
                    <h2>Ordem de Visitação:</h2>
                    <ol class="route-list">
                        ${routeData.route.map((client, index) => `
                            <li>
                                <strong>${index + 1}.</strong> ${client.name}<br>
                                <strong>Endereço:</strong> ${client.address}<br>
                                <strong>Telefone:</strong> ${client.phone}<br>
                                ${index > 0 ? `<strong>Distância do anterior:</strong> ${this.calculateDistance(routeData.route[index-1], client).toFixed(1)} km` : ''}
                            </li>
                        `).join('')}
                    </ol>
                </body>
            </html>
        `;
        
        printWindow.document.write(routeContent);
        printWindow.document.close();
        printWindow.print();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

const routeOptimizer = new RouteOptimizer();