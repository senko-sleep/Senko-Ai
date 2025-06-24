/**
 * Authentication Backend - Handles auth logic, storage, and API management
 * Integrates with Senko Chat system for seamless user experience
 */

class AuthConfig {
    static PROVIDERS = {
        discord: {
            clientId: '1234247716243112100',
            redirectUri: window.location.origin + '/auth/callback',
            scope: 'identify email',
            authUrl: 'https://discord.com/api/oauth2/authorize'
        },
        google: {
            clientId: '256022136646-9172aomhtjka004mfplgs7pebj0rcs1q.apps.googleusercontent.com',
            redirectUri: window.location.origin + '/auth/callback',
            scope: 'openid profile email',
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
        }
    };

    static STORAGE_KEYS = {
        userSession: 'senko_user_session',
        userApiKeys: 'senko_user_api_keys',
        userPreferences: 'senko_user_preferences',
        authToken: 'senko_auth_token'
    };

    static SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
}

class StorageManager {
    constructor() {
        this.isAvailable = this.checkStorageAvailability();
        this.memoryStorage = new Map(); // Fallback for when localStorage isn't available
    }

    checkStorageAvailability() {
        try {
            const test = 'storage_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using memory storage');
            return false;
        }
    }

    setItem(key, value) {
        const data = {
            value: value,
            timestamp: Date.now(),
            expires: Date.now() + AuthConfig.SESSION_DURATION
        };

        if (this.isAvailable) {
            localStorage.setItem(key, JSON.stringify(data));
        } else {
            this.memoryStorage.set(key, data);
        }
    }

    getItem(key) {
        let data;
        
        if (this.isAvailable) {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            data = JSON.parse(stored);
        } else {
            data = this.memoryStorage.get(key);
            if (!data) return null;
        }

        // Check if expired
        if (data.expires && Date.now() > data.expires) {
            this.removeItem(key);
            return null;
        }

        return data.value;
    }

    removeItem(key) {
        if (this.isAvailable) {
            localStorage.removeItem(key);
        } else {
            this.memoryStorage.delete(key);
        }
    }

    clear() {
        if (this.isAvailable) {
            Object.values(AuthConfig.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } else {
            this.memoryStorage.clear();
        }
    }
}

class AuthProvider {
    constructor(storage) {
        this.storage = storage;
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    buildAuthUrl(provider) {
        const config = AuthConfig.PROVIDERS[provider];
        const state = this.generateState();
        
        // Store state for validation
        this.storage.setItem('auth_state', state);
        
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scope,
            state: state
        });

