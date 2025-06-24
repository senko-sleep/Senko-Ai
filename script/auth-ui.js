/**
 * Authentication UI - Handles all authentication UI components and interactions
 * Works with auth-backend.js to provide complete auth system
 */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const authUI = new AuthUIComponents("dark"); // or 'light'
        const container = document.getElementById("auth-container") || document.body;
        const button = authUI.createButton("Sign in with Discord", "primary", "medium");
        
        button.onclick = () => {
            const url = AuthConfig.PROVIDERS.discord.authUrl +
                `?client_id=${AuthConfig.PROVIDERS.discord.clientId}` +
                `&redirect_uri=${encodeURIComponent(AuthConfig.PROVIDERS.discord.redirectUri)}` +
                `&response_type=token` +
                `&scope=${encodeURIComponent(AuthConfig.PROVIDERS.discord.scope)}`;
            window.location.href = url;
        };

        container.appendChild(button);
    } catch (err) {
        console.error("Auth UI init failed:", err);
    }
});


class AuthUIConfig {
    static THEMES = {
        dark: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            background: '#1a1a1a',
            surface: '#2d2d2d',
            text: '#ffffff',
            textSecondary: '#b0b0b0'
        },
        light: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            background: '#ffffff',
            surface: '#f8f9fa',
            text: '#333333',
            textSecondary: '#666666'
        }
    };

    static ANIMATIONS = {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideIn: 'slideInFromRight 0.3s ease-in-out',
        bounce: 'bounce 0.5s ease-in-out'
    };
}

class AuthUIComponents {
    constructor(theme = 'dark') {
        this.theme = AuthUIConfig.THEMES[theme];
        this.currentTheme = theme;
        this.initializeStyles();
    }

