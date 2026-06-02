import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxkOJZxYRUYPtnzBqIXqPQCffD3YHck5k",
  authDomain: "iub-assistent.firebaseapp.com",
  projectId: "iub-assistent",
  storageBucket: "iub-assistent.firebasestorage.app",
  messagingSenderId: "987745080142",
  appId: "1:987745080142:web:daf4b55fcb54bdd7c4841f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    let currentUser: User | null = null;
    let chatHistory: { role: string, text: string }[] = [];
    let isLoginMode = true;
    
    // --- DOM ELEMENTS ---
    const pages = document.querySelectorAll('.page-container');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const mainContentPanels = document.querySelectorAll('.dashboard-main > div[id^="main-"]');

    // Public Page Elements
    const publicLoginButton = document.getElementById('public-login-button');
    const publicGuestButton = document.getElementById('public-guest-button');
    
    // Login Page Elements
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    const emailInput = document.getElementById('email-input') as HTMLInputElement;
    const passwordInput = document.getElementById('password-input') as HTMLInputElement;
    const authTitle = document.getElementById('auth-title');
    const authButton = document.getElementById('auth-button');
    const toggleAuthModeLink = document.getElementById('toggle-auth-mode');
    const toggleContainerText = document.getElementById('toggle-text');
    const authError = document.getElementById('auth-error');

    // Dashboard Page Elements
    const navToDashboard = document.getElementById('nav-dashboard');
    const navToSchedule = document.getElementById('nav-schedule');
    const navToSubjects = document.getElementById('nav-subjects');
    const navToChatbot = document.getElementById('nav-chatbot');
    const logoutButton = document.getElementById('logout-button');
    const userEmailDisplay = document.getElementById('user-email-display');
    const ctaChatbotPanel = document.getElementById('cta-chatbot-panel');

    // Chatbot Page Elements
    const chatbotHeaderButton = document.getElementById('chatbot-header-button');
    const chatbotForm = document.getElementById('chatbot-form') as HTMLFormElement;
    const chatbotArea = document.querySelector('.chatbot-area');
    const chatbotInput = chatbotForm?.querySelector('input') as HTMLInputElement;
    const chatbotSubmitButton = chatbotForm?.querySelector('button') as HTMLButtonElement;


    /**
     * Parses a string with simple markdown into HTML.
     * Supports **bold** and lists starting with "-".
     * @param {string} text - The text to parse.
     * @returns {string} The resulting HTML.
     */
    function parseMarkdown(text: string): string {
        let html = text
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // **bold**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Process lists line-by-line
        const lines = html.split('\n');
        let inList = false;
        const resultLines = [];
        for (const line of lines) {
            const isListItem = line.trim().startsWith('- ');
            if (isListItem) {
                if (!inList) {
                    resultLines.push('<ul>');
                    inList = true;
                }
                resultLines.push(`<li>${line.trim().substring(2)}</li>`);
            } else {
                if (inList) {
                    resultLines.push('</ul>');
                    inList = false;
                }
                resultLines.push(line);
            }
        }
        if (inList) {
            resultLines.push('</ul>');
        }

        // Re-join and handle newlines OUTSIDE of lists
        html = resultLines.join('\n');
        return html.replace(/<\/ul>\n/g, '</ul>').replace(/\n<ul>/g, '<ul>').replace(/\n/g, '<br>');
    }

    /**
     * Adds a message to the chat area and scrolls to it.
     * @param {string} content - The message content.
     * @param {'user' | 'bot' | 'error'} sender - The sender of the message.
     * @returns {HTMLElement | null} The created content div for the message.
     */
    function addMessage(content: string, sender: 'user' | 'bot' | 'error'): HTMLElement | null {
        if (!chatbotArea) return null;

        const messageContainer = document.createElement('div');
        messageContainer.className = 'chat-message';
        
        if (sender === 'user') {
            messageContainer.classList.add('user');
        } else {
            messageContainer.classList.add('bot');
            if (sender === 'error') {
                messageContainer.classList.add('error');
            }
        }

        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        messageBubble.appendChild(messageContent);
        messageContainer.appendChild(messageBubble);
        chatbotArea.appendChild(messageContainer);

        chatbotArea.scrollTop = chatbotArea.scrollHeight;
        
        return messageContent;
    }

    /**
     * Initializes a new chat session. Clears the UI and creates a new backend chat instance.
     * This makes chat sessions for guests ephemeral.
     */
    function initializeChat() {
        // 1. Reset the UI
        if (chatbotArea) {
            // Remove all previous messages
            const messages = chatbotArea.querySelectorAll('.chat-message');
            messages.forEach(msg => msg.remove());
            
            // Add the welcome message back
            const welcomeMessageContainer = document.createElement('div');
            welcomeMessageContainer.className = 'chat-message bot';
            welcomeMessageContainer.innerHTML = `
                <div class="message-bubble">
                    <div class="message-content">¡Hola! Soy IUB Assistant, tu asistente virtual para la Institución Universitaria de Barranquilla. ¿En qué puedo ayudarte hoy?</div>
                </div>
            `;
            chatbotArea.appendChild(welcomeMessageContainer);
        }

        // 2. Reset the history array
        chatHistory = [];

        // Re-enable chat inputs
        if (chatbotInput) chatbotInput.disabled = false;
        if (chatbotSubmitButton) chatbotSubmitButton.disabled = false;
    }

    // --- HELPER FUNCTIONS ---
    function showPage(pageId: string) {
        pages.forEach(page => {
            page.classList.toggle('hidden', page.id !== pageId);
        });
        const activePage = document.getElementById(pageId);
        if (activePage) {
            activePage.classList.remove('hidden');
        }
    }

    function setActiveNav(activeId: string) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.id === activeId);
        });
    }
    
    function showMainContent(contentId: string) {
        mainContentPanels.forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== contentId);
        });
    }

    function updateChatbotHeader() {
        if (!chatbotHeaderButton) return;
        if (currentUser) {
            chatbotHeaderButton.textContent = 'Volver al Dashboard';
        } else {
            chatbotHeaderButton.textContent = 'Volver al Inicio';
        }
    }

    // --- FIREBASE AUTH LOGIC ---
    onAuthStateChanged(auth, user => {
        currentUser = user;
        if (user) {
            // User is signed in
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            showPage('dashboard-page');
            setActiveNav('nav-dashboard');
            showMainContent('main-dashboard-content');
        } else {
            // User is signed out
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            showPage('public-page');
        }
        initializeChat(); // Reset chat on any authentication state change
        updateChatbotHeader();
    });

    function handleAuthFormSubmit(e: Event) {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showAuthError("Por favor, ingresa correo y contraseña.");
            return;
        }
        
        hideAuthError();

        if (isLoginMode) {
            // Sign in
            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    showAuthError(getFriendlyFirebaseError(error.code));
                });
        } else {
            // Register
            createUserWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    showAuthError(getFriendlyFirebaseError(error.code));
                });
        }
    }
    
    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        hideAuthError();
        if (authTitle && authButton && toggleAuthModeLink && toggleContainerText) {
            if (isLoginMode) {
                authTitle.textContent = "Iniciar Sesión";
                authButton.textContent = "Ingresar";
                toggleContainerText.textContent = "¿No tienes una cuenta?";
                toggleAuthModeLink.textContent = "Regístrate";
            } else {
                authTitle.textContent = "Crear Cuenta";
                authButton.textContent = "Registrarse";
                toggleContainerText.textContent = "¿Ya tienes una cuenta?";
                toggleAuthModeLink.textContent = "Inicia Sesión";
            }
        }
    }

    function showAuthError(message: string) {
        if(authError) {
            authError.textContent = message;
            authError.classList.remove('hidden');
        }
    }
    
    function hideAuthError() {
        if(authError) {
            authError.textContent = '';
            authError.classList.add('hidden');
        }
    }
    
    function getFriendlyFirebaseError(errorCode: string): string {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Correo o contraseña incorrectos.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            default:
                return 'Ocurrió un error. Por favor, inténtalo de nuevo.';
        }
    }

    // --- CHATBOT LOGIC ---
    async function handleChatSubmit(e: Event) {
        e.preventDefault();
        if (!chatbotInput || chatbotInput.disabled) return;

        const userInput = chatbotInput.value.trim();
        if (!userInput) return;

        chatbotInput.disabled = true;
        chatbotSubmitButton.disabled = true;

        addMessage(userInput, 'user');
        chatbotInput.value = '';

        const botMessageContent = addMessage('', 'bot');
        if (!botMessageContent) return;

        botMessageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userInput, history: chatHistory })
            });

            if (!response.ok) {
                let errorText = 'API Request Failed';
                try {
                    const result = await response.json();
                    if (result.error) errorText = result.error;
                } catch { }
                throw new Error(errorText);
            }

            chatHistory.push({ role: 'user', text: userInput });

            if (!response.body) throw new Error('No response body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;
                botMessageContent.innerHTML = parseMarkdown(fullResponse);
                if (chatbotArea) {
                    chatbotArea.scrollTop = chatbotArea.scrollHeight;
                }
            }
            
            chatHistory.push({ role: 'model', text: fullResponse });

        } catch (error) {
            console.error('API Error:', error);
            botMessageContent.innerHTML = '<p>Oops! Algo salió mal. Por favor, inténtalo de nuevo.</p>';
            botMessageContent.closest('.chat-message')?.classList.add('error');
        } finally {
            chatbotInput.disabled = false;
            chatbotSubmitButton.disabled = false;
            chatbotInput.focus();
        }
    }

    // --- EVENT LISTENERS & INITIALIZATION ---
    if (publicLoginButton) {
        publicLoginButton.addEventListener('click', () => {
            showPage('login-page');
        });
    }

    if (publicGuestButton) {
        publicGuestButton.addEventListener('click', () => {
            initializeChat(); // Ensure a fresh chat for every guest session
            showPage('chatbot-page');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleAuthFormSubmit);
    }
    
    if (toggleAuthModeLink) {
        toggleAuthModeLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }

    if (navToDashboard) {
        navToDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-dashboard');
            showMainContent('main-dashboard-content');
        });
    }
    
    if (navToSchedule) {
        navToSchedule.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-schedule');
            showMainContent('main-schedule-content');
        });
    }
    
    if (navToSubjects) {
        navToSubjects.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-subjects');
            showMainContent('main-subjects-content');
        });
    }

    if (navToChatbot) {
        navToChatbot.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('chatbot-page');
            setActiveNav('nav-chatbot');
        });
    }
    
    if (ctaChatbotPanel) {
        ctaChatbotPanel.addEventListener('click', () => {
            showPage('chatbot-page');
            setActiveNav('nav-chatbot');
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth);
        });
    }

    if (chatbotHeaderButton) {
        chatbotHeaderButton.addEventListener('click', () => {
            if (currentUser) {
                showPage('dashboard-page');
                setActiveNav('nav-dashboard');
                showMainContent('main-dashboard-content');
            } else {
                showPage('public-page');
            }
        });
    }

    if (chatbotForm) {
        chatbotForm.addEventListener('submit', handleChatSubmit);
    }

    // Initial check is handled by onAuthStateChanged, which also calls initializeChat
});