        return `${config.authUrl}?${params.toString()}`;
    }

    async initiateAuth(provider) {
        try {
            const authUrl = this.buildAuthUrl(provider);
            
            // Open popup for auth
            const popup = window.open(
                authUrl,
                'auth_popup',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );

            return new Promise((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        reject(new Error('Authentication cancelled'));
                    }
                }, 1000);

                // Listen for auth completion
                window.addEventListener('message', (event) => {
                    if (event.origin !== window.location.origin) return;
                    
                    if (event.data.type === 'AUTH_SUCCESS') {
                        clearInterval(checkClosed);
                        popup.close();
                        resolve(event.data.user);
                    } else if (event.data.type === 'AUTH_ERROR') {
                        clearInterval(checkClosed);
                        popup.close();
                        reject(new Error(event.data.error));
                    }
                }, { once: true });
            });
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async mockAuthFlow(provider) {
        // Mock authentication for demo purposes
        // In production, replace with actual OAuth flow
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: Math.random().toString(36).substring(7),
                    username: `User_${Math.random().toString(36).substring(7)}`,
                    email: `user@${provider}.com`,
                    avatar: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
                    provider: provider,
                    createdAt: new Date().toISOString()
                };
                resolve(mockUser);
            }, 1500);
        });
    }

    async login(provider) {
        try {
            // Use mock auth for demo - replace with actual OAuth
            const userData = await this.mockAuthFlow(provider);
            
            this.currentUser = userData;
            this.isAuthenticated = true;
            
            // Store user session
            this.storage.setItem(AuthConfig.STORAGE_KEYS.userSession, userData);
            this.storage.setItem(AuthConfig.STORAGE_KEYS.authToken, {
                token: Math.random().toString(36),
                provider: provider,
                expiresAt: Date.now() + AuthConfig.SESSION_DURATION
            });

            return userData;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.storage.clear();
    }

    restoreSession() {
        const userData = this.storage.getItem(AuthConfig.STORAGE_KEYS.userSession);
        const authToken = this.storage.getItem(AuthConfig.STORAGE_KEYS.authToken);
        
        if (userData && authToken) {
            this.currentUser = userData;
            this.isAuthenticated = true;
            return userData;
        }
        
        return null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

class ApiKeyManager {
    constructor(storage) {
        this.storage = storage;
        this.userApiKeys = new Map();
    }

    loadUserApiKeys(userId) {
        const keys = this.storage.getItem(`${AuthConfig.STORAGE_KEYS.userApiKeys}_${userId}`);
        if (keys) {
            this.userApiKeys = new Map(Object.entries(keys));
        }
        return this.userApiKeys;
    }

    saveUserApiKeys(userId) {
        const keysObject = Object.fromEntries(this.userApiKeys);
        this.storage.setItem(`${AuthConfig.STORAGE_KEYS.userApiKeys}_${userId}`, keysObject);
    }

    setApiKey(userId, provider, apiKey, label = null) {
        const keyData = {
            key: apiKey,
            provider: provider,
            label: label || `${provider} Key`,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            isActive: true
        };

        this.userApiKeys.set(provider, keyData);
        this.saveUserApiKeys(userId);
    }

    getApiKey(userId, provider) {
        if (!this.userApiKeys.has(provider)) {
            this.loadUserApiKeys(userId);
        }
        
        const keyData = this.userApiKeys.get(provider);
        if (keyData && keyData.isActive) {
            // Update last used timestamp
            keyData.lastUsed = new Date().toISOString();
            this.saveUserApiKeys(userId);
            return keyData.key;
        }
        
        return null;
    }

    getAllApiKeys(userId) {
        this.loadUserApiKeys(userId);
        return Array.from(this.userApiKeys.entries()).map(([provider, data]) => ({
            provider,
            ...data,
            key: data.key.substring(0, 8) + '...' // Masked for security
        }));
    }

    removeApiKey(userId, provider) {
        this.userApiKeys.delete(provider);
        this.saveUserApiKeys(userId);
    }

    hasApiKey(userId, provider) {
        this.loadUserApiKeys(userId);
        const keyData = this.userApiKeys.get(provider);
        return keyData && keyData.isActive;
    }
}

class UserPreferencesManager {
    constructor(storage) {
        this.storage = storage;
        this.defaultPreferences = {
            theme: 'dark',
            defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
            autoSave: true,
            notifications: true,
            language: 'en',
            chatSettings: {
                temperature: 0.8,
                maxTokens: 2000,
                historyLimit: 20
            }
        };
    }

    getUserPreferences(userId) {
        const prefs = this.storage.getItem(`${AuthConfig.STORAGE_KEYS.userPreferences}_${userId}`);
        return { ...this.defaultPreferences, ...prefs };
    }

    setUserPreferences(userId, preferences) {
        const currentPrefs = this.getUserPreferences(userId);
        const updatedPrefs = { ...currentPrefs, ...preferences };
        this.storage.setItem(`${AuthConfig.STORAGE_KEYS.userPreferences}_${userId}`, updatedPrefs);
        return updatedPrefs;
    }

    resetUserPreferences(userId) {
        this.storage.setItem(`${AuthConfig.STORAGE_KEYS.userPreferences}_${userId}`, this.defaultPreferences);
        return this.defaultPreferences;
    }
}

class AuthEventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

// Main Authentication Backend Class
class AuthenticationBackend {
    constructor() {
        this.storage = new StorageManager();
        this.authProvider = new AuthProvider(this.storage);
        this.apiKeyManager = new ApiKeyManager(this.storage);
        this.preferencesManager = new UserPreferencesManager(this.storage);
        this.eventManager = new AuthEventManager();
        
        this.initialize();
    }

    initialize() {
        // Try to restore existing session
        const user = this.authProvider.restoreSession();
        if (user) {
            this.apiKeyManager.loadUserApiKeys(user.id);
            this.eventManager.emit('user:restored', user);
        }
    }

    // Authentication Methods
    async login(provider) {
        try {
            const user = await this.authProvider.login(provider);
            this.apiKeyManager.loadUserApiKeys(user.id);
            this.eventManager.emit('user:login', user);
            return user;
        } catch (error) {
            this.eventManager.emit('auth:error', error);
            throw error;
        }
    }

    logout() {
        const user = this.authProvider.getCurrentUser();
        this.authProvider.logout();
        this.eventManager.emit('user:logout', user);
    }

    getCurrentUser() {
        return this.authProvider.getCurrentUser();
    }

    isAuthenticated() {
        return this.authProvider.isUserAuthenticated();
    }

    // API Key Methods
    setApiKey(provider, apiKey, label) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        this.apiKeyManager.setApiKey(user.id, provider, apiKey, label);
        this.eventManager.emit('apikey:set', { provider, label });
    }

    getApiKey(provider) {
        const user = this.getCurrentUser();
        if (!user) return null;
        
        return this.apiKeyManager.getApiKey(user.id, provider);
    }

    getAllApiKeys() {
        const user = this.getCurrentUser();
        if (!user) return [];
        
        return this.apiKeyManager.getAllApiKeys(user.id);
    }

    removeApiKey(provider) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        this.apiKeyManager.removeApiKey(user.id, provider);
        this.eventManager.emit('apikey:removed', { provider });
    }

    hasApiKey(provider) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        return this.apiKeyManager.hasApiKey(user.id, provider);
    }

    // Preferences Methods
    getUserPreferences() {
        const user = this.getCurrentUser();
        if (!user) return this.preferencesManager.defaultPreferences;
        
        return this.preferencesManager.getUserPreferences(user.id);
    }

    setUserPreferences(preferences) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const updated = this.preferencesManager.setUserPreferences(user.id, preferences);
        this.eventManager.emit('preferences:updated', updated);
        return updated;
    }

    // Event Management
    on(event, callback) {
        this.eventManager.on(event, callback);
    }

    off(event, callback) {
        this.eventManager.off(event, callback);
    }

    // Integration with Senko Chat
    integrateSenkoChat(senkoInstance) {
        // Auto-set API key when user logs in
        this.on('user:login', (user) => {
            const groqKey = this.getApiKey('groq');
            if (groqKey && senkoInstance.apiHandler) {
                senkoInstance.apiHandler.setApiKey(groqKey);
            }
        });

        // Auto-set API key when restored
        this.on('user:restored', (user) => {
            const groqKey = this.getApiKey('groq');
            if (groqKey && senkoInstance.apiHandler) {
                senkoInstance.apiHandler.setApiKey(groqKey);
            }
        });

        // Clear API key on logout
        this.on('user:logout', () => {
            if (senkoInstance.apiHandler) {
                senkoInstance.apiHandler.setApiKey('');
            }
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthenticationBackend, AuthConfig };
} else {
    window.AuthenticationBackend = AuthenticationBackend;
    window.AuthConfig = AuthConfig;
}