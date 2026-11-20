// ==================== KONFIGURATION & SPEICHER-SCHLÜSSEL ====================
const ADMIN_CREDENTIALS = {
    username: "Admin",
    password: "admin123"
};

const STORAGE_KEYS = {
    PLAYERS: "hltv_game_players",
    MESSAGES: "hltv_game_forum_messages",
    NEWS: "hltv_game_news",
    SESSION: "hltv_game_session"
};

// ==================== ZUSTAND (STATE) ====================
let currentUser = null; // { username: string, role: 'admin' | 'player' }
let currentView = "tutorial";
let activeTeamUsername = null;

// ==================== HILFSFUNKTIONEN ====================
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function getPlayers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
}

function savePlayers(players) {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
}

function getMessages() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES)) || [];
}

function saveMessages(messages) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

function getNews() {
    const stored = localStorage.getItem(STORAGE_KEYS.NEWS);
    if (stored) return JSON.parse(stored);

    // Standard-News beim ersten Start
    const defaultNews = [
        {
            id: 1,
            title: "Neue Saison im HLTV Manager gestartet!",
            body: "Die Server sind online. Sobald der Admin eure Benutzernamen freischaltet, könnt ihr euren Teambereich einsehen und im Forum diskutieren.",
            author: "Admin",
            date: new Date().toLocaleDateString("de-DE")
        }
    ];
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(defaultNews));
    return defaultNews;
}

function saveNews(newsList) {
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(newsList));
}

// ==================== INITIALISIERUNG ====================
document.addEventListener("DOMContentLoaded", () => {
    setupAuthEvents();
    setupAppEvents();
    checkExistingSession();

    // Live-Synchronisation zwischen mehreren offenen Browser-Tabs
    window.addEventListener("storage", (e) => {
        if (!currentUser) return;

        if (e.key === STORAGE_KEYS.PLAYERS) {
            // Prüfen ob der aktuelle Spieler evtl. entfernt wurde
            if (currentUser.role === "player") {
                const players = getPlayers();
                if (!players.includes(currentUser.username)) {
                    logout();
                    return;
                }
            }
            renderTeamSidebar();
            renderAdminPlayerList();
            if (currentView === "team" && activeTeamUsername && !getPlayers().includes(activeTeamUsername)) {
                switchView("tutorial");
            }
        }

        if (e.key === STORAGE_KEYS.MESSAGES) {
            renderForumMessages();
        }

        if (e.key === STORAGE_KEYS.NEWS) {
            renderNews();
        }
    });
});

// ==================== LOGIN & AUTHENTIFIZIERUNG ====================
function setupAuthEvents() {
    const tabs = document.querySelectorAll(".auth-tab");
    const playerForm = document.getElementById("player-login-form");
    const adminForm = document.getElementById("admin-login-form");
    const errorBox = document.getElementById("auth-error");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            errorBox.classList.add("hidden");

            if (tab.dataset.tab === "player") {
                playerForm.classList.add("active");
                adminForm.classList.remove("active");
            } else {
                adminForm.classList.add("active");
                playerForm.classList.remove("active");
            }
        });
    });

    // Spieler-Login
    playerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("player-username").value.trim();
        const allowedPlayers = getPlayers();

        if (!input || !allowedPlayers.includes(input)) {
            showAuthError("Unbekannter Benutzername! Bitte wende dich an den Admin.");
            return;
        }

        loginUser({ username: input, role: "player" });
        playerForm.reset();
    });

    // Admin-Login
    adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("admin-username").value.trim();
        const pass = document.getElementById("admin-password").value;

        if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
            loginUser({ username: user, role: "admin" });
            adminForm.reset();
        } else {
            showAuthError("Falscher Admin-Name oder falsches Passwort!");
        }
    });
}

function showAuthError(msg) {
    const errorBox = document.getElementById("auth-error");
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
}

function loginUser(user) {
    currentUser = user;
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    document.getElementById("auth-error").classList.add("hidden");
    showApp();
}

