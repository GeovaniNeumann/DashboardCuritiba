// Arquivo: dashboard/js/user-management.js

class UserManagement {
    constructor() {
        this.users = [];
    }

    init() {
        if (!authService.isAdmin()) return;
        
        this.addUserManagementSection();
        this.loadUsers();
    }

    addUserManagementSection() {
        const content = document.querySelector('.content');
        if (!content) return;

        const userSection = document.createElement('div');
        userSection.className = 'user-management-section';
        userSection.innerHTML = `
            <div class="section-header">
                <h2>👥 Gestão de Usuários</h2>
                <button class="btn-primary" id="add-user-btn">+ Adicionar Usuário</button>
            </div>
            <div class="user-list">
                <table id="user-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Perfil</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="user-table-body">
                    </tbody>
                </table>
            </div>
        `;

        content.appendChild(userSection);

        // Adicionar event listeners
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.openUserModal();
        });
    }

    async loadUsers() {
        try {
            // Em uma implementação real, você buscaria os usuários do Supabase
            // Por enquanto, vamos simular com dados mock
            this.users = [
                {
                    id: 1,
                    name: 'Administrador',
                    email: 'admin@admin.com',
                    role: 'admin',
                    status: 'Ativo',
                    created_at: new Date().toISOString()
                }
            ];

            this.renderUserTable();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showNotification('Erro ao carregar usuários', 'error');
        }
    }

    renderUserTable() {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = tbody.insertRow();
            
            row.insertCell().textContent = user.name || 'N/A';
            row.insertCell().textContent = user.email;
            
            const roleCell = row.insertCell();
            roleCell.textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
            roleCell.classList.add(user.role === 'admin' ? 'role-admin' : 'role-user');
            
            const statusCell = row.insertCell();
            statusCell.textContent = user.status || 'Ativo';
            statusCell.classList.add(user.status === 'Ativo' ? 'status-ativo' : 'status-inativo');
            
            const actionsCell = row.insertCell();
            
            if (user.email !== 'admin@admin.com') { // Não permitir editar o admin principal
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.className = 'btn-edit';
                editBtn.onclick = () => this.openUserModal(user);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'btn-delete';
                deleteBtn.onclick = () => this.deleteUser(user.id);
                
                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
            }
        });
    }

    openUserModal(user = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${user ? '✏️ Editar Usuário' : '➕ Adicionar Usuário'}</h3>
                <form id="user-form">
                    <div class="form-group">
                        <label>Nome:</label>
                        <input type="text" name="name" value="${user?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>E-mail:</label>
                        <input type="email" name="email" value="${user?.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Senha:</label>
                        <input type="password" name="password" ${user ? '' : 'required'}>
                        <small>${user ? 'Deixe em branco para manter a senha atual' : ''}</small>
                    </div>
                    <div class="form-group">
                        <label>Perfil:</label>
                        <select name="role">
                            <option value="user" ${user?.role === 'user' ? 'selected' : ''}>Usuário</option>
                            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">${user ? 'Atualizar' : 'Criar'}</button>
                    </div>
                </form>
            </div>
        `;

        modal.querySelector('#user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const userData = {
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role'),
                password: formData.get('password')
            };

            try {
                if (user) {
                    await this.updateUser(user.id, userData);
                } else {
                    await this.createUser(userData);
                }
                closeModal();
            } catch (error) {
                showNotification('Erro ao salvar usuário: ' + error.message, 'error');
            }
        });

        document.body.appendChild(modal);
    }

    async createUser(userData) {
        try {
            // Em uma implementação real, você usaria o Supabase Auth
            const newUser = {
                id: Date.now(),
                name: userData.name,
                email: userData.email,
                role: userData.role,
                status: 'Ativo',
                created_at: new Date().toISOString()
            };

            this.users.push(newUser);
            this.renderUserTable();
            showNotification('Usuário criado com sucesso!', 'success');
        } catch (error) {
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                this.users[userIndex] = {
                    ...this.users[userIndex],
                    name: userData.name,
                    email: userData.email,
                    role: userData.role
                };
                this.renderUserTable();
                showNotification('Usuário atualizado com sucesso!', 'success');
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteUser(userId) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            try {
                this.users = this.users.filter(u => u.id !== userId);
                this.renderUserTable();
                showNotification('Usuário excluído com sucesso!', 'success');
            } catch (error) {
                showNotification('Erro ao excluir usuário', 'error');
            }
        }
    }
}

const userManagement = new UserManagement();

// Função global para inicializar a gestão de usuários
function initUserManagement() {
    userManagement.init();
}