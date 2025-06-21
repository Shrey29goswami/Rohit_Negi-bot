document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryContainer = document.getElementById('chat-history');
    const loadingIndicator = document.getElementById('loading-indicator');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const micBtn = document.getElementById('mic-btn'); // ADDED: Mic button

    // --- State Management ---
    let currentChatId = null;
    let chatHistories = {}; // { [chatId]: { title, messages: [{ role, content }] } }
    
    const API_URL = 'https://rohit-negi-bot-b.onrender.com/chat'; // Your production URL
    const BOT_AVATAR_URL = 'https://i.ibb.co/L9yT3yT/rohit-negi-avatar.png';
    const USER_AVATAR_URL = 'https://i.ibb.co/fDYrfrt/user-avatar.png';

    // --- ADDED: Voice Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-IN'; // Optimized for Indian English
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            messageInput.value = transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            micBtn.classList.remove('listening');
        };
    } else {
        micBtn.style.display = 'none'; // Hide mic button if not supported
    }

    // --- Initialization ---
    function init() {
        loadStateFromLocalStorage();
        renderChatHistory();
        
        if (!currentChatId || !chatHistories[currentChatId]) {
            startNewChat();
        } else {
            loadChat(currentChatId);
        }

        setupEventListeners();
        applyTheme();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        chatForm.addEventListener('submit', handleFormSubmit);
        newChatBtn.addEventListener('click', startNewChat);
        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
        themeToggle.addEventListener('change', toggleTheme);
        if (micBtn) { // ADDED: Mic button listener
            micBtn.addEventListener('click', toggleVoiceRecognition);
        }
    }

    // --- ADDED: Voice Recognition Toggle ---
    function toggleVoiceRecognition() {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    // --- Core Chat Logic ---
    async function handleFormSubmit(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToScreen(message, 'user');
        chatHistories[currentChatId].messages.push({ role: 'user', content: message });
        
        // Update history title if it's the first user message
        if (chatHistories[currentChatId].messages.length <= 2) {
             chatHistories[currentChatId].title = message;
             renderChatHistory();
        }
        saveStateToLocalStorage();

        messageInput.value = '';
        loadingIndicator.classList.remove('hidden');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, chatId: currentChatId }),
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            addMessageToScreen(data.reply, 'bot');
            chatHistories[currentChatId].messages.push({ role: 'bot', content: data.reply });
            saveStateToLocalStorage();

        } catch (error) {
            console.error('Error:', error);
            addMessageToScreen('Boss, kuch gadbad ho gayi. Try again later.', 'bot');
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function addMessageToScreen(text, sender) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        const avatarImg = document.createElement('img');
        avatarImg.src = sender === 'user' ? USER_AVATAR_URL : BOT_AVATAR_URL;
        avatar.appendChild(avatarImg);
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.innerHTML = text.replace(/\n/g, '<br>');
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
        chatWindow.appendChild(messageWrapper);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- Chat Management ---
    function startNewChat() {
        const newId = `chat_${Date.now()}`;
        currentChatId = newId;
        chatHistories[currentChatId] = {
            title: 'New Chat',
            messages: [{
                role: 'bot',
                content: 'Boss, kis topic pe aaj help chahiye? DSA, system design ya motivation?'
            }]
        };
        loadChat(currentChatId);
        renderChatHistory();
        saveStateToLocalStorage();
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        chatWindow.innerHTML = '';
        const history = chatHistories[chatId];
        if (history) {
            history.messages.forEach(msg => addMessageToScreen(msg.content, msg.role));
        }
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });
        saveStateToLocalStorage(); // To save the current active chat
    }
    
    // UPDATED: renderChatHistory to include delete button
    function renderChatHistory() {
        chatHistoryContainer.innerHTML = '';
        Object.keys(chatHistories).reverse().forEach(chatId => {
            const history = chatHistories[chatId];
            const title = history.title || 'Chat';
            
            const item = document.createElement('button');
            item.className = 'sidebar-button chat-history-item';
            item.dataset.chatId = chatId;
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = `${title.substring(0, 20)}${title.length > 20 ? '...' : ''}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.innerHTML = '✕'; // A simple 'x' character
            deleteBtn.addEventListener('click', (e) => handleDeleteChat(e, chatId));

            item.appendChild(titleSpan);
            item.appendChild(deleteBtn);

            if (chatId === currentChatId) {
                item.classList.add('active');
            }
            item.addEventListener('click', () => loadChat(chatId));
            chatHistoryContainer.appendChild(item);
        });
    }

    // ADDED: handleDeleteChat function
    function handleDeleteChat(e, chatIdToDelete) {
        e.stopPropagation(); // Prevent the click from loading the chat

        if (confirm('Are you sure you want to delete this chat?')) {
            delete chatHistories[chatIdToDelete];
            
            // If the active chat was deleted, start a new one
            if (currentChatId === chatIdToDelete) {
                startNewChat();
            } else {
                renderChatHistory(); // Just re-render if a non-active chat was deleted
            }
            saveStateToLocalStorage();
        }
    }

    // --- Persistence & Theming ---
    function saveStateToLocalStorage() {
        localStorage.setItem('rohit_chat_histories', JSON.stringify(chatHistories));
        localStorage.setItem('rohit_current_chat_id', currentChatId);
    }

    function loadStateFromLocalStorage() {
        chatHistories = JSON.parse(localStorage.getItem('rohit_chat_histories')) || {};
        currentChatId = localStorage.getItem('rohit_current_chat_id');
        const theme = localStorage.getItem('rohit_chat_theme');
        themeToggle.checked = theme === 'dark';
    }

    function applyTheme() {
        document.body.classList.toggle('dark-mode', themeToggle.checked);
    }

    function toggleTheme() {
        applyTheme();
        localStorage.setItem('rohit_chat_theme', themeToggle.checked ? 'dark' : 'light');
    }

    // --- Run the app ---
    init();
});