function checkExistingSession() {
    const saved = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (!saved) return;

    const parsed = JSON.parse(saved);
    if (parsed.role === "player" && !getPlayers().includes(parsed.username)) {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        return;
    }

    currentUser = parsed;
    showApp();
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
}

// ==================== HAUPTANWENDUNG ====================
function showApp() {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");

    // Benutzeranzeige in Sidebar aktualisieren
    document.getElementById("current-user-name").textContent = currentUser.username;
    document.getElementById("current-user-role").textContent = currentUser.role === "admin" ? "Administrator" : "Spieler";
    document.getElementById("user-avatar").textContent = currentUser.username.charAt(0);

    // Admin-Elemente ein-/ausblenden
    const adminNav = document.getElementById("admin-nav-li");
    const adminNewsCreator = document.getElementById("admin-news-creator");
    if (currentUser.role === "admin") {
        adminNav.classList.remove("hidden");
        adminNewsCreator.classList.remove("hidden");
    } else {
        adminNav.classList.add("hidden");
        adminNewsCreator.classList.add("hidden");
    }

    renderTeamSidebar();
    renderAdminPlayerList();
    renderNews();
    renderForumMessages();
    switchView("tutorial");
}

function setupAppEvents() {
    // Abmelden
    document.getElementById("logout-btn").addEventListener("click", logout);

    // Hauptnavigation (statische Menüpunkte)
    document.getElementById("main-nav-list").addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-item");
        if (!btn) return;
        switchView(btn.dataset.view);
    });

    // Dynamische Team-Navigation
    document.getElementById("team-nav-list").addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-item");
        if (!btn) return;
        openTeamView(btn.dataset.team);
    });

    // Admin: Neuen Benutzernamen hinzufügen
    document.getElementById("add-player-form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (currentUser?.role !== "admin") return;

        const input = document.getElementById("new-player-username");
        const newName = input.value.trim();
        const feedback = document.getElementById("admin-feedback");

        if (!newName) return;

        const players = getPlayers();
        if (players.includes(newName) || newName === ADMIN_CREDENTIALS.username) {
            feedback.textContent = `Der Benutzername "${newName}" existiert bereits!`;
            feedback.className = "feedback-msg error";
            feedback.classList.remove("hidden");
            return;
        }

        players.push(newName);
        savePlayers(players);
        input.value = "";

        feedback.textContent = `Spieler "${newName}" wurde hinzugefügt. Teambereich ist jetzt in der Taskleiste verfügbar.`;
        feedback.className = "feedback-msg success";
        feedback.classList.remove("hidden");

        renderTeamSidebar();
        renderAdminPlayerList();
    });

    // Forum Chat Nachricht senden
    document.getElementById("chat-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("chat-input");
        const text = input.value.trim();
        if (!text || !currentUser) return;

        const messages = getMessages();
        messages.push({
            id: Date.now(),
            author: currentUser.username,
            role: currentUser.role,
            text: text,
            time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        });

        saveMessages(messages);
        input.value = "";
        renderForumMessages();
    });

    // Admin: News posten
    document.getElementById("news-form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (currentUser?.role !== "admin") return;

        const titleInput = document.getElementById("news-title-input");
        const bodyInput = document.getElementById("news-body-input");

        const news = getNews();
        news.unshift({
            id: Date.now(),
            title: titleInput.value.trim(),
            body: bodyInput.value.trim(),
            author: currentUser.username,
            date: new Date().toLocaleDateString("de-DE")
        });

        saveNews(news);
        titleInput.value = "";
        bodyInput.value = "";
        renderNews();
    });
}

// ==================== ANSICHTEN WECHSELN ====================
const VIEW_TITLES = {
    "tutorial": "Tutorial",
    "news": "HLTV - News",
    "forum": "HLTV - Forum",
    "managing": "Managing",
    "transfermarkt": "Transfermarkt",
    "pack-opening": "Pack Opening",
    "admin-panel": "Admin-Panel"
};

