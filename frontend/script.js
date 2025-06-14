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

    // --- State Management ---
    let currentChatId = null;
    let chatHistories = {}; // { [chatId]: [{ role, content }] }
    
    const API_URL = 'http://localhost:3000/chat';
    const BOT_AVATAR_URL = 'rohitnegi.png'; // A placeholder, replace if you have one
    const USER_AVATAR_URL = 'f1.png'; // A placeholder

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
    }

    // --- Core Chat Logic ---
    async function handleFormSubmit(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToScreen(message, 'user');
        chatHistories[currentChatId].push({ role: 'user', content: message });
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
            chatHistories[currentChatId].push({ role: 'bot', content: data.reply });
            
            // Update history title if it's the first message
            if (chatHistories[currentChatId].length <= 2) {
                updateChatHistoryTitle(currentChatId, message);
            }
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
        chatHistories[currentChatId] = [{
            role: 'bot',
            content: 'Bta bhai...Kaise yaad kiya mujhe aaj!!'
        }];
        
        loadChat(currentChatId);
        renderChatHistory();
        saveStateToLocalStorage();
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        chatWindow.innerHTML = '';
        const history = chatHistories[chatId] || [];
        history.forEach(msg => addMessageToScreen(msg.content, msg.role));

        // Highlight active chat in sidebar
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });
    }
    
    function renderChatHistory() {
        chatHistoryContainer.innerHTML = '';
        Object.keys(chatHistories).reverse().forEach(chatId => {
            const history = chatHistories[chatId];
            const firstUserMessage = history.find(m => m.role === 'user');
            const title = history.title || (firstUserMessage ? firstUserMessage.content : 'New Chat');
            
            const item = document.createElement('button');
            item.className = 'sidebar-button chat-history-item';
            item.dataset.chatId = chatId;
            item.innerHTML = `<span>${title.substring(0, 25)}${title.length > 25 ? '...' : ''}</span>`;
            if (chatId === currentChatId) {
                item.classList.add('active');
            }
            item.addEventListener('click', () => loadChat(chatId));
            chatHistoryContainer.appendChild(item);
        });
    }

    function updateChatHistoryTitle(chatId, title) {
        if (chatHistories[chatId]) {
            chatHistories[chatId].title = title;
            renderChatHistory();
        }
    }

    // --- Persistence (Local Storage) & Theming ---
    function saveStateToLocalStorage() {
        localStorage.setItem('rohit_chat_histories', JSON.stringify(chatHistories));
        localStorage.setItem('rohit_current_chat_id', currentChatId);
    }

    function loadStateFromLocalStorage() {
        chatHistories = JSON.parse(localStorage.getItem('rohit_chat_histories')) || {};
        currentChatId = localStorage.getItem('rohit_current_chat_id');
        const theme = localStorage.getItem('rohit_chat_theme');
        if (theme === 'dark') {
            themeToggle.checked = true;
        }
    }

    function applyTheme() {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    function toggleTheme() {
        applyTheme();
        localStorage.setItem('rohit_chat_theme', themeToggle.checked ? 'dark' : 'light');
    }

    // --- Run the app ---
    init();
});