// Configuração do Supabase
const SUPABASE_URL = 'https://vpvmfcxisbjocuekuwfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdm1mY3hpc2Jqb2N1ZWt1d2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDM4NjIsImV4cCI6MjA3NTY3OTg2Mn0.r5B79_FTin9YcpDBGqjmTz-Z6Jq09W1XDQ4XuV1DhFI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para criar admin (agora depois da inicialização)
async function createAdminUser() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@admin.com',
        password: 'admin123',
        options: {
            data: {
                role: 'admin',
                name: 'Administrador'
            }
        }
    });
    
    if (error) {
        console.error('Erro:', error);
    } else {
        console.log('Admin criado:', data);
    }
}

class AuthService {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Verifica se há um token válido no localStorage
        const token = localStorage.getItem('auth_token');
        if (token) {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) {
                this.currentUser = user;
                this.redirectToDashboard();
            } else {
                this.logout();
            }
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.user) {
                this.currentUser = data.user;
                localStorage.setItem('auth_token', data.session.access_token);
                localStorage.setItem('user_role', data.user.user_metadata?.role || 'user');
                this.redirectToDashboard();
                return true;
            }
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro no cadastro:', error);
            throw error;
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        this.currentUser = null;
        window.location.href = 'login.html';
    }

    redirectToDashboard() {
        window.location.href = 'index.html';
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    isAdmin() {
        const role = localStorage.getItem('user_role');
        return role === 'admin';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Função para criar usuário admin inicial (VERSÃO CORRIGIDA)
    async createInitialAdmin() {
        try {
            console.log('🔍 Verificando se admin existe...');
            
            // Método correto: tentar criar diretamente
            const { data, error } = await supabase.auth.signUp({
                email: 'admin@admin.com',
                password: 'admin123',
                options: {
                    data: {
                        role: 'admin',
                        name: 'Administrador'
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    console.log('✅ Admin já existe');
                } else {
                    console.error('❌ Erro ao criar admin:', error.message);
                }
            } else {
                console.log('✅ Usuário admin criado com sucesso!');
                console.log('🔑 ID:', data.user?.id);
            }
        } catch (error) {
            console.error('💥 Erro ao criar admin inicial:', error);
        }
    }
}

// Instanciar o serviço de autenticação
const authService = new AuthService();

// Configurar login form
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                await authService.login(email, password);
            } catch (error) {
                errorDiv.textContent = 'E-mail ou senha inválidos';
                errorDiv.style.display = 'block';
            }
        });
    }

    // Criar admin inicial se necessário
    authService.createInitialAdmin();
});

// REMOVA esta linha - ela está causando o erro!
// createAdminUser();