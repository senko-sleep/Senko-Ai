/**
 * Advanced Chat History Manager
 * Adds edit, delete, and rewind functionality to chat messages
 * Requires script.js to be loaded first
 */

class ChatHistoryManager {
    constructor() {
        this.senkoChat = null;
        this.isEditMode = false;
        this.currentEditElement = null;
        this.originalContent = '';
        this.init();
    }

    init() {
        // Wait for SenkoChat to be available
        const checkSenkoChat = () => {
            if (window.senkoChat) {
                this.senkoChat = window.senkoChat;
                this.setupHistoryManagement();
                console.log('🛠️ Chat History Manager initialized');
            } else {
                setTimeout(checkSenkoChat, 100);
            }
        };
        checkSenkoChat();
    }

    setupHistoryManagement() {
        // Override the original addMessage to add controls
        const originalAddMessage = this.senkoChat.uiManager.addMessage.bind(this.senkoChat.uiManager);
        
        this.senkoChat.uiManager.addMessage = (content, sender, isHidden = false) => {
            const messageElement = this.senkoChat.uiManager.createMessage(content, sender, isHidden);
            
            // Add history controls if not hidden
            if (!isHidden) {
                this.addHistoryControls(messageElement, content, sender);
            }
            
            this.senkoChat.elements.chatMessages.appendChild(messageElement);
            if (!isHidden) {
                this.senkoChat.uiManager.scrollToBottom();
            }
        };

        // Add CSS for controls
        this.addControlsCSS();

        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    addHistoryControls(messageElement, content, sender) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'message-controls';
        controlsDiv.innerHTML = `
            <button class="control-btn edit-btn" title="Edit message (Ctrl+E)">
                <i class="fas fa-edit"></i>
            </button>
            <button class="control-btn delete-btn" title="Delete message (Delete)">
                <i class="fas fa-trash"></i>
            </button>
            <button class="control-btn rewind-btn" title="Rewind to here (Ctrl+R)">
                <i class="fas fa-undo"></i>
            </button>
        `;

        // Insert controls before message content
        const messageContent = messageElement.querySelector('.message-content');
        messageElement.insertBefore(controlsDiv, messageContent);

        // Add event listeners
        const editBtn = controlsDiv.querySelector('.edit-btn');
        const deleteBtn = controlsDiv.querySelector('.delete-btn');
        const rewindBtn = controlsDiv.querySelector('.rewind-btn');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editMessage(messageElement, messageContent, content, sender);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMessage(messageElement);
        });

        rewindBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rewindToMessage(messageElement);
        });

        // Show controls on hover
        messageElement.addEventListener('mouseenter', () => {
            if (!this.isEditMode) {
                controlsDiv.style.opacity = '1';
            }
        });

        messageElement.addEventListener('mouseleave', () => {
            if (!this.isEditMode) {
                controlsDiv.style.opacity = '0';
            }
        });
    }

    editMessage(messageElement, messageContent, originalContent, sender) {
        if (this.isEditMode) return;

        this.isEditMode = true;
        this.currentEditElement = messageElement;
        this.originalContent = originalContent;

        // Hide controls during edit
        const controls = messageElement.querySelector('.message-controls');
        controls.style.display = 'none';

        // Create edit interface
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = originalContent;
        textarea.rows = Math.max(3, originalContent.split('\n').length + 1);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'edit-buttons';
        buttonContainer.innerHTML = `
            <button class="save-btn">Save</button>
            <button class="cancel-btn">Cancel</button>
        `;

        editContainer.appendChild(textarea);
        editContainer.appendChild(buttonContainer);

        // Replace message content with edit interface
        messageContent.style.display = 'none';
        messageElement.appendChild(editContainer);

        // Focus textarea and select all
        textarea.focus();
        textarea.select();

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });

        // Button handlers
        const saveBtn = buttonContainer.querySelector('.save-btn');
        const cancelBtn = buttonContainer.querySelector('.cancel-btn');

        saveBtn.addEventListener('click', () => {
            this.saveEdit(textarea.value, sender);
        });

        cancelBtn.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Keyboard shortcuts during edit
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelEdit();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.saveEdit(textarea.value, sender);
            }
        });
    }

    saveEdit(newContent, sender) {
        if (!this.currentEditElement || !newContent.trim()) return;

        const messageContent = this.currentEditElement.querySelector('.message-content');
        const editContainer = this.currentEditElement.querySelector('.edit-container');
        const controls = this.currentEditElement.querySelector('.message-controls');

        // Update message content
        messageContent.innerHTML = this.senkoChat.uiManager.constructor.name === 'UIManager' 
            ? MessageProcessor.process(newContent) 
            : newContent;

        // Update history
        this.updateHistoryEntry(this.originalContent, newContent);

        // Clean up edit interface
        editContainer.remove();
        messageContent.style.display = 'block';
        controls.style.display = 'flex';

        this.resetEditMode();

        console.log('✏️ Message edited successfully');
    }

    cancelEdit() {
        if (!this.currentEditElement) return;

        const messageContent = this.currentEditElement.querySelector('.message-content');
        const editContainer = this.currentEditElement.querySelector('.edit-container');
        const controls = this.currentEditElement.querySelector('.message-controls');

        // Clean up edit interface
        editContainer.remove();
        messageContent.style.display = 'block';
        controls.style.display = 'flex';

        this.resetEditMode();
    }

    resetEditMode() {
        this.isEditMode = false;
        this.currentEditElement = null;
        this.originalContent = '';
    }

    deleteMessage(messageElement) {
        if (this.isEditMode) return;

        const confirmation = confirm('Are you sure you want to delete this message?');
        if (!confirmation) return;

        // Find message in history and remove it
        const messageContent = messageElement.querySelector('.message-content').textContent;
        const messageIndex = this.findMessageIndex(messageContent);

        if (messageIndex !== -1) {
            this.senkoChat.conversationHistory.splice(messageIndex, 1);
            messageElement.remove();
            console.log('🗑️ Message deleted from history');
        }
    }

    rewindToMessage(messageElement) {
        if (this.isEditMode) return;

        const confirmation = confirm('This will delete all messages after this point and continue from here. Are you sure?');
        if (!confirmation) return;

        // Find message in history
        const messageContent = messageElement.querySelector('.message-content').textContent;
        const messageIndex = this.findMessageIndex(messageContent);

        if (messageIndex !== -1) {
            // Remove all messages after this point from history
            this.senkoChat.conversationHistory = this.senkoChat.conversationHistory.slice(0, messageIndex + 1);

            // Remove all DOM elements after this message
            let nextSibling = messageElement.nextElementSibling;
            while (nextSibling) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
                toRemove.remove();
            }

            console.log(`⏪ Rewound to message ${messageIndex + 1}, removed ${this.senkoChat.conversationHistory.length - messageIndex - 1} messages`);
        }
    }

    findMessageIndex(content) {
        // Strip HTML and normalize content for comparison
        const normalizedContent = content.replace(/<[^>]*>/g, '').trim();
        
        return this.senkoChat.conversationHistory.findIndex(msg => {
            const msgContent = msg.content.replace(/<[^>]*>/g, '').trim();
            return msgContent === normalizedContent;
        });
    }

    updateHistoryEntry(oldContent, newContent) {
        const messageIndex = this.findMessageIndex(oldContent);
        if (messageIndex !== -1) {
            this.senkoChat.conversationHistory[messageIndex].content = newContent;
            this.senkoChat.conversationHistory[messageIndex].edited = true;
            this.senkoChat.conversationHistory[messageIndex].editedAt = new Date().toISOString();
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't interfere with edit mode
            if (this.isEditMode) return;

            // Ctrl+E: Edit last message
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.editLastMessage();
            }

            // Delete: Delete last message
            if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.deleteLastMessage();
            }

            // Ctrl+R: Rewind to last message
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.rewindToLastMessage();
            }
        });
    }

    editLastMessage() {
        const messages = this.senkoChat.elements.chatMessages.querySelectorAll('.message:not([style*="display: none"])');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const editBtn = lastMessage.querySelector('.edit-btn');
            if (editBtn) editBtn.click();
        }
    }

    deleteLastMessage() {
        const messages = this.senkoChat.elements.chatMessages.querySelectorAll('.message:not([style*="display: none"])');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const deleteBtn = lastMessage.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.click();
        }
    }

    rewindToLastMessage() {
        const messages = this.senkoChat.elements.chatMessages.querySelectorAll('.message:not([style*="display: none"])');
        if (messages.length > 1) {
            const secondLastMessage = messages[messages.length - 2];
            const rewindBtn = secondLastMessage.querySelector('.rewind-btn');
            if (rewindBtn) rewindBtn.click();
        }
    }

    addControlsCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Message Controls */
            .message {
                position: relative;
            }

            .message-controls {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s ease;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 6px;
                padding: 4px;
                z-index: 10;
            }

            .message:hover .message-controls {
                opacity: 1;
            }

            .control-btn {
                background: transparent;
                border: none;
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                height: 28px;
            }

            .control-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }

            .edit-btn:hover {
                color: #4CAF50;
            }

            .delete-btn:hover {
                color: #f44336;
            }

            .rewind-btn:hover {
                color: #ff9800;
            }

            /* Edit Interface */
            .edit-container {
                margin: 12px 0;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 2px solid #007bff;
            }

            .edit-textarea {
                width: 100%;
                min-height: 80px;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                resize: vertical;
                margin-bottom: 12px;
            }

            .edit-textarea:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }

            .edit-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .save-btn, .cancel-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .save-btn {
                background: #28a745;
                color: white;
            }

            .save-btn:hover {
                background: #218838;
                transform: translateY(-1px);
            }

            .cancel-btn {
                background: #6c757d;
                color: white;
            }

            .cancel-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .message-controls {
                    opacity: 1;
                    position: static;
                    background: rgba(0, 0, 0, 0.05);
                    margin-top: 8px;
                    justify-content: center;
                }

                .control-btn {
                    color: #666;
                    background: rgba(255, 255, 255, 0.8);
                    border: 1px solid #ddd;
                }

                .control-btn:hover {
                    background: white;
                    color: #333;
                }
            }

            /* Animation for message deletion */
            .message.deleting {
                animation: slideOut 0.3s ease-out forwards;
            }

            @keyframes slideOut {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                    max-height: 200px;
                }
                100% {
                    opacity: 0;
                    transform: translateX(-100%);
                    max-height: 0;
                    margin: 0;
                    padding: 0;
                }
            }

            /* Edit indicator */
            .message.edited .message-content::after {
                content: "(edited)";
                font-size: 11px;
                color: #999;
                font-style: italic;
                margin-left: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // Public methods for external access
    getHistoryStats() {
        const total = this.senkoChat.conversationHistory.length;
        const edited = this.senkoChat.conversationHistory.filter(msg => msg.edited).length;
        const hidden = this.senkoChat.conversationHistory.filter(msg => msg.hidden).length;
        
        return {
            total,
            edited,
            hidden,
            visible: total - hidden
        };
    }

    exportHistory() {
        const data = {
            exported: new Date().toISOString(),
            model: this.senkoChat.currentModel,
            stats: this.getHistoryStats(),
            history: this.senkoChat.conversationHistory
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `senko-chat-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📁 Chat history exported');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatHistoryManager = new ChatHistoryManager();
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatHistoryManager;
}