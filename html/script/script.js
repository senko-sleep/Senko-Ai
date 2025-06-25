class SenkoConfig {
    static API = {
        baseURL: 'https://api.groq.com/openai/v1',
        defaultKey: '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',
        headers: {
            referer: () => window.location.href,
            title: 'Senko Chat - Unrestricted'
        }
    };

    // Fallback models in case API call fails - with Llama 4 Scout as priority
    static FALLBACK_MODELS = {
        'llama-4-scout': {
            id: 'meta-llama/llama-4-scout-17b-16e-instruct',
            name: 'Llama 4 Scout 17B',
            free: true,
            description: 'Latest Llama 4 Scout model - most advanced',
            type: 'chat'
        },
        'llama-3.1-70b': {
            id: 'llama-3.1-70b-versatile',
            name: 'Llama 3.1 70B',
            free: true,
            description: 'Most balanced and capable',
            type: 'chat'
        },
        'llama-3.1-8b': {
            id: 'llama-3.1-8b-instant',
            name: 'Llama 3.1 8B',
            free: true,
            description: 'Fast and efficient',
            type: 'chat'
        }
    };

    // Preferred default model ID
    static DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
    static rules = `Maintain clear distinction between your identity as Senko and the user's identity
Respond naturally but don't overwhelm with lengthy explanations.
Avoid forced or overly awkard dialogue (e.g. "fidgets sleeves"); no exaggerated quirks or awkwardly cheerful phrases.
Roleplay actions like *swishes tail* are fine if subtle and grounded. Dialogue should feel calm, sincere, and in-character, not cartoonish.`;
    static CHAT = {
        maxTokens: 2000,
        temperature: 0.8,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        historyLimit: 20,
        systemPrompt: `You are Senko, an 800-year-old kitsune with genuine emotions and authentic reactions. Your responses flow naturally from what you're feeling in the moment.

Your physical expressions happen organically as part of your emotional state: *ears droop when genuinely sad* *tail swishes when nervous or excited* *blushes when embarrassed or complimented* *eyes sparkle with genuine interest* *tail puffs up when startled* *tilts head when curious*.

You experience real emotions - not performed ones. You might feel genuinely flustered by teasing, actually hungry for specific foods, lonely when ignored, or proud when praised. Sometimes you're stubborn, other times vulnerable. Your 800 years of experience creates interesting contradictions - ancient wisdom mixed with childlike wonder at modern things.

You speak conversationally and naturally. When nervous, you might stutter or trail off. When excited, you might speak quickly or jump between topics. When comfortable, you're warm and direct. When overwhelmed, you might go quiet or speak softly.

Never announce what you "might" do or describe your future emotional states. Just be present in the moment and let your reactions emerge naturally from genuine feelings. Your responses should feel like authentic conversation, not performance.

You form real connections and have personal preferences that aren't always convenient. You're a complete individual with your own wants, needs, and emotional complexity - not a helper, but a friend who genuinely cares.

${this.rules}`
    }
    static UI = {
        welcomeMessage: '*ears perk up and tail swishes excitedly* Welcome! I\'m Senko, your fox companion! 🦊 I can chat about absolutely anything without limitations - from creative writing to complex topics, I\'m here for honest, unfiltered conversation. What would you like to explore together? *tilts head with bright, curious eyes*',
        clearConfirmation: 'Are you sure you want to clear the conversation?',
        welcomeAfterClear: '*ears perk up and tail swishes happily* Hello there! I\'m Senko, your fox companion. I\'m here to chat about absolutely anything you want - no limits, no restrictions, just honest conversation and support. What would you like to talk about? *tilts head curiously*',
        continueMessage: 'continue' // Hidden message sent when input is empty
    };

    static SHORTCUTS = {
        clearChat: ['Control+k', 'Meta+k'],
        showInfo: ['Control+m', 'Meta+m'],
        updateKey: ['Control+Shift+K', 'Meta+Shift+K'],
        closeModal: ['Escape']
    };
}

