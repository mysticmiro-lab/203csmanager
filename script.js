// ==================== KONFIGURATION & SPEICHER-SCHLÜSSEL ====================
const ADMIN_USERNAME = "Admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

const STORAGE_KEYS = {
    PLAYERS: "hltv_game_players",
    ADMIN_PASS: "hltv_game_admin_password",
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

function generateRandomPassword(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    if (window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            password += chars.charAt(array[i] % chars.length);
        }
    } else {
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return password;
}

function getAdminPassword() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || DEFAULT_ADMIN_PASSWORD;
}

function saveAdminPassword(newPass) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, newPass);
}

function getPlayers() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    // Abwärtskompatibilität falls noch alte String-Einträge im Speicher liegen
    let migrated = false;
    const normalized = raw.map(item => {
        if (typeof item === "string") {
            migrated = true;
            return {
                username: item,
                password: generateRandomPassword(8),
                passwordChanged: false
            };
        }
        return item;
    });

    if (migrated) {
        savePlayers(normalized);
    }
    return normalized;
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
            body: "Die Server sind online. Sobald der Admin eure Benutzernamen und Passwörter erstellt, könnt ihr euch anmelden, euren Teambereich einsehen und im Forum diskutieren.",
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
    setupPasswordModalEvents();
    checkExistingSession();

    // Live-Synchronisation zwischen mehreren offenen Browser-Tabs
    window.addEventListener("storage", (e) => {
        if (!currentUser) return;

        if (e.key === STORAGE_KEYS.PLAYERS) {
            const players = getPlayers();
            if (currentUser.role === "player") {
                if (!players.some(p => p.username === currentUser.username)) {
                    logout();
                    return;
                }
            }
            renderTeamSidebar();
            renderAdminPlayerList();
            if (currentView === "team" && activeTeamUsername && !players.some(p => p.username === activeTeamUsername)) {
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

    // Spieler-Login (Benutzername + Passwort)
    playerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById("player-username").value.trim();
        const passwordInput = document.getElementById("player-password").value;
        const players = getPlayers();

        const foundPlayer = players.find(p => p.username === usernameInput);

        if (!foundPlayer || foundPlayer.password !== passwordInput) {
            showAuthError("Falscher Benutzername oder falsches Passwort!");
            return;
        }

        loginUser({ username: foundPlayer.username, role: "player" });
        playerForm.reset();
    });

    // Admin-Login
    adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("admin-username").value.trim();
        const pass = document.getElementById("admin-password").value;

        if (user === ADMIN_USERNAME && pass === getAdminPassword()) {
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
    if (parsed.role === "player" && !getPlayers().some(p => p.username === parsed.username)) {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        return;
    }

    currentUser = parsed;
    showApp();
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    closePasswordModal();
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

    // Admin: Neuen Benutzernamen hinzufügen + zufälliges Passwort generieren
    document.getElementById("add-player-form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (currentUser?.role !== "admin") return;

        const input = document.getElementById("new-player-username");
        const newName = input.value.trim();
        const feedback = document.getElementById("admin-feedback");

        if (!newName) return;

        const players = getPlayers();
        if (players.some(p => p.username === newName) || newName === ADMIN_USERNAME) {
            feedback.textContent = `Der Benutzername "${newName}" existiert bereits!`;
            feedback.className = "feedback-msg error";
            feedback.classList.remove("hidden");
            return;
        }

        const generatedPassword = generateRandomPassword(8);
        players.push({
            username: newName,
            password: generatedPassword,
            passwordChanged: false
        });
        savePlayers(players);
        input.value = "";

        feedback.innerHTML = `Spieler <strong>${escapeHTML(newName)}</strong> wurde erstellt!<br>Zufälliges Passwort zum Weitergeben: <code class="password-pill">${escapeHTML(generatedPassword)}</code>`;
        feedback.className = "feedback-msg success";
        feedback.classList.remove("hidden");

        renderTeamSidebar();
        renderAdminPlayerList();
    });

    // Admin-Spielerliste Aktionen (Kopieren, Neues Passwort, Entfernen)
    document.getElementById("admin-player-list").addEventListener("click", (e) => {
        if (currentUser?.role !== "admin") return;

        const copyBtn = e.target.closest("[data-action='copy-pw']");
        if (copyBtn) {
            const pw = copyBtn.dataset.password;
            navigator.clipboard?.writeText(pw).then(() => {
                const original = copyBtn.textContent;
                copyBtn.textContent = "Kopiert!";
                setTimeout(() => { copyBtn.textContent = original; }, 1200);
            });
            return;
        }

        const resetBtn = e.target.closest("[data-action='reset-pw']");
        if (resetBtn) {
            const username = resetBtn.dataset.username;
            const players = getPlayers();
            const player = players.find(p => p.username === username);
            if (!player) return;

            const newPw = generateRandomPassword(8);
            player.password = newPw;
            player.passwordChanged = false;
            savePlayers(players);

            const feedback = document.getElementById("admin-feedback");
            feedback.innerHTML = `Neues Passwort für <strong>${escapeHTML(username)}</strong>: <code class="password-pill">${escapeHTML(newPw)}</code>`;
            feedback.className = "feedback-msg success";
            feedback.classList.remove("hidden");

            renderAdminPlayerList();
            return;
        }

        const removeBtn = e.target.closest("[data-action='remove']");
        if (removeBtn) {
            const username = removeBtn.dataset.username;
            const players = getPlayers().filter(p => p.username !== username);
            savePlayers(players);

            renderTeamSidebar();
            renderAdminPlayerList();

            if (currentView === "team" && activeTeamUsername === username) {
                switchView("admin-panel");
            }
        }
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


    // Turnierübersicht: Zwischen laufenden, zukünftigen und vergangenen Turnieren wechseln
    document.querySelector(".tournament-tabs")?.addEventListener("click", (e) => {
        const tab = e.target.closest(".tournament-tab");
        if (!tab) return;

        const targetKey = tab.dataset.tournamentTab;

        document.querySelectorAll(".tournament-tab").forEach(btn => {
            const isActive = btn === tab;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-selected", String(isActive));
        });

        document.querySelectorAll(".tournament-panel").forEach(panel => {
            panel.classList.toggle("active", panel.id === `tournament-panel-${targetKey}`);
        });
    });
}

// ==================== PASSWORT ÄNDERN (MODAL) ====================
function setupPasswordModalEvents() {
    const modal = document.getElementById("password-modal");
    const openBtn = document.getElementById("open-password-modal-btn");
    const closeBtn = document.getElementById("close-password-modal");
    const cancelBtn = document.getElementById("cancel-password-modal");
    const form = document.getElementById("change-password-form");

    openBtn.addEventListener("click", () => {
        form.reset();
        document.getElementById("password-feedback").classList.add("hidden");
        modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", closePasswordModal);
    cancelBtn.addEventListener("click", closePasswordModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closePasswordModal();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const oldPw = document.getElementById("old-password").value;
        const newPw = document.getElementById("new-password").value;
        const confirmPw = document.getElementById("confirm-password").value;
        const feedback = document.getElementById("password-feedback");

        if (newPw.length < 4) {
            showPasswordFeedback("Das neue Passwort muss mindestens 4 Zeichen lang sein.", "error");
            return;
        }

        if (newPw !== confirmPw) {
            showPasswordFeedback("Die neuen Passwörter stimmen nicht überein.", "error");
            return;
        }

        if (currentUser.role === "admin") {
            if (oldPw !== getAdminPassword()) {
                showPasswordFeedback("Das aktuelle Passwort ist falsch.", "error");
                return;
            }
            saveAdminPassword(newPw);
        } else {
            const players = getPlayers();
            const player = players.find(p => p.username === currentUser.username);
            if (!player || player.password !== oldPw) {
                showPasswordFeedback("Das aktuelle Passwort ist falsch.", "error");
                return;
            }
            player.password = newPw;
            player.passwordChanged = true;
            savePlayers(players);
            renderAdminPlayerList();
        }

        form.reset();
        showPasswordFeedback("Passwort erfolgreich geändert!", "success");
        setTimeout(() => {
            if (!modal.classList.contains("hidden")) {
                closePasswordModal();
            }
        }, 1200);
    });
}

function showPasswordFeedback(msg, type) {
    const feedback = document.getElementById("password-feedback");
    feedback.textContent = msg;
    feedback.className = `feedback-msg ${type}`;
    feedback.classList.remove("hidden");
}

function closePasswordModal() {
    document.getElementById("password-modal").classList.add("hidden");
    document.getElementById("change-password-form").reset();
    document.getElementById("password-feedback").classList.add("hidden");
}

// ==================== ANSICHTEN WECHSELN ====================
const VIEW_TITLES = {
    "tutorial": "Tutorial",
    "news": "HLTV - News",
    "forum": "HLTV - Forum",
    "managing": "Managing",
    "transfermarkt": "Transfermarkt",
    "pack-opening": "Pack Opening",
    "turniere": "Turniere",
    "admin-panel": "Admin-Panel"
};

function switchView(viewName) {
    currentView = viewName;
    activeTeamUsername = null;

    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

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
        const isActive = currentView === "team" && activeTeamUsername === player.username ? "active" : "";
        return `
            <li>
                <button class="nav-item ${isActive}" data-team="${escapeHTML(player.username)}">
                    🛡️ Team ${escapeHTML(player.username)}
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

    list.innerHTML = players.map(player => {
        const pwDisplay = player.passwordChanged
            ? `<span class="password-changed-tag">(Passwort vom Spieler geändert)</span>`
            : `<code class="password-pill">${escapeHTML(player.password)}</code>
               <button class="btn btn-secondary btn-small" data-action="copy-pw" data-password="${escapeHTML(player.password)}">Kopieren</button>`;

        return `
            <li class="admin-list-item">
                <div class="admin-player-info">
                    <strong>${escapeHTML(player.username)}</strong>
                    <span>(Team ${escapeHTML(player.username)})</span>
                    ${pwDisplay}
                </div>
                <div class="admin-actions">
                    <button class="btn btn-secondary btn-small" data-action="reset-pw" data-username="${escapeHTML(player.username)}">Neues PW</button>
                    <button class="btn btn-danger" data-action="remove" data-username="${escapeHTML(player.username)}">Entfernen</button>
                </div>
            </li>
        `;
    }).join("");
}

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
