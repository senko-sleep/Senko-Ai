/**
 * Chat History Manager: Drag-up Modal Controls
 * - Message actions (edit, delete, rewind, show code) appear in a large modal "sheet" that slides up from the bottom on tap/click of a message
 * - Modal overlays the UI and is positioned based on the message clicked (if possible)
 * - Modal is blocky, with large touch targets, and can be dismissed by dragging down or tapping outside
 * - SHOW ALL CODE toggles code expansion and remains active while modal is open
 * - Works for both desktop and mobile
 */

class ChatHistoryManager {
    constructor() {
        this.senkoChat = null;
        this.isEditMode = false;
        this.currentEditElement = null;
        this.originalContent = '';
        this.activeModal = null;
        this.activeMessageElement = null;
        this.init();
    }

    init() {
        // Wait for SenkoChat to be available
        const checkSenkoChat = () => {
            if (window.senkoChat) {
                this.senkoChat = window.senkoChat;
                this.setupHistoryManagement();
                console.log('🛠️ Chat History Manager with Drag-up Modal initialized');
            } else {
                setTimeout(checkSenkoChat, 100);
            }
        };
        checkSenkoChat();
    }

    setupHistoryManagement() {
        const originalAddMessage = this.senkoChat.uiManager.addMessage.bind(this.senkoChat.uiManager);

        this.senkoChat.uiManager.addMessage = (content, sender, isHidden = false) => {
            const messageElement = this.senkoChat.uiManager.createMessage(content, sender, isHidden);

            if (!isHidden) {
                this.addHistoryControls(messageElement, content, sender);
            }

            this.senkoChat.elements.chatMessages.appendChild(messageElement);
            if (!isHidden) {
                this.senkoChat.uiManager.scrollToBottom();
            }
        };

        this.addControlsCSS();
        this.setupKeyboardShortcuts();
    }

    addHistoryControls(messageElement, content, sender) {
        // Instead of inline controls, attach modal opener
        messageElement.addEventListener('click', (e) => {
            if (this.isEditMode) return;
            e.stopPropagation();
            this.showModalForMessage(messageElement, content, sender);
        });
    }