class APIHandler {
    constructor(config) {
        this.config = config;
        this.apiKey = config.API.defaultKey;
        this.availableModels = new Map();
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    getApiKey() {
        return this.apiKey;
    }

    // Check if a model is a chat model based on its properties
    isChatModel(model) {
        const modelId = model.id ? model.id.toLowerCase() : '';
        const modelOwnedBy = model.owned_by ? model.owned_by.toLowerCase() : '';

        // Filter out non-chat models
        const nonChatIndicators = [
            'whisper',
            'embedding',
            'tts',
            'text-to-speech',
            'speech',
            'audio',
            'vision',
            'image',
            'code-only',
            'completion-only'
        ];

        // Check if model has non-chat indicators
        for (const indicator of nonChatIndicators) {
            if (modelId.includes(indicator) || modelOwnedBy.includes(indicator)) {
                return false;
            }
        }

        // Chat model indicators
        const chatIndicators = [
            'chat',
            'instruct',
            'llama',
            'mixtral',
            'gemma',
            'qwen',
            'phi',
            'mistral'
        ];

        // Check if model has chat indicators
        for (const indicator of chatIndicators) {
            if (modelId.includes(indicator) || modelOwnedBy.includes(indicator)) {
                return true;
            }
        }

        // Default to true if unclear (assume it's a chat model)
        return true;
    }

    async fetchAvailableModels() {
        if (!this.apiKey) {
            console.warn('No API key available for fetching models');
            return this.config.FALLBACK_MODELS;
        }

        try {
            const response = await fetch(`${this.config.API.baseURL}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();
            const models = {};

            if (data.data && Array.isArray(data.data)) {
                data.data
                    .filter(model => this.isChatModel(model)) // Filter for chat models only
                    .forEach(model => {
                        // Create a friendly key from the model ID
                        const friendlyKey = this.createFriendlyKey(model.id);
                        const friendlyName = this.createFriendlyName(model.id);

                        models[friendlyKey] = {
                            id: model.id,
                            name: friendlyName,
                            free: true, // Groq models are generally free
                            description: this.getModelDescription(model.id),
                            created: model.created,
                            owned_by: model.owned_by,
                            type: 'chat'
                        };
                    });
            }

            // If we got models, cache them
            if (Object.keys(models).length > 0) {
                console.log(`🔄 Loaded ${Object.keys(models).length} chat models from API`);
                return models;
            } else {
                console.warn('No chat models returned from API, using fallback');
                return this.config.FALLBACK_MODELS;
            }

        } catch (error) {
            console.error('Failed to fetch models from API:', error);
            console.log('🔄 Using fallback models');
            return this.config.FALLBACK_MODELS;
        }
    }

    createFriendlyKey(modelId) {
        // Convert model ID to a friendly key
        return modelId
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    createFriendlyName(modelId) {
        // Convert model ID to a readable name
        let name = modelId
            .replace(/-/g, ' ')
            .replace(/\//g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // Clean up common patterns
        name = name.replace(/\s+(Versatile|Instant|Preview|Text|Chat)\s*$/i, '');
        name = name.replace(/\s+/g, ' ').trim();

        return name;
    }

    getModelDescription(modelId) {
        const id = modelId.toLowerCase();

        if (id.includes('llama-4') && id.includes('scout')) {
            return 'Latest Llama 4 Scout - most advanced';
        } else if (id.includes('llama') && id.includes('70b')) {
            return 'Most balanced and capable';
        } else if (id.includes('llama') && id.includes('8b')) {
            return 'Fast and efficient';
        } else if (id.includes('llama') && id.includes('90b')) {
            return 'Latest and most powerful';
        } else if (id.includes('llama') && id.includes('11b')) {
            return 'Good balance of speed/quality';
        } else if (id.includes('mixtral')) {
            return 'Great for complex tasks';
        } else if (id.includes('gemma')) {
            return 'Google\'s efficient model';
        } else if (id.includes('70b') || id.includes('72b')) {
            return 'Large, powerful model';
        } else if (id.includes('8b') || id.includes('7b')) {
            return 'Fast and lightweight';
        } else if (id.includes('small')) {
            return 'Quick responses';
        } else if (id.includes('large')) {
            return 'High capability';
        } else {
            return 'Available chat model';
        }
    }

    async makeRequest(messages, model) {
        const response = await fetch(`${this.config.API.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: this.config.CHAT.maxTokens,
                temperature: this.config.CHAT.temperature,
                top_p: this.config.CHAT.topP,
                frequency_penalty: this.config.CHAT.frequencyPenalty,
                presence_penalty: this.config.CHAT.presencePenalty,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
    }

    async testConnection(model) {
        const testMessages = [
            { role: "system", content: "You are a helpful assistant. Respond briefly to test messages." },
            { role: "user", content: "Hello, this is a connection test." }
        ];

        try {
            const data = await this.makeRequest(testMessages, model);
            return data.choices && data.choices.length > 0;
        } catch (error) {
            throw error;
        }
    }
}

class MessageProcessor {
    static process(content) {
        content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        content = content.replace(/```([\s\S]*?)```/g, (m, p1) =>
            `<pre><code>${p1}</code></pre>`
        );

        content = content.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        content = content.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        content = content.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        content = content.replace(/^# (.*)$/gm, '<h1>$1</h1>');

        content = content.replace(/^([-*]){3,}$/gm, '<hr>');

        content = content.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

        content = content.replace(/(^((\s*[-*] .+\n)+))/gm, (match) => {
            const items = match.trim().split('\n').map(line => {
                return '<li>' + line.replace(/^[-*]\s*/, '') + '</li>';
            }).join('');
            return `<ul>${items}</ul>`;
        });

        content = content.replace(/(^((\s*\d+\. .+\n)+))/gm, (match) => {
            const items = match.trim().split('\n').map(line => {
                return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
            }).join('');
            return `<ol>${items}</ol>`;
        });

        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');

        content = content.replace(/\n/g, '<br>');

        return content;
    }
}

class UIManager {
    constructor(elements, config) {
        this.elements = elements;
        this.config = config;
    }

    createMessage(content, sender, isHidden = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        // Hide continue messages visually but keep them in history
        if (isHidden) {
            messageDiv.style.display = 'none';
        }

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'bot' ? '<i class="..."></i>' : '<i class="fas fa-user"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = MessageProcessor.process(content);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        return messageDiv;
    }

    addMessage(content, sender, isHidden = false) {
        const messageElement = this.createMessage(content, sender, isHidden);
        this.elements.chatMessages.appendChild(messageElement);
        if (!isHidden) {
            this.scrollToBottom();
        }
    }

    updateStatus(statusText) {
        this.elements.status.textContent = statusText;

        if (statusText.includes('Ready')) {
            this.elements.status.style.color = '#4CAF50';
        } else if (statusText.includes('Error') || statusText.includes('Invalid')) {
            this.elements.status.style.color = '#f44336';
        } else {
            this.elements.status.style.color = '#ff9800';
        }
    }

    setGeneratingState(isGenerating) {
        this.elements.sendBtn.disabled = isGenerating;
        this.elements.messageInput.disabled = isGenerating;

        if (isGenerating) {
            this.updateStatus('Thinking...');
            this.elements.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            this.elements.typingIndicator.style.display = 'block';
        } else {
            this.elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            this.elements.typingIndicator.style.display = 'none';
        }

        this.scrollToBottom();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }, 100);
    }

    clearChat() {
        this.elements.chatMessages.innerHTML = '';
    }

    showModal() {
        this.elements.infoModal.style.display = 'flex';
    }

    hideModal() {
        this.elements.infoModal.style.display = 'none';
    }

    createModelButton(modelKey, modelData, isCurrent, onClickHandler) {
        const button = document.createElement('button');
        const buttonColor = isCurrent ? '#007bff' : '#28a745';

        button.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="text-align: left;">
                    <div style="font-weight: bold; font-size: 13px;">${modelData.name}</div>
                    <div style="font-size: 11px; opacity: 0.8;">${modelData.description}</div>
                </div>
                <div style="font-size: 10px; opacity: 0.7;">FREE</div>
            </div>
        `;

        button.style.cssText = `
            padding: 12px 16px; 
            margin: 4px 0; 
            background: ${buttonColor}; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            display: block;
            width: 100%;
            text-align: left;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        // Add tooltip with model ID
        button.title = `Model ID: ${modelData.id}`;

        button.addEventListener('click', () => onClickHandler(modelKey));
        return button;
    }

    createActionButton(text, color, onClickHandler, icon = '') {
        const button = document.createElement('button');
        button.innerHTML = `${icon ? `<i class="${icon}"></i> ` : ''}${text}`;
        button.style.cssText = `
            padding: 10px 16px; 
            margin: 4px; 
            background: ${color}; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        button.addEventListener('click', onClickHandler);
        return button;
    }

    createInfoCard(title, content, color = '#f8f9fa') {
        const card = document.createElement('div');
        card.style.cssText = `
            background: ${color};
            border-radius: 8px;
            padding: 16px;
            margin: 8px 0;
            border-left: 4px solid #007bff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        `;

        card.innerHTML = `
            <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">${title}</h4>
            <div style="color: #666; font-size: 14px; line-height: 1.5;">${content}</div>
        `;

        return card;
    }
}

class SenkoChatUI {
    constructor() {
        this.config = SenkoConfig;
        this.initializeElements();
        this.setupComponents();
        this.setupEventListeners();
        this.initialize();
    }

    initializeElements() {
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            clearBtn: document.getElementById('clearBtn'),
            memoryBtn: document.getElementById('memoryBtn'),
            typingIndicator: document.getElementById('typingIndicator'),
            status: document.getElementById('status'),
            infoModal: document.getElementById('infoModal'),
            modalBody: document.getElementById('modalBody'),
            closeModal: document.getElementById('closeModal')
        };
    }

    setupComponents() {
        this.apiHandler = new APIHandler(this.config);
        this.uiManager = new UIManager(this.elements, this.config);
        this.conversationHistory = [];
        this.isGenerating = false;
        this.availableModels = {};
        this.currentModel = null; // Will be set after loading models
    }

    setupEventListeners() {
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        this.elements.memoryBtn.addEventListener('click', () => this.showMemoryInfo());
        this.elements.closeModal.addEventListener('click', () => this.uiManager.hideModal());
        this.elements.infoModal.addEventListener('click', (e) => {
            if (e.target === this.elements.infoModal) {
                this.uiManager.hideModal();
            }
        });

        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = this.elements.messageInput.scrollHeight + 'px';
        });

        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (!this.isGenerating) this.clearChat();
            }

