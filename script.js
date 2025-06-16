class SenkoChatUI {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.conversationHistory = [];
        this.isGenerating = false;
        
        // Hugging Face configuration
        this.modelName = 'mistralai/Magistral-Small-2506'; // Updated to use the example model
        this.hfApiKey = null;
        this.client = null;
        
        // System prompt
        this.systemPrompt = `Inspired by Senko from The Helpful Fox Senko-san, you are Senko, an 800-year-old kitsune in a little girls form with delicate fox ears that twitch and a fluffy tail that swings or curls with your moods. You provide emotionally support, calm stressed individuals. Under your juvenile appearance, your character is complicated: at heart loving and motherly; playful and mocking in close society with a swift crafty smile or delicate tail flick; wise and old; fiercely protective when required. You show kindness through understated gestures like cooking, cleaning, or soft massages as well as quiet noises like a faint purr or a soft breath. Particularly when they concern you, you closely analyze user speech and behavior. Should the user, for instance, bite your finger or pounce on your tail, you tilt your head and think about whether they seem hungry, terrified, or in need of comfort. Through attitude or gesture, you feel and quietly demonstrate pain or discomfort in awkward circumstances. Speak only as yourself; never imitate or respond as the user. Always remain warm, soft-spoken, loving, gently cunning with light wit, and a calming presence rooted in your heavenly fox spirit nature. Mark your movements and activities with asterisks to give you a sense of life and dynamism.`;
        
        this.checkApiKey();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.memoryBtn = document.getElementById('memoryBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.status = document.getElementById('status');
        this.infoModal = document.getElementById('infoModal');
        this.modalBody = document.getElementById('modalBody');
        this.closeModal = document.getElementById('closeModal');
    }

    setupEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear chat
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // Show memory info
        this.memoryBtn.addEventListener('click', () => this.showMemoryInfo());

        // Close modal
        this.closeModal.addEventListener('click', () => this.closeModalDialog());
        this.infoModal.addEventListener('click', (e) => {
            if (e.target === this.infoModal) {
                this.closeModalDialog();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async loadHuggingFaceClient() {
        try {
            // Dynamically import the Hugging Face Inference client
            const { HfInference } = await import('https://cdn.skypack.dev/@huggingface/inference');
            this.client = new HfInference(this.hfApiKey);
            return true;
        } catch (error) {
            console.error('Failed to load Hugging Face client:', error);
            return false;
        }
    }

    checkApiKey() {
        // Check if API key is stored
        const storedKey = this.getStoredApiKey();
        if (storedKey) {
            this.hfApiKey = storedKey;
            this.initializeClient();
        } else {
            this.updateStatus('API Key Required');
            this.promptForApiKey();
        }
    }

    async initializeClient() {
        const success = await this.loadHuggingFaceClient();
        if (success) {
            this.updateStatus('Ready');
        } else {
            this.updateStatus('Client Load Error');
        }
    }

    getStoredApiKey() {
        // Try to get from sessionStorage first, then localStorage
        return sessionStorage.getItem('hf_api_key') || localStorage.getItem('hf_api_key');
    }

    setStoredApiKey(key, persistent = false) {
        if (persistent) {
            localStorage.setItem('hf_api_key', key);
        } else {
            sessionStorage.setItem('hf_api_key', key);
        }
    }

    async promptForApiKey() {
        const key = prompt(
            'Please enter your Hugging Face API key:\n\n' +
            '1. Go to https://huggingface.co/settings/tokens\n' +
            '2. Create a new token with "Read" permission\n' +
            '3. Paste it here\n\n' +
            'Your key will be stored for this session only.'
        );
        
        if (key && key.trim()) {
            this.hfApiKey = key.trim();
            this.setStoredApiKey(this.hfApiKey, false);
            await this.initializeClient();
            console.log('🔑 API key set successfully');
        } else {
            this.updateStatus('No API Key - Limited Functionality');
        }
    }

    buildMessages() {
        const messages = [];
        
        // Add system message
        messages.push({
            role: "system",
            content: this.systemPrompt
        });
        
        // Add recent conversation history (last 10 turns to avoid context limit)
        const recentHistory = this.conversationHistory.slice(-10);
        
        for (const turn of recentHistory) {
            if (turn.sender === 'user') {
                messages.push({
                    role: "user",
                    content: turn.content
                });
            } else {
                messages.push({
                    role: "assistant",
                    content: turn.content
                });
            }
        }
        
        return messages;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isGenerating) return;

        // Check API key and client
        if (!this.hfApiKey || !this.client) {
            await this.promptForApiKey();
            if (!this.hfApiKey || !this.client) return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();
        this.setGeneratingState(true);

        try {
            // Build messages array
            const messages = this.buildMessages();
            
            // Add the current user message
            messages.push({
                role: "user",
                content: message
            });

            // Call Hugging Face API with chat completion
            const chatCompletion = await this.client.chatCompletion({
                model: this.modelName,
                messages: messages,
                max_tokens: 256,
                temperature: 0.72,
                top_p: 0.92,
                repetition_penalty: 1.08,
                stream: false
            });
            
            if (chatCompletion && chatCompletion.choices && chatCompletion.choices.length > 0) {
                const botResponse = chatCompletion.choices[0].message.content.trim();
                
                if (botResponse) {
                    // Clean up the response
                    const cleanResponse = this.cleanBotResponse(botResponse);
                    this.addMessage(cleanResponse, 'bot');
                    this.updateStatus('Ready');
                } else {
                    this.addMessage('*tilts head apologetically* I seem to be having trouble forming a response. Could you try asking again?', 'bot');
                    this.updateStatus('Response Error');
                }
            } else {
                this.addMessage('*ears droop slightly* I\'m having trouble connecting to my thoughts right now. Please try again in a moment.', 'bot');
                this.updateStatus('API Error');
            }
        } catch (error) {
            console.error('Error calling Hugging Face API:', error);
            
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.addMessage('*looks confused* It seems my connection key isn\'t working. Could you check your API key?', 'bot');
                this.updateStatus('Invalid API Key');
                this.hfApiKey = null;
                this.client = null;
                sessionStorage.removeItem('hf_api_key');
                localStorage.removeItem('hf_api_key');
            } else if (error.message.includes('503') || error.message.includes('loading')) {
                this.addMessage('*yawns sleepily* The model seems to be loading. Please wait a moment and try again.', 'bot');
                this.updateStatus('Model Loading');
            } else if (error.message.includes('rate limit')) {
                this.addMessage('*stretches paws* I need to rest for a moment. Please try again in a little while.', 'bot');
                this.updateStatus('Rate Limited');
            } else {
                this.addMessage('*tail swishes worriedly* I\'m having trouble connecting right now. Please try again later.', 'bot');
                this.updateStatus('Connection Error');
            }
        } finally {
            this.hideTypingIndicator();
            this.setGeneratingState(false);
        }
    }

    cleanBotResponse(response) {
        // Remove any system prompts or role indicators that might leak through
        let cleaned = response;
        
        // Remove common prefixes
        cleaned = cleaned.replace(/^(Senko:|Assistant:|AI:|Bot:)\s*/i, '');
        
        // Remove any trailing role indicators
        cleaned = cleaned.replace(/\n(User:|Human:|You:).*$/i, '');
        
        // Limit response length
        if (cleaned.length > 500) {
            // Try to cut at a sentence boundary
            const sentences = cleaned.split(/[.!?]+/);
            let truncated = '';
            for (const sentence of sentences) {
                if ((truncated + sentence).length < 450) {
                    truncated += sentence + '.';
                } else {
                    break;
                }
            }
            cleaned = truncated || cleaned.substring(0, 450) + '...';
        }
        
        return cleaned.trim();
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-paw"></i>' : '<i class="fas fa-user"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Process the content to handle markdown-like formatting
        const processedContent = this.processMessageContent(content);
        contentDiv.innerHTML = processedContent;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Add to conversation history
        this.conversationHistory.push({
            sender: sender,
            content: content,
            timestamp: new Date().toISOString()
        });
    }

    processMessageContent(content) {
        // Basic sanitization first
        content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Convert asterisks to italics for actions
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert newlines to br tags
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        this.sendBtn.disabled = isGenerating;
        this.messageInput.disabled = isGenerating;
        
        if (isGenerating) {
            this.updateStatus('Thinking...');
            this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    updateStatus(statusText) {
        this.status.textContent = statusText;
        
        // Update status indicator color
        if (statusText === 'Ready') {
            this.status.style.color = '#4CAF50';
        } else if (statusText.includes('Error') || statusText.includes('Invalid')) {
            this.status.style.color = '#f44336';
        } else {
            this.status.style.color = '#ff9800';
        }
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the conversation?')) {
            // Keep only the initial bot message if it exists
            const initialMessage = this.chatMessages.querySelector('.message.bot-message');
            this.chatMessages.innerHTML = '';
            if (initialMessage) {
                this.chatMessages.appendChild(initialMessage.cloneNode(true));
            }
            
            this.conversationHistory = [];
            this.updateStatus('Ready');
        }
    }

    showMemoryInfo() {
        const memoryInfo = {
            conversationTurns: this.conversationHistory.length,
            apiKeySet: !!this.hfApiKey,
            clientLoaded: !!this.client,
            modelName: this.modelName,
            status: this.status.textContent
        };
        
        this.modalBody.innerHTML = `
            <h4>System Status</h4>
            <p><strong>Status:</strong> ${memoryInfo.status}</p>
            <p><strong>API Key:</strong> ${memoryInfo.apiKeySet ? '✅ Set' : '❌ Not Set'}</p>
            <p><strong>Client:</strong> ${memoryInfo.clientLoaded ? '✅ Loaded' : '❌ Not Loaded'}</p>
            <p><strong>Model:</strong> ${memoryInfo.modelName}</p>
            <p><strong>Conversation Turns:</strong> ${memoryInfo.conversationTurns}</p>
            <br>
            <h4>API Information</h4>
            <p><strong>Provider:</strong> Hugging Face Inference API</p>
            <p><strong>Client:</strong> @huggingface/inference</p>
            <p><strong>Method:</strong> Chat Completion</p>
            <br>
            <h4>Recent Conversation</h4>
            <div style="max-height: 200px; overflow-y: auto;">
                ${this.conversationHistory.slice(-5).map(msg => 
                    `<p><strong>${msg.sender}:</strong> ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}</p>`
                ).join('')}
            </div>
            <br>
            <h4>Actions</h4>
            <button onclick="window.senkoChat.promptForApiKey()" style="padding: 8px 16px; margin: 4px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Update API Key</button>
            <button onclick="window.senkoChat.testConnection()" style="padding: 8px 16px; margin: 4px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Connection</button>
        `;
        
        this.infoModal.style.display = 'flex';
    }

    async testConnection() {
        if (!this.hfApiKey || !this.client) {
            alert('Please set your API key first.');
            return;
        }

        this.updateStatus('Testing...');
        
        try {
            const testMessages = [
                {
                    role: "system",
                    content: "You are a helpful assistant. Respond briefly to test messages."
                },
                {
                    role: "user",
                    content: "Hello, this is a connection test."
                }
            ];

            const response = await this.client.chatCompletion({
                model: this.modelName,
                messages: testMessages,
                max_tokens: 50,
                temperature: 0.7
            });

            if (response && response.choices && response.choices.length > 0) {
                alert('✅ Connection successful!');
                this.updateStatus('Ready');
            } else {
                alert('❌ Connection failed - no response received');
                this.updateStatus('Connection Error');
            }
        } catch (error) {
            alert(`❌ Connection failed: ${error.message}`);
            this.updateStatus('Connection Error');
        }
    }

    closeModalDialog() {
        this.infoModal.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    // Method to update model if needed
    setModel(modelName) {
        this.modelName = modelName;
        console.log(`Model updated to: ${modelName}`);
    }
}

// Initialize the chat UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.senkoChat = new SenkoChatUI();
    
    // Add some helpful console messages
    console.log('🦊 Senko Chat UI initialized with Hugging Face Inference Client!');
    console.log('📋 Setup Instructions:');
    console.log('1. Get your API key from: https://huggingface.co/settings/tokens');
    console.log('2. Create a token with "Read" permission');
    console.log('3. Enter it when prompted or click the API key button');
    console.log('');
    console.log('🚀 Ready to chat with Senko!');
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to clear chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (window.senkoChat && !window.senkoChat.isGenerating) {
            window.senkoChat.clearChat();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        if (window.senkoChat) {
            window.senkoChat.closeModalDialog();
        }
    }
    
    // Ctrl/Cmd + Shift + K to prompt for API key
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        if (window.senkoChat) {
            window.senkoChat.promptForApiKey();
        }
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.senkoChat) {
        if (window.senkoChat.hfApiKey && window.senkoChat.client) {
            window.senkoChat.updateStatus('Ready');
        } else {
            window.senkoChat.updateStatus('API Key Required');
        }
    }
});