    showModalForMessage(messageElement, content, sender) {
        this.hideModal();

        this.activeMessageElement = messageElement;

        // Get bounding rect for message for animation start
        const rect = messageElement.getBoundingClientRect();

        // Modal HTML
        const modal = document.createElement('div');
        modal.className = 'senko-modal-controls';

        modal.innerHTML = `
            <div class="senko-modal-backdrop"></div>
            <div class="senko-modal-sheet" style="top:${Math.min(rect.bottom, window.innerHeight - 80)}px">
                <div class="senko-modal-dragbar"></div>
                <div class="senko-modal-actions">
                    <button class="senko-modal-btn edit-btn"><i class="fas fa-edit"></i> Edit Message</button>
                    <button class="senko-modal-btn delete-btn"><i class="fas fa-trash"></i> Delete Message</button>
                    <button class="senko-modal-btn rewind-btn"><i class="fas fa-undo"></i> Rewind Conversation</button>
                    <button class="senko-modal-btn show-code-btn"><i class="fas fa-code"></i> Show All Code</button>
                    <button class="senko-modal-btn cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;

        // Animate modal up
        const sheet = modal.querySelector('.senko-modal-sheet');
        setTimeout(() => {
            sheet.classList.add('active');
        }, 20);

        // Drag-to-close support
        this.setupModalDrag(sheet, modal);

        // Action handlers
        modal.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            this.hideModal();
            this.editMessage(messageElement, messageElement.querySelector('.message-content'), content, sender);
        };
        modal.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            this.hideModal();
            this.deleteMessage(messageElement);
        };
        modal.querySelector('.rewind-btn').onclick = (e) => {
            e.stopPropagation();
            this.hideModal();
            this.rewindToMessage(messageElement);
        };
        modal.querySelector('.show-code-btn').onclick = (e) => {
            e.stopPropagation();
            this.toggleShowAllCode(messageElement, true);
        };
        modal.querySelector('.cancel-btn').onclick = (e) => {
            e.stopPropagation();
            this.hideModal();
        };

        // Close on backdrop
        modal.querySelector('.senko-modal-backdrop').onclick = (e) => {
            e.stopPropagation();
            this.hideModal();
        };

        // Hide modal on Escape
        window.addEventListener('keydown', this._escKeyHandler = (evt) => {
            if (evt.key === "Escape") {
                this.hideModal();
            }
        });
    }

    hideModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
            window.removeEventListener('keydown', this._escKeyHandler);
        }
    }

    setupModalDrag(sheet, modal) {
        let startY = null;
        let startTop = null;
        let dragging = false;

        const onDragStart = (e) => {
            dragging = true;
            startY = (e.touches ? e.touches[0].clientY : e.clientY);
            startTop = parseInt(window.getComputedStyle(sheet).top, 10);
            sheet.style.transition = 'none';
            document.body.style.userSelect = 'none';
        };
        const onDragMove = (e) => {
            if (!dragging) return;
            let clientY = (e.touches ? e.touches[0].clientY : e.clientY);
            let delta = clientY - startY;
            if (delta > 0) {
                sheet.style.top = (startTop + delta) + 'px';
                sheet.style.opacity = 1 - Math.min(delta / 200, 0.5);
            }
        };
        const onDragEnd = (e) => {
            if (!dragging) return;
            let endY = (e.changedTouches ? e.changedTouches[0].clientY : (e.clientY || startY));
            let delta = endY - startY;
            sheet.style.transition = '';
            document.body.style.userSelect = '';
            if (delta > 120) {
                this.hideModal();
            } else {
                sheet.style.top = '';
                sheet.style.opacity = '';
            }
            dragging = false;
        };

        const dragbar = sheet.querySelector('.senko-modal-dragbar');
        dragbar.addEventListener('mousedown', onDragStart);
        dragbar.addEventListener('touchstart', onDragStart);
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('touchmove', onDragMove, {passive:false});
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchend', onDragEnd);
    }

    toggleShowAllCode(messageElement, fromModal = false) {
        const codeBlocks = messageElement.querySelectorAll('pre, code');
        let willExpand = false;
        if (codeBlocks.length) {
            willExpand = !codeBlocks[0].classList.contains('expanded-code');
        }
        codeBlocks.forEach(block => {
            if (willExpand) {
                block.classList.add('expanded-code');
            } else {
                block.classList.remove('expanded-code');
            }
        });
        let label = messageElement.querySelector('.show-all-code-label');
        if (willExpand && !label) {
            label = document.createElement('div');
            label.className = 'show-all-code-label';
            label.textContent = 'SHOW ALL CODE';
            messageElement.appendChild(label);
        } else if (!willExpand && label) {
            label.remove();
        }
        if (fromModal) this.hideModal();
    }

    // --- Rest of logic unchanged ---

    editMessage(messageElement, messageContent, originalContent, sender) {
        if (this.isEditMode) return;

        this.isEditMode = true;
        this.currentEditElement = messageElement;
        this.originalContent = originalContent;

        // Create edit interface
        const controls = messageElement.querySelector('.message-controls');
        if (controls) controls.style.display = 'none';

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

        textarea.focus();
        textarea.select();

        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });

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

        messageContent.innerHTML = this.senkoChat.uiManager.constructor.name === 'UIManager'
            ? MessageProcessor.process(newContent)
            : newContent;

        this.updateHistoryEntry(this.originalContent, newContent);

        editContainer.remove();
        messageContent.style.display = 'block';
        if (controls) controls.style.display = 'flex';

        this.resetEditMode();

        console.log('✏️ Message edited successfully');
    }

    cancelEdit() {
        if (!this.currentEditElement) return;

        const messageContent = this.currentEditElement.querySelector('.message-content');
        const editContainer = this.currentEditElement.querySelector('.edit-container');
        const controls = this.currentEditElement.querySelector('.message-controls');

        editContainer.remove();
        messageContent.style.display = 'block';
        if (controls) controls.style.display = 'flex';

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

        const messageContent = messageElement.querySelector('.message-content').textContent;
        const messageIndex = this.findMessageIndex(messageContent);

        if (messageIndex !== -1) {
            this.senkoChat.conversationHistory = this.senkoChat.conversationHistory.slice(0, messageIndex + 1);

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
            if (this.isEditMode) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.editLastMessage();
            }
            if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.deleteLastMessage();
            }
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
            this.showModalForMessage(lastMessage, lastMessage.querySelector('.message-content').textContent, 'user');
        }
    }
    deleteLastMessage() {
        const messages = this.senkoChat.elements.chatMessages.querySelectorAll('.message:not([style*="display: none"])');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            this.deleteMessage(lastMessage);
        }
    }
    rewindToLastMessage() {
        const messages = this.senkoChat.elements.chatMessages.querySelectorAll('.message:not([style*="display: none"])');
        if (messages.length > 1) {
            const secondLastMessage = messages[messages.length - 2];
            this.rewindToMessage(secondLastMessage);
        }
    }

    addControlsCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Modal Sheet Styles */
            .senko-modal-controls {
                position: fixed;
                z-index: 2000;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
            }
            .senko-modal-controls .senko-modal-backdrop {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.20);
                pointer-events: auto;
            }
            .senko-modal-sheet {
                position: fixed;
                left: 0;
                width: 100vw;
                background: #fff;
                border-top-left-radius: 22px;
                border-top-right-radius: 22px;
                box-shadow: 0 0 32px rgba(0,0,0,0.21);
                max-width: 500px;
                margin: 0 auto;
                right: 0;
                top: 100vh;
                transition: top 0.32s cubic-bezier(.5,1.5,.5,1);
                opacity: 1;
                pointer-events: auto;
            }
            .senko-modal-sheet.active {
                top: 28vh;
            }
            .senko-modal-dragbar {
                width: 56px;
                height: 7px;
                margin: 12px auto 18px auto;
                background: #e1e1e1;
                border-radius: 8px;
                cursor: grab;
            }
            .senko-modal-actions {
                display: flex;
                flex-direction: column;
                gap: 22px;
                padding: 0 32px 30px 32px;
            }
            .senko-modal-btn {
                font-size: 1.18rem;
                font-weight: 600;
                padding: 18px 0;
                background: #f7f7f7;
                border: none;
                border-radius: 12px;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: background 0.18s;
                cursor: pointer;
                box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            }
            .senko-modal-btn:active {
                background: #ececec;
            }
            .senko-modal-btn.show-code-btn {
                color: #2196f3;
            }
            .senko-modal-btn.edit-btn { color: #4CAF50; }
            .senko-modal-btn.delete-btn { color: #f44336; }
            .senko-modal-btn.rewind-btn { color: #ff9800; }
            .senko-modal-btn.cancel-btn { color: #555; background: #f0f0f0; }

            /* Modal: mobile full width, desktop max-width */
            @media (max-width: 600px) {
                .senko-modal-sheet { max-width: 100vw; left: 0; right: 0; }
            }

            /* Code block expansion */
            pre, code {
                max-height: 180px;
                overflow: auto;
                transition: max-height 0.25s;
            }
            .expanded-code {
                max-height: 1000px !important;
                overflow: auto;
                box-shadow: 0 0 0 2px #2196f3;
            }
            .show-all-code-label {
                position: absolute;
                left: 50%;
                bottom: 44px;
                transform: translateX(-50%);
                background: #1e293b;
                color: #fff;
                font-size: 12px;
                font-weight: 600;
                padding: 4px 14px;
                border-radius: 20px;
                opacity: 0.97;
                pointer-events: none;
                z-index: 200;
                box-shadow: 0 1px 4px rgba(0,0,0,0.12);
                white-space: nowrap;
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