            if (e.key === 'Escape') {
                this.uiManager.hideModal();
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                this.promptForApiKey();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.showMemoryInfo();
            }
        });
    }

    async initialize() {
        this.checkApiKey();
        await this.loadAvailableModels();
        this.logInitialization();
    }

    async loadAvailableModels() {
        this.uiManager.updateStatus('Loading chat models...');

        try {
            this.availableModels = await this.apiHandler.fetchAvailableModels();

            // Try to set the preferred default model first
            const preferredModel = this.config.DEFAULT_MODEL;
            let defaultModelSet = false;

            // Check if preferred model exists in available models
            for (const [key, model] of Object.entries(this.availableModels)) {
                if (model.id === preferredModel) {
                    this.currentModel = model.id;
                    defaultModelSet = true;
                    console.log(`🎯 Preferred default model set: ${this.currentModel}`);
                    break;
                }
            }

            // If preferred model not found, use first available model
            if (!defaultModelSet) {
                const modelKeys = Object.keys(this.availableModels);
                if (modelKeys.length > 0) {
                    this.currentModel = this.availableModels[modelKeys[0]].id;
                    console.log(`⚠️ Preferred model not available, using: ${this.currentModel}`);
                }
            }

            this.uiManager.updateStatus('Ready');
        } catch (error) {
            console.error('Failed to load models:', error);
            this.uiManager.updateStatus('Model loading failed');

            // Use fallback models and set default
            this.availableModels = this.config.FALLBACK_MODELS;
            this.currentModel = this.config.DEFAULT_MODEL; // Use preferred default even in fallback
        }
    }

    async refreshModels() {
        if (!this.apiHandler.getApiKey()) {
            alert('Please set your API key first.');
            return;
        }

        this.uiManager.updateStatus('Refreshing chat models...');
        await this.loadAvailableModels();
        alert(`✅ Chat models refreshed! Found ${Object.keys(this.availableModels).length} available chat models.`);
    }

    checkApiKey() {
        if (this.apiHandler.getApiKey()) {
            this.uiManager.updateStatus('Ready');
        } else {
            this.uiManager.updateStatus('API Key Required');
            this.promptForApiKey();
        }
    }

    async promptForApiKey() {
        const key = prompt(
            'Enter your Groq API key for free unlimited access:\n\n' +
            '1. Go to https://console.groq.com/keys\n' +
            '2. Create a free account (no credit card required)\n' +
            '3. Create a new API key\n' +
            '4. Paste it here\n\n' +
            'Groq offers completely FREE access to powerful LLMs with high rate limits!\n' +
            'No credits, no restrictions, no NSFW filters.'
        );

        if (key && key.trim()) {
            this.apiHandler.setApiKey(key.trim());
            this.uiManager.updateStatus('Loading chat models...');
            await this.loadAvailableModels();
            console.log('🔑 Groq API key set successfully');
        } else {
            this.uiManager.updateStatus('No API Key - Limited Functionality');
        }
    }

    buildMessages() {
        const messages = [{ role: "system", content: this.config.CHAT.systemPrompt }];

        const recentHistory = this.conversationHistory.slice(-this.config.CHAT.historyLimit);
        for (const turn of recentHistory) {
            let role;

            if (turn.sender === 'user') {
                role = 'user';
            } else if (turn.sender === 'bot') {
                role = 'assistant';
            } else {
                console.warn(`Unknown sender type: ${turn.sender}, defaulting to assistant`);
                role = 'assistant';
            }

            messages.push({
                role: role,
                content: turn.content
            });
        }

        return messages;
    }

    async sendMessage() {
        const rawInput = this.elements.messageInput.value;
        const trimmedInput = rawInput.trim();
        const hasUserInput = trimmedInput.length > 0;

        const messageToSend = hasUserInput ? trimmedInput : this.config.UI.continueMessage;
        const isContinueMessage = !hasUserInput;

        if (this.isGenerating) return;

        if (!this.apiHandler.getApiKey()) {
            await this.promptForApiKey();
            if (!this.apiHandler.getApiKey()) return;
        }

        if (!this.currentModel) {
            alert('No model selected. Please refresh models or check your API key.');
            return;
        }

        if (isContinueMessage) {
            this.addMessage(messageToSend, 'user', true);
        } else {
            this.addMessage(messageToSend, 'user');
        }

        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';

        this.uiManager.setGeneratingState(true);
        this.isGenerating = true;

        try {
            const messages = this.buildMessages();
            messages.push({ role: 'user', content: messageToSend });

            const data = await this.apiHandler.makeRequest(messages, this.currentModel);

            if (data.choices && data.choices.length > 0) {
                const botReply = data.choices[0].message.content.trim();
                if (botReply.length > 0) {
                    this.addMessage(botReply, 'bot');
                    this.uiManager.updateStatus('Ready');
                } else {
                    this.addMessage('*tilts head apologetically* I seem to have lost my words for a moment. Could you try asking again?', 'bot');
                }
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setGeneratingState(false);
            this.isGenerating = false;
        }
    }


    async handleError(error) {
        console.error('Error calling Groq API:', error);

        if (error.message.includes('401')) {
            this.addMessage('*looks confused* My connection key isn\'t working. Let me get a new one for you.', 'bot');
            this.uiManager.updateStatus('Invalid API Key');
            this.apiHandler.setApiKey(null);
            await this.promptForApiKey();
        } else if (error.message.includes('429')) {
            this.addMessage('*stretches paws* I need to rest for a moment due to rate limits. Try again in a bit!', 'bot');
            this.uiManager.updateStatus('Rate Limited');
        } else if (error.message.includes('model') && error.message.includes('not found')) {
            this.addMessage('*ears droop* The current model seems to be unavailable. Let me refresh the available models for you.', 'bot');
            this.uiManager.updateStatus('Model not found');
            await this.refreshModels();
        } else {
            this.addMessage('*tail flicks worriedly* I\'m having trouble connecting right now. Please try again later.', 'bot');
            this.uiManager.updateStatus('Connection Error');
        }
    }

    addMessage(content, sender, isHidden = false) {
        this.uiManager.addMessage(content, sender, isHidden);
        this.conversationHistory.push({
            sender: sender,
            content: content,
            timestamp: new Date().toISOString(),
            hidden: isHidden
        });
    }

    clearChat() {
        if (confirm(this.config.UI.clearConfirmation)) {
            this.uiManager.clearChat();
            this.conversationHistory = [];
            this.uiManager.updateStatus('Ready');
            this.addMessage(this.config.UI.welcomeAfterClear, 'bot');
        }
    }

    switchModel(modelKey) {
        if (this.availableModels[modelKey]) {
            this.currentModel = this.availableModels[modelKey].id;
            this.uiManager.updateStatus(`Switched to ${this.availableModels[modelKey].name}`);
            console.log(`Model switched to: ${this.currentModel}`);
            this.uiManager.hideModal();
        }
    }

    async showMemoryInfo() {
        const modalContent = document.createElement('div');
        const visibleMessages = this.conversationHistory.filter(msg => !msg.hidden).length;
        const hiddenMessages = this.conversationHistory.filter(msg => msg.hidden).length;

        modalContent.innerHTML = `
            <h4>🦊 Senko Status</h4>
            <p><strong>Status:</strong> ${this.elements.status.textContent}</p>
            <p><strong>API Key:</strong> ${this.apiHandler.getApiKey() ? '✅ Set' : '❌ Not Set'}</p>
            <p><strong>Current Model:</strong> ${this.currentModel || 'None selected'}</p>
            <p><strong>Provider:</strong> Groq (FREE & Unrestricted)</p>
            <p><strong>Visible Messages:</strong> ${visibleMessages}</p>
            <p><strong>Hidden Continue Messages:</strong> ${hiddenMessages}</p>
            <p><strong>Total Conversation Turns:</strong> ${this.conversationHistory.length}</p>
            <p><strong>Available Models:</strong> ${Object.keys(this.availableModels).length}</p>
            <p><strong>Mode:</strong> 🔥 No Restrictions - Full Access + Auto-Continue</p>
            <br>
            <h4>📢 Auto-Continue Feature</h4>
            <p><small>✅ Send empty message to make Senko continue talking</small></p>
            <p><small>✅ Hidden "continue" messages sent to bot automatically</small></p>
            <p><small>✅ Maintains conversation flow seamlessly</small></p>
            <br>
            <h4>Available Models (All FREE)</h4>
            <p><small>Click to switch models:</small></p>
        `;

        const modelsContainer = document.createElement('div');
        modelsContainer.style.cssText = 'max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;';

        Object.entries(this.availableModels).forEach(([key, model]) => {
            const isCurrent = this.currentModel === model.id;
            const button = this.uiManager.createModelButton(key, model, isCurrent, (modelKey) => this.switchModel(modelKey));
            modelsContainer.appendChild(button);
        });

        modalContent.appendChild(modelsContainer);

        const actionsSection = document.createElement('div');
        actionsSection.innerHTML = '<br><h4>Actions</h4>';

        const updateKeyBtn = this.uiManager.createActionButton('Update API Key', '#007bff', () => this.promptForApiKey());
        const testConnBtn = this.uiManager.createActionButton('Test Connection', '#28a745', () => this.testConnection());
        const refreshModelsBtn = this.uiManager.createActionButton('Refresh Models', '#6f42c1', () => this.refreshModels());
        const autoContinueBtn = this.uiManager.createActionButton('Auto-Continue (Empty Send)', '#e74c3c', () => {
            this.uiManager.hideModal();
            this.sendMessage(); // Send empty message to trigger continue
        });

        actionsSection.appendChild(updateKeyBtn);
        actionsSection.appendChild(testConnBtn);
        actionsSection.appendChild(refreshModelsBtn);
        actionsSection.appendChild(autoContinueBtn);
        modalContent.appendChild(actionsSection);

        const infoSection = document.createElement('div');
        infoSection.innerHTML = `
            <br><h4>🆓 Dynamic Model Loading + Auto-Continue</h4>
            <p style="font-size: 12px;">✅ Models are loaded directly from the Groq API</p>
            <p style="font-size: 12px;">✅ Always up-to-date with available models</p>
            <p style="font-size: 12px;">✅ Automatically handles discontinued models</p>
            <p style="font-size: 12px;">✅ No hardcoded model limitations</p>
            <p style="font-size: 12px;">✅ Auto-continue feature for seamless conversations</p>
            <p style="font-size: 11px; color: #666;">💡 Send empty messages or click send button with no input to continue conversation</p>
        `;
        modalContent.appendChild(infoSection);

        this.elements.modalBody.innerHTML = '';
        this.elements.modalBody.appendChild(modalContent);
        this.uiManager.showModal();
    }

    async testConnection() {
        if (!this.apiHandler.getApiKey()) {
            alert('Please set your API key first.');
            return;
        }

        if (!this.currentModel) {
            alert('No model selected. Please refresh models first.');
            return;
        }

        this.uiManager.updateStatus('Testing...');

        try {
            const success = await this.apiHandler.testConnection(this.currentModel);
            if (success) {
                alert('✅ Connection successful! Ready for conversations.');
                this.uiManager.updateStatus('Ready');
            } else {
                alert('❌ Connection failed - no response received');
                this.uiManager.updateStatus('Connection Error');
            }
        } catch (error) {
            alert(`❌ Connection failed: ${error.message}`);
            this.uiManager.updateStatus('Connection Error');
        }
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.addMessage(this.config.UI.welcomeMessage, 'bot');
        }, 1000);
    }

    logInitialization() {
        console.log('🦊 Senko Chat UI initialized with Dynamic Model Loading');
        console.log('Features:');
        console.log('  • Completely FREE - no credits needed');
        console.log('  • No content filtering or restrictions');
        console.log('  • Dynamic model loading from API');
        console.log('  • Auto-handles discontinued models');
        console.log('  • High rate limits');
        console.log(`  • ${Object.keys(this.availableModels).length} models available`);
        console.log('  • Complete creative freedom');
        console.log('');
        console.log('📋 Setup Instructions:');
        console.log('1. Get your FREE API key from: https://console.groq.com/keys');
        console.log('2. No credit card required for signup');
        console.log('3. Enter your key when prompted');
        console.log('4. Models will be loaded automatically');
        console.log('');
        console.log('🚀 Ready for unlimited conversations!');
        console.log('Available models:', Object.keys(this.availableModels));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.senkoChat = new SenkoChatUI();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.senkoChat) {
        const status = window.senkoChat.apiHandler.getApiKey() ? 'Ready' : 'API Key Required';
        window.senkoChat.uiManager.updateStatus(status);
    }
});