function switchView(viewName) {
    currentView = viewName;
    activeTeamUsername = null;

    // Alle Views verstecken
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

    // Gewählte View anzeigen
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) targetSection.classList.add("active");

    const targetBtn = document.querySelector(`#main-nav-list .nav-item[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add("active");

    document.getElementById("view-title").textContent = VIEW_TITLES[viewName] || "Übersicht";

    if (viewName === "forum") {
        scrollChatToBottom();
    }
}

function openTeamView(username) {
    currentView = "team";
    activeTeamUsername = username;

    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

    document.getElementById("view-team").classList.add("active");

    const teamBtn = document.querySelector(`#team-nav-list .nav-item[data-team="${CSS.escape(username)}"]`);
    if (teamBtn) teamBtn.classList.add("active");

    document.getElementById("view-title").textContent = `Team ${username}`;
    document.getElementById("team-view-badge").textContent = username.charAt(0);
    document.getElementById("team-view-name").textContent = `Team ${username}`;
    document.getElementById("team-view-owner").textContent = `Manager: ${username}`;
    document.getElementById("team-view-owner-inline").textContent = username;
}

// ==================== RENDERING FUNKTIONEN ====================
function renderTeamSidebar() {
    const list = document.getElementById("team-nav-list");
    const players = getPlayers();

    if (players.length === 0) {
        list.innerHTML = `<li class="empty-team-hint">Noch keine Spieler erstellt</li>`;
        return;
    }

    list.innerHTML = players.map(player => {
        const isActive = currentView === "team" && activeTeamUsername === player ? "active" : "";
        return `
            <li>
                <button class="nav-item ${isActive}" data-team="${escapeHTML(player)}">
                    🛡️ Team ${escapeHTML(player)}
                </button>
            </li>
        `;
    }).join("");
}

function renderAdminPlayerList() {
    const list = document.getElementById("admin-player-list");
    const countSpan = document.getElementById("player-count");
    const players = getPlayers();

    countSpan.textContent = players.length;

    if (players.length === 0) {
        list.innerHTML = `<li class="empty-team-hint">Noch keine Benutzernamen angelegt.</li>`;
        return;
    }

    list.innerHTML = players.map(player => `
        <li class="admin-list-item">
            <span><strong>${escapeHTML(player)}</strong> (Team ${escapeHTML(player)})</span>
            <button class="btn btn-danger" onclick="removePlayer('${escapeHTML(player).replace(/'/g, "\\'")}')">Entfernen</button>
        </li>
    `).join("");
}

// Global verfügbar für onclick im Admin-Panel
window.removePlayer = function(username) {
    if (currentUser?.role !== "admin") return;

    const players = getPlayers().filter(p => p !== username);
    savePlayers(players);

    renderTeamSidebar();
    renderAdminPlayerList();

    if (currentView === "team" && activeTeamUsername === username) {
        switchView("admin-panel");
    }
};

function renderForumMessages() {
    const container = document.getElementById("chat-messages");
    const messages = getMessages();

    if (messages.length === 0) {
        container.innerHTML = `<div class="empty-team-hint" style="text-align:center; margin-top: 20px;">Noch keine Nachrichten im Forum. Schreib die erste Nachricht!</div>`;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isOwn = currentUser && msg.author === currentUser.username;
        const badgeClass = msg.role === "admin" ? "admin-badge" : "";
        const roleLabel = msg.role === "admin" ? " [ADMIN]" : "";

        return `
            <div class="chat-msg ${isOwn ? "own-msg" : ""}">
                <div class="chat-msg-header">
                    <span class="chat-author ${badgeClass}">${escapeHTML(msg.author)}${roleLabel}</span>
                    <span class="chat-time">${escapeHTML(msg.time)}</span>
                </div>
                <div class="chat-text">${escapeHTML(msg.text)}</div>
            </div>
        `;
    }).join("");

    scrollChatToBottom();
}

function scrollChatToBottom() {
    const container = document.getElementById("chat-messages");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function renderNews() {
    const container = document.getElementById("news-feed");
    const newsList = getNews();

    container.innerHTML = newsList.map(item => `
        <article class="news-item">
            <div class="news-meta">Veröffentlicht am ${escapeHTML(item.date)} von ${escapeHTML(item.author)}</div>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.body)}</p>
        </article>
    `).join("");
}