    initializeStyles() {
        if (!document.getElementById('auth-ui-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-ui-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes bounce {
                    0%, 20%, 53%, 80%, 100% {
                        animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
                        transform: translate3d(0,0,0);
                    }
                    40%, 43% {
                        animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
                        transform: translate3d(0, -30px, 0);
                    }
                    70% {
                        animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
                        transform: translate3d(0, -15px, 0);
                    }
                    90% {
                        transform: translate3d(0,-4px,0);
                    }
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .auth-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10001;
                    min-width: 300px;
                    max-width: 500px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    setTheme(themeName) {
        this.theme = AuthUIConfig.THEMES[themeName];
        this.currentTheme = themeName;
    }

    createButton(text, variant = 'primary', size = 'medium', icon = null) {
        const button = document.createElement('button');
        const colors = this.theme;

        const sizeMap = {
            small: { padding: '8px 16px', fontSize: '12px' },
            medium: { padding: '12px 24px', fontSize: '14px' },
            large: { padding: '16px 32px', fontSize: '16px' }
        };

        const colorMap = {
            primary: colors.primary,
            secondary: colors.secondary,
            success: colors.success,
            danger: colors.danger,
            warning: colors.warning,
            info: colors.info
        };

        button.innerHTML = `${icon ? `<i class="${icon}"></i> ` : ''}${text}`;
        button.style.cssText = `
            background: ${colorMap[variant]};
            color: white;
            border: none;
            border-radius: 8px;
            padding: ${sizeMap[size].padding};
            font-size: ${sizeMap[size].fontSize};
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            animation: ${AuthUIConfig.ANIMATIONS.fadeIn};
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        return button;
    }

    createCard(title, content, actions = []) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: ${this.theme.surface};
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            color: ${this.theme.text};
            animation: ${AuthUIConfig.ANIMATIONS.fadeIn};
            border: 1px solid ${this.theme.secondary}20;
        `;

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 16px 0;
            color: ${this.theme.text};
            font-size: 20px;
            font-weight: 700;
        `;

        const contentEl = document.createElement('div');
        contentEl.innerHTML = content;
        contentEl.style.cssText = `
            margin-bottom: ${actions.length ? '20px' : '0'};
            color: ${this.theme.textSecondary};
            line-height: 1.5;
        `;

        card.appendChild(titleEl);
        card.appendChild(contentEl);

        if (actions.length) {
            const actionsEl = document.createElement('div');
            actionsEl.style.cssText = `
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            `;
            actions.forEach(action => actionsEl.appendChild(action));
            card.appendChild(actionsEl);
        }

        return card;
    }

    createModal(title, content, size = 'medium') {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: ${AuthUIConfig.ANIMATIONS.fadeIn};
        `;

        const sizeMap = {
            small: '400px',
            medium: '600px',
            large: '800px'
        };

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: ${this.theme.surface};
            border-radius: 16px;
            padding: 32px;
            max-width: ${sizeMap[size]};
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: ${this.theme.text};
            animation: ${AuthUIConfig.ANIMATIONS.slideIn};
            border: 1px solid ${this.theme.secondary}30;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            position: relative;
        `;

        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 24px 0;
            color: ${this.theme.text};
            font-size: 24px;
            font-weight: 700;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            color: ${this.theme.textSecondary};
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = this.theme.danger;
            closeBtn.style.color = 'white';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = this.theme.textSecondary;
        });

        modal.appendChild(closeBtn);
        modal.appendChild(titleEl);
        modal.appendChild(content);

        overlay.appendChild(modal);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on close button
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        return overlay;
    }

    createInput(placeholder, type = 'text', icon = null) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            margin-bottom: 16px;
        `;

        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.style.cssText = `
            width: 100%;
            padding: 16px ${icon ? '50px' : '16px'} 16px 16px;
            border: 2px solid ${this.theme.secondary}40;
            border-radius: 8px;
            background: ${this.theme.background};
            color: ${this.theme.text};
            font-size: 14px;
            transition: all 0.2s ease;
            box-sizing: border-box;
        `;

        input.addEventListener('focus', () => {
            input.style.borderColor = this.theme.primary;
            input.style.boxShadow = `0 0 0 3px ${this.theme.primary}20`;
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = this.theme.secondary + '40';
            input.style.boxShadow = 'none';
        });

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.cssText = `
                position: absolute;
                right: 16px;
                top: 50%;
                transform: translateY(-50%);
                color: ${this.theme.textSecondary};
                pointer-events: none;
            `;
            container.appendChild(iconEl);
        }

        container.appendChild(input);
        return { container, input };
    }

    createUserCard(user, actions = []) {
        const card = document.createElement('div');
        card.style.cssText = `
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: ${this.theme.surface};
            border-radius: 12px;
            border: 1px solid ${this.theme.secondary}30;
            animation: ${AuthUIConfig.ANIMATIONS.fadeIn};
        `;

        const avatar = document.createElement('img');
        avatar.src = user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`;
        avatar.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        `;

        const info = document.createElement('div');
        info.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        const name = document.createElement('div');
        name.textContent = user.username;
        name.style.cssText = `
            font-weight: 600;
            color: ${this.theme.text};
            font-size: 16px;
        `;

        const email = document.createElement('div');
        email.textContent = user.email;
        email.style.cssText = `
            color: ${this.theme.textSecondary};
            font-size: 14px;
            margin-top: 4px;
        `;

        const provider = document.createElement('div');
        provider.textContent = `via ${user.provider}`;
        provider.style.cssText = `
            color: ${this.theme.primary};
            font-size: 12px;
            margin-top: 4px;
            text-transform: uppercase;
            font-weight: 600;
        `;

        info.appendChild(name);
        info.appendChild(email);
        info.appendChild(provider);

        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = `
            display: flex;
            gap: 8px;
        `;
        actions.forEach(action => actionsContainer.appendChild(action));

        card.appendChild(avatar);
        card.appendChild(info);
        if (actions.length) card.appendChild(actionsContainer);

        return card;
    }

    createLoadingSpinner(size = 'medium') {
        const sizeMap = {
            small: '20px',
            medium: '40px',
            large: '60px'
        };

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: ${sizeMap[size]};
            height: ${sizeMap[size]};
            border: 3px solid ${this.theme.secondary}30;
            border-top: 3px solid ${this.theme.primary};
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        `;

        return spinner;
    }

    createToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const colorMap = {
            success: this.theme.success,
            error: this.theme.danger,
            warning: this.theme.warning,
            info: this.theme.info
        };

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.className = 'auth-toast';
        toast.style.cssText = `
            background: ${colorMap[type]};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: ${AuthUIConfig.ANIMATIONS.slideIn};
            margin-bottom: 12px;
        `;

        toast.innerHTML = `
            <i class="${iconMap[type]}"></i>
            <span>${message}</span>
            <button style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                margin-left: auto;
                border-radius: 4px;
                opacity: 0.8;
                transition: opacity 0.2s ease;
            " onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    }

    createApiKeyItem(provider, keyData) {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: ${this.theme.background};
            border-radius: 8px;
            border: 1px solid ${this.theme.secondary}30;
            margin-bottom: 12px;
        `;

        const info = document.createElement('div');
        info.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const providerIcon = document.createElement('div');
        providerIcon.style.cssText = `
            width: 32px;
            height: 32px;
            background: ${this.theme.primary};
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
        `;
        providerIcon.textContent = provider[0];

        const details = document.createElement('div');
        const label = document.createElement('div');
        label.textContent = keyData.label;
        label.style.cssText = `
            font-weight: 600;
            color: ${this.theme.text};
        `;

        const keyPreview = document.createElement('div');
        keyPreview.textContent = keyData.key;
        keyPreview.style.cssText = `
            font-family: monospace;
            color: ${this.theme.textSecondary};
            font-size: 12px;
            margin-top: 4px;
        `;

        details.appendChild(label);
        details.appendChild(keyPreview);
        info.appendChild(providerIcon);
        info.appendChild(details);

        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        const editBtn = this.createButton('Edit', 'secondary', 'small', 'fas fa-edit');
        const deleteBtn = this.createButton('Delete', 'danger', 'small', 'fas fa-trash');

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);

        return { item, editBtn, deleteBtn };
    }
}

class AuthenticationUI {
    constructor(authBackend) {
        this.authBackend = authBackend;
        this.components = new AuthUIComponents();
        this.currentModal = null;

        this.initialize();
    }

    initialize() {
        // Set up event listeners
        this.authBackend.on('user:login', (user) => {
            this.showToast('Successfully logged in!', 'success');
            this.closeModal();
        });

        this.authBackend.on('user:logout', () => {
            this.showToast('Logged out successfully', 'info');
        });

        this.authBackend.on('auth:error', (error) => {
            this.showToast(error.message, 'error');
        });

        this.authBackend.on('apikey:set', ({ provider, label }) => {
            this.showToast(`${label} added successfully`, 'success');
        });

        this.authBackend.on('apikey:removed', ({ provider }) => {
            this.showToast(`${provider} API key removed`, 'info');
        });
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = this.components.createToast(message, type, duration);
        document.body.appendChild(toast);
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    showLoginModal() {
        const content = document.createElement('div');

        const description = document.createElement('p');
        description.textContent = 'Sign in to access your personalized chat experience and manage your API keys.';
        description.style.cssText = `
            color: ${this.components.theme.textSecondary};
            margin-bottom: 24px;
            line-height: 1.5;
        `;

        const providersContainer = document.createElement('div');
        providersContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        // Discord Login Button
        const discordBtn = this.components.createButton('Continue with Discord', 'primary', 'large', 'fab fa-discord');
        discordBtn.style.background = '#5865F2';
        discordBtn.addEventListener('click', async () => {
            discordBtn.disabled = true;
            discordBtn.innerHTML = '<div class="spinner"></div> Signing in...';

            try {
                await this.authBackend.login('discord');
            } catch (error) {
                discordBtn.disabled = false;
                discordBtn.innerHTML = '<i class="fab fa-discord"></i> Continue with Discord';
            }
        });

        // Google Login Button
        const googleBtn = this.components.createButton('Continue with Google', 'secondary', 'large', 'fab fa-google');
        googleBtn.style.background = '#db4437';
        googleBtn.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<div class="spinner"></div> Signing in...';

            try {
                await this.authBackend.login('google');
            } catch (error) {
                googleBtn.disabled = false;
                googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
            }
        });

        providersContainer.appendChild(discordBtn);
        providersContainer.appendChild(googleBtn);

        content.appendChild(description);
        content.appendChild(providersContainer);

        this.currentModal = this.components.createModal('Sign In', content, 'small');
        document.body.appendChild(this.currentModal);
    }

    showUserProfile() {
        const user = this.authBackend.getCurrentUser();
        if (!user) return;

        const content = document.createElement('div');

        // User Info Section
        const userCard = this.components.createUserCard(user);

        // Preferences Section
        const preferences = this.authBackend.getUserPreferences();
        const prefsSection = document.createElement('div');
        prefsSection.style.marginTop = '24px';

        const prefsTitle = document.createElement('h4');
        prefsTitle.textContent = 'Preferences';
        prefsTitle.style.cssText = `
            color: ${this.components.theme.text};
            margin-bottom: 16px;
        `;

        const themeToggle = document.createElement('div');
        themeToggle.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: ${this.components.theme.background};
            border-radius: 8px;
            margin-bottom: 12px;
        `;

        const themeLabel = document.createElement('span');
        themeLabel.textContent = 'Dark Theme';
        themeLabel.style.color = this.components.theme.text;

        const themeSwitch = document.createElement('input');
        themeSwitch.type = 'checkbox';
        themeSwitch.checked = preferences.theme === 'dark';
        themeSwitch.addEventListener('change', () => {
            const newTheme = themeSwitch.checked ? 'dark' : 'light';
            this.authBackend.setUserPreferences({ theme: newTheme });
            this.components.setTheme(newTheme);
        });

        themeToggle.appendChild(themeLabel);
        themeToggle.appendChild(themeSwitch);

        prefsSection.appendChild(prefsTitle);
        prefsSection.appendChild(themeToggle);

        // Actions
        const logoutBtn = this.components.createButton('Logout', 'danger', 'medium', 'fas fa-sign-out-alt');
        logoutBtn.addEventListener('click', () => {
            this.authBackend.logout();
            this.closeModal();
        });

        const apiKeysBtn = this.components.createButton('Manage API Keys', 'primary', 'medium', 'fas fa-key');
        apiKeysBtn.addEventListener('click', () => {
            this.closeModal();
            this.showApiKeysModal();
        });

        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 12px;
            margin-top: 24px;
            flex-wrap: wrap;
        `;
        actions.appendChild(apiKeysBtn);
        actions.appendChild(logoutBtn);

        content.appendChild(userCard);
        content.appendChild(prefsSection);
        content.appendChild(actions);

        this.currentModal = this.components.createModal('Profile', content, 'medium');
        document.body.appendChild(this.currentModal);
    }

    showApiKeysModal() {
        const content = document.createElement('div');

        const description = document.createElement('p');
        description.textContent = 'Manage your API keys to enable AI model access. Your keys are stored securely and never shared.';
        description.style.cssText = `
            color: ${this.components.theme.textSecondary};
            margin-bottom: 24px;
            line-height: 1.5;
        `;

        const apiKeys = this.authBackend.getAllApiKeys();
        const keysContainer = document.createElement('div');
        keysContainer.style.marginBottom = '24px';

        if (apiKeys.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = `
                text-align: center;
                padding: 40px;
                color: ${this.components.theme.textSecondary};
            `;
            emptyState.innerHTML = `
                <i class="fas fa-key" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No API keys configured yet</p>
            `;
            keysContainer.appendChild(emptyState);
        } else {
            apiKeys.forEach(keyData => {
                const { item, editBtn, deleteBtn } = this.components.createApiKeyItem(keyData.provider, keyData);

                editBtn.addEventListener('click', () => {
                    this.showAddApiKeyModal(keyData.provider, keyData);
                });

                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Remove ${keyData.label}?`)) {
                        this.authBackend.removeApiKey(keyData.provider);
                        this.closeModal();
                        this.showApiKeysModal();
                    }
                });

                keysContainer.appendChild(item);
            });
        }

        const addBtn = this.components.createButton('Add API Key', 'primary', 'medium', 'fas fa-plus');
        addBtn.addEventListener('click', () => {
            this.showAddApiKeyModal();
        });

        content.appendChild(description);
        content.appendChild(keysContainer);
        content.appendChild(addBtn);

        this.currentModal = this.components.createModal('API Keys', content, 'medium');
        document.body.appendChild(this.currentModal);
    }

    showAddApiKeyModal(provider = null, existingKey = null) {
        const content = document.createElement('div');

        const isEditing = !!existingKey;
        const title = isEditing ? 'Edit API Key' : 'Add API Key';

        // Provider Selection
        if (!isEditing) {
            const providerLabel = document.createElement('label');
            providerLabel.textContent = 'Provider';
            providerLabel.style.cssText = `
                display: block;
                margin-bottom: 8px;
                color: ${this.components.theme.text};
                font-weight: 600;
            `;

            const providerSelect = document.createElement('select');
            providerSelect.style.cssText = `
                width: 100%;
                padding: 12px;
                border: 2px solid ${this.components.theme.secondary}40;
                border-radius: 8px;
                background: ${this.components.theme.background};
                color: ${this.components.theme.text};
                margin-bottom: 16px;
            `;

            ['groq', 'openai', 'anthropic', 'google'].forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                providerSelect.appendChild(option);
            });

            content.appendChild(providerLabel);
            content.appendChild(providerSelect);
            provider = providerSelect.value;

            providerSelect.addEventListener('change', () => {
                provider = providerSelect.value;
            });
        }

        // API Key Input
        const { container: keyContainer, input: keyInput } = this.components.createInput(
            'Enter your API key',
            'password',
            'fas fa-key'
        );

        if (existingKey) {
            keyInput.value = existingKey.key;
        }

        // Label Input
        const { container: labelContainer, input: labelInput } = this.components.createInput(
            'Label (optional)',
            'text',
            'fas fa-tag'
        );
        if (existingKey) {
            labelInput.value = existingKey.label || '';
        }

        // Append all to the main container
        content.appendChild(keyContainer);
        content.appendChild(labelContainer);

        // Show modal or container
        this.modal.setContent(content);
    }
_}