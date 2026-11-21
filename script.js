// ==================== KONFIGURATION & SPEICHER-SCHLÜSSEL ====================
const ADMIN_USERNAME = "Admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

const STORAGE_KEYS = {
    PLAYERS: "hltv_game_players",
    ADMIN_PASS: "hltv_game_admin_password",
    MESSAGES: "hltv_game_forum_messages",
    NEWS: "hltv_game_news",
    SESSION: "hltv_game_session",
    TOURNAMENTS: "hltv_game_tournaments_v1"
};

// ==================== TURNIER-KONFIGURATION ====================
const TOURNAMENTS_DATA = [
    {
        id: "blast-bounty-2025-s1",
        name: "Blast Bounty 2025 Season 1",
        bracketType: "quali32",
        defaultStatus: "zukuenftig", // "laufend" | "zukuenftig" | "vergangen"
        maxTeams: 32,
        onlineDates: "14.–19. Januar 2025",
        onlineRegion: "Europa (Online)",
        lanDates: "23.–26. Januar 2025",
        lanLocation: "Kopenhagen, Dänemark",
        travelWindow: "20.–22. Januar 2025",
        matchFormatSummary: "Best of 3 (BO3)",
        formatSummary: "Round of 32 → Round of 16 → Top 8 qualifizieren sich für die LAN Finals (Alle Matches BO3)",
        inviteSummary: "Top 32 der Weltrangliste (keine Regionsspezifikation)",
        nextTournamentId: "blast-bounty-2025-s1-finals",
        notices: [
            {
                type: "info",
                icon: "📍",
                title: "Standort-Pflicht (Online-Phase)",
                text: "Dein Team muss sich in Europa befinden, um vom 14.–19. Januar 2025 online an dieser Qualifikationsrunde teilzunehmen."
            },
            {
                type: "warning",
                icon: "✈️",
                title: "Reisehinweis bei Weiterkommen (Top 8)",
                text: "Falls sich dein Team für die Top 8 qualifiziert, musst du vom 20.–22. Januar 2025 nach Kopenhagen (Dänemark) reisen, um dort vom 23.–26. Januar 2025 bei den LAN Finals weiterzuspielen.",
                linkTournamentId: "blast-bounty-2025-s1-finals",
                linkLabel: "→ Zu den Blast Bounty 2025 Season 1 Finals (23.–26. Januar 2025)"
            },
            {
                type: "neutral",
                icon: "🌍",
                title: "Einladungsmodus",
                text: "Eingeladen werden die Top 32 Teams aus der Weltrangliste (VRS). Es gibt keine Regionsspezifikation."
            }
        ],
        rounds: [
            {
                id: "r32",
                name: "Round of 32",
                shortName: "R32",
                defaultFormat: "BO3",
                subtitle: "16 Matches · Best of 3 (BO3) · Jeweils 4 Matches pro Tag (14.–17. Januar 2025)",
                days: [
                    {
                        dayLabel: "Tag 1",
                        dateLabel: "14. Januar 2025",
                        matches: [
                            { id: "r32-1", label: "R32 Match 1" },
                            { id: "r32-2", label: "R32 Match 2" },
                            { id: "r32-3", label: "R32 Match 3" },
                            { id: "r32-4", label: "R32 Match 4" }
                        ]
                    },
                    {
                        dayLabel: "Tag 2",
                        dateLabel: "15. Januar 2025",
                        matches: [
                            { id: "r32-5", label: "R32 Match 5" },
                            { id: "r32-6", label: "R32 Match 6" },
                            { id: "r32-7", label: "R32 Match 7" },
                            { id: "r32-8", label: "R32 Match 8" }
                        ]
                    },
                    {
                        dayLabel: "Tag 3",
                        dateLabel: "16. Januar 2025",
                        matches: [
                            { id: "r32-9", label: "R32 Match 9" },
                            { id: "r32-10", label: "R32 Match 10" },
                            { id: "r32-11", label: "R32 Match 11" },
                            { id: "r32-12", label: "R32 Match 12" }
                        ]
                    },
                    {
                        dayLabel: "Tag 4",
                        dateLabel: "17. Januar 2025",
                        matches: [
                            { id: "r32-13", label: "R32 Match 13" },
                            { id: "r32-14", label: "R32 Match 14" },
                            { id: "r32-15", label: "R32 Match 15" },
                            { id: "r32-16", label: "R32 Match 16" }
                        ]
                    }
                ]
            },
            {
                id: "r16",
                name: "Round of 16",
                shortName: "R16",
                defaultFormat: "BO3",
                subtitle: "8 Matches · Best of 3 (BO3) · Jeweils 4 Matches pro Tag (18.–19. Januar 2025) → Sieger erreichen die Top 8 LAN Finals",
                days: [
                    {
                        dayLabel: "Tag 5",
                        dateLabel: "18. Januar 2025",
                        matches: [
                            { id: "r16-1", label: "R16 Match 1", fromMatches: ["r32-1", "r32-2"], slotHints: ["Sieger R32 #1", "Sieger R32 #2"] },
                            { id: "r16-2", label: "R16 Match 2", fromMatches: ["r32-3", "r32-4"], slotHints: ["Sieger R32 #3", "Sieger R32 #4"] },
                            { id: "r16-3", label: "R16 Match 3", fromMatches: ["r32-5", "r32-6"], slotHints: ["Sieger R32 #5", "Sieger R32 #6"] },
                            { id: "r16-4", label: "R16 Match 4", fromMatches: ["r32-7", "r32-8"], slotHints: ["Sieger R32 #7", "Sieger R32 #8"] }
                        ]
                    },
                    {
                        dayLabel: "Tag 6",
                        dateLabel: "19. Januar 2025",
                        matches: [
                            { id: "r16-5", label: "R16 Match 5", fromMatches: ["r32-9", "r32-10"], slotHints: ["Sieger R32 #9", "Sieger R32 #10"] },
                            { id: "r16-6", label: "R16 Match 6", fromMatches: ["r32-11", "r32-12"], slotHints: ["Sieger R32 #11", "Sieger R32 #12"] },
                            { id: "r16-7", label: "R16 Match 7", fromMatches: ["r32-13", "r32-14"], slotHints: ["Sieger R32 #13", "Sieger R32 #14"] },
                            { id: "r16-8", label: "R16 Match 8", fromMatches: ["r32-15", "r32-16"], slotHints: ["Sieger R32 #15", "Sieger R32 #16"] }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: "blast-bounty-2025-s1-finals",
        name: "Blast Bounty 2025 Season 1 Finals",
        bracketType: "classic8",
        defaultStatus: "zukuenftig",
        maxTeams: 8,
        onlineDates: "23.–26. Januar 2025 (LAN)",
        onlineRegion: "Kopenhagen, Dänemark",
        lanDates: "23.–26. Januar 2025",
        lanLocation: "Kopenhagen, Dänemark",
        travelWindow: "20.–22. Januar 2025 (Anreise)",
        matchFormatSummary: "BO3 (Finale: BO5)",
        formatSummary: "Klassischer K.-o.-Turnierbaum: Viertelfinale (BO3) → Halbfinale (BO3) → Finale (BO5)",
        inviteSummary: "8 Gewinner-Teams aus Blast Bounty 2025 Season 1 (automatisch)",
        prizePoolTotal: 500000,
        prizeDistribution: [
            { place: "🥇 1. Platz", amount: 200000, perTeam: true, sourceType: "final-winner" },
            { place: "🥈 2. Platz", amount: 100000, perTeam: true, sourceType: "final-loser" },
            { place: "🥉 3.–4. Platz", amount: 50000, perTeam: true, sourceType: "sf-losers", labelSuffix: " (je Team)" },
            { place: "🏅 5.–8. Platz", amount: 25000, perTeam: true, sourceType: "qf-losers", labelSuffix: " (je Team)" }
        ],
        qualifiedFrom: {
            tournamentId: "blast-bounty-2025-s1",
            slots: [
                { matchId: "r16-1", label: "Sieger R16 Match 1" },
                { matchId: "r16-2", label: "Sieger R16 Match 2" },
                { matchId: "r16-3", label: "Sieger R16 Match 3" },
                { matchId: "r16-4", label: "Sieger R16 Match 4" },
                { matchId: "r16-5", label: "Sieger R16 Match 5" },
                { matchId: "r16-6", label: "Sieger R16 Match 6" },
                { matchId: "r16-7", label: "Sieger R16 Match 7" },
                { matchId: "r16-8", label: "Sieger R16 Match 8" }
            ]
        },
        notices: [
            {
                type: "info",
                icon: "🏆",
                title: "Automatische Qualifikation aus dem Vorgängerturnier",
                text: "Die 8 Sieger der Round of 16 aus „Blast Bounty 2025 Season 1“ werden automatisch als Teilnehmer für diese LAN Finals in Kopenhagen übernommen.",
                linkTournamentId: "blast-bounty-2025-s1",
                linkLabel: "← Zurück zur Online-Quali: Blast Bounty 2025 Season 1"
            }
        ],
        rounds: [
            {
                id: "qf",
                name: "Viertelfinale",
                shortName: "Viertelfinale",
                defaultFormat: "BO3",
                subtitle: "4 Matches · Best of 3 (BO3) · 23.–24. Januar 2025 · Verlierer erhalten 25.000 $ (Platz 5–8)",
                days: [
                    {
                        dayLabel: "Tag 1",
                        dateLabel: "23. Januar 2025",
                        matches: [
                            { id: "qf-1", label: "Viertelfinale 1", fromPredecessor: ["r16-1", "r16-2"], slotHints: ["Sieger R16 #1", "Sieger R16 #2"] },
                            { id: "qf-2", label: "Viertelfinale 2", fromPredecessor: ["r16-3", "r16-4"], slotHints: ["Sieger R16 #3", "Sieger R16 #4"] }
                        ]
                    },
                    {
                        dayLabel: "Tag 2",
                        dateLabel: "24. Januar 2025",
                        matches: [
                            { id: "qf-3", label: "Viertelfinale 3", fromPredecessor: ["r16-5", "r16-6"], slotHints: ["Sieger R16 #5", "Sieger R16 #6"] },
                            { id: "qf-4", label: "Viertelfinale 4", fromPredecessor: ["r16-7", "r16-8"], slotHints: ["Sieger R16 #7", "Sieger R16 #8"] }
                        ]
                    }
                ]
            },
            {
                id: "sf",
                name: "Halbfinale",
                shortName: "Halbfinale",
                defaultFormat: "BO3",
                subtitle: "2 Matches · Best of 3 (BO3) · 25. Januar 2025 · Verlierer erhalten 50.000 $ (Platz 3–4)",
                days: [
                    {
                        dayLabel: "Tag 3",
                        dateLabel: "25. Januar 2025",
                        matches: [
                            { id: "sf-1", label: "Halbfinale 1", fromMatches: ["qf-1", "qf-2"], slotHints: ["Sieger VF #1", "Sieger VF #2"] },
                            { id: "sf-2", label: "Halbfinale 2", fromMatches: ["qf-3", "qf-4"], slotHints: ["Sieger VF #3", "Sieger VF #4"] }
                        ]
                    }
                ]
            },
            {
                id: "final",
                name: "Finale",
                shortName: "Finale",
                defaultFormat: "BO5",
                subtitle: "1 Match · Best of 5 (BO5) · 26. Januar 2025 · Sieger gewinnt 200.000 $, Platz 2 erhält 100.000 $",
                days: [
                    {
                        dayLabel: "Tag 4",
                        dateLabel: "26. Januar 2025",
                        matches: [
                            { id: "final-1", label: "Grand Final", format: "BO5", fromMatches: ["sf-1", "sf-2"], slotHints: ["Sieger HF #1", "Sieger HF #2"] }
                        ]
                    }
                ]
            }
        ]
    }
];

// ==================== ZUSTAND (STATE) ====================
let currentUser = null; // { username: string, role: 'admin' | 'player' }
let currentView = "tutorial";
let activeTeamUsername = null;

// Turnier-UI-Zustand
let activeTournamentCategory = "laufend";
let activeTournamentId = null;
let activeTournamentSubTab = "bracket";
let selectedVrsPickerDate = "";
let vrsSearchTerm = "";

// ==================== HILFSFUNKTIONEN ====================
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
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

function getPlayerTeamDisplayName(player) {
    return String(player.teamName || player.team_name || `Team ${player.username}`).trim();
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

function getTournamentsState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TOURNAMENTS)) || {};
    } catch (_) {
        return {};
    }
}

function saveTournamentsState(state) {
    localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(state));
}

// ==================== INITIALISIERUNG ====================
document.addEventListener("DOMContentLoaded", () => {
    setupAuthEvents();
    setupAppEvents();
    setupPasswordModalEvents();
    setupTournamentEvents();
    checkExistingSession();
    renderTournamentsView();

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
            renderTournamentsView();
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

        if (e.key === STORAGE_KEYS.TOURNAMENTS || e.key === "hltv_game_ranking_date") {
            renderTournamentsView();
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

    document.getElementById("current-user-name").textContent = currentUser.username;
    document.getElementById("current-user-role").textContent = currentUser.role === "admin" ? "Administrator" : "Spieler";
    document.getElementById("user-avatar").textContent = currentUser.username.charAt(0);

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
    renderTournamentsView();
    switchView("tutorial");
}

function setupAppEvents() {
    document.getElementById("logout-btn").addEventListener("click", logout);

    document.getElementById("main-nav-list").addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-item");
        if (!btn) return;
        if (btn.dataset.view === "turniere") {
            activeTournamentId = null;
            renderTournamentsView();
        }
        switchView(btn.dataset.view);
    });

    document.getElementById("team-nav-list").addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-item");
        if (!btn) return;
        openTeamView(btn.dataset.team);
    });

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
        renderTournamentsView();
    });

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
            renderTournamentsView();

            if (currentView === "team" && activeTeamUsername === username) {
                switchView("admin-panel");
            }
        }
    });

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

// ==================== TURNIERE & TURNIERBAUM ====================
function getTournamentById(tournamentId) {
    return TOURNAMENTS_DATA.find(t => t.id === tournamentId) || null;
}

function getTournamentStatus(tournament) {
    const state = getTournamentsState();
    return state[tournament.id]?.status || tournament.defaultStatus;
}

function getManualParticipants(tournamentId) {
    const state = getTournamentsState();
    return Array.isArray(state[tournamentId]?.participants) ? state[tournamentId].participants : [];
}

function getTournamentMatchesMap(tournamentId) {
    const state = getTournamentsState();
    return state[tournamentId]?.matches || {};
}

function getTournamentWinnersMap(tournamentId) {
    const state = getTournamentsState();
    return state[tournamentId]?.winners || {};
}

function getAllTournamentMatchDefs(tournament) {
    const map = {};
    tournament.rounds.forEach(round => {
        const roundFormat = round.defaultFormat || "BO3";
        round.days.forEach(day => {
            day.matches.forEach(m => {
                map[m.id] = {
                    match: m,
                    dateLabel: day.dateLabel,
                    dayLabel: day.dayLabel,
                    roundId: round.id,
                    matchFormat: m.format || roundFormat
                };
            });
        });
    });
    return map;
}

// Rekursiv-sicher: Ermittelt effektive Slots [uid0, uid1] und Sieger-UID für jedes Match
function resolveTournamentGraph(tournament, visited = new Set()) {
    if (!tournament || visited.has(tournament.id)) {
        return { participants: [], autoSlots: [], matchSlots: {}, matchWinners: {} };
    }
    visited.add(tournament.id);

    const manualParticipants = getManualParticipants(tournament.id);
    const matchesMap = getTournamentMatchesMap(tournament.id);
    const winnersMap = getTournamentWinnersMap(tournament.id);

    let predGraph = null;
    if (tournament.qualifiedFrom) {
        const predTournament = getTournamentById(tournament.qualifiedFrom.tournamentId);
        if (predTournament) {
            predGraph = resolveTournamentGraph(predTournament, new Set(visited));
        }
    }

    // Automatisch qualifizierte Teams aus Vorgängerturnier einsammeln
    const autoSlots = [];
    const effectiveParticipants = [];
    const seenUids = new Set();

    if (tournament.qualifiedFrom && predGraph) {
        tournament.qualifiedFrom.slots.forEach(slot => {
            const winUid = predGraph.matchWinners[slot.matchId] || null;
            const predParticipant = winUid ? predGraph.participants.find(p => p.uid === winUid) : null;
            autoSlots.push({
                matchId: slot.matchId,
                label: slot.label,
                participant: predParticipant ? { ...predParticipant, autoQualified: true, qualifiedFromLabel: slot.label } : null
            });
            if (predParticipant && !seenUids.has(predParticipant.uid)) {
                seenUids.add(predParticipant.uid);
                effectiveParticipants.push({ ...predParticipant, autoQualified: true, qualifiedFromLabel: slot.label });
            }
        });
    }

    manualParticipants.forEach(p => {
        if (!seenUids.has(p.uid)) {
            seenUids.add(p.uid);
            effectiveParticipants.push(p);
        }
    });

    const matchSlots = {};
    const matchWinners = {};

    // Runden in Reihenfolge auflösen (damit Sieger automatisch in die nächste Runde weitergeleitet werden)
    tournament.rounds.forEach(round => {
        round.days.forEach(day => {
            day.matches.forEach(m => {
                const storedRow = matchesMap[m.id];
                const resolvedRow = [null, null];

                for (let s = 0; s < 2; s++) {
                    if (Array.isArray(storedRow) && storedRow[s] !== undefined) {
                        resolvedRow[s] = storedRow[s];
                    } else if (Array.isArray(m.fromMatches) && m.fromMatches[s]) {
                        resolvedRow[s] = matchWinners[m.fromMatches[s]] || null;
                    } else if (Array.isArray(m.fromPredecessor) && m.fromPredecessor[s] && predGraph) {
                        resolvedRow[s] = predGraph.matchWinners[m.fromPredecessor[s]] || null;
                    }
                }

                // Nur gültige Teilnehmer zulassen
                for (let s = 0; s < 2; s++) {
                    if (resolvedRow[s] && !seenUids.has(resolvedRow[s])) {
                        resolvedRow[s] = null;
                    }
                }

                matchSlots[m.id] = resolvedRow;

                const rawWinner = winnersMap[m.id] || null;
                if (rawWinner && (rawWinner === resolvedRow[0] || rawWinner === resolvedRow[1])) {
                    matchWinners[m.id] = rawWinner;
                } else {
                    matchWinners[m.id] = null;
                }
            });
        });
    });

    return { participants: effectiveParticipants, autoSlots, matchSlots, matchWinners };
}

function getVrsRankingsMap() {
    return window.HLTV_VRS_RANKINGS || {};
}

function getVrsEntriesForDate(date) {
    const map = getVrsRankingsMap();
    const list = map[date] || [];
    const nameCounts = {};
    return list.map((item, idx) => {
        const name = String(item[0]);
        const points = Number(item[1]) || 0;
        const region = item[2] ? String(item[2]) : "";
        nameCounts[name] = (nameCounts[name] || 0) + 1;
        return {
            uid: `vrs:${name}#${nameCounts[name]}`,
            rank: idx + 1,
            name,
            points,
            region
        };
    });
}

function getResolvedParticipant(uid, participants) {
    if (!uid) return null;
    const found = participants.find(p => p.uid === uid);
    if (!found) return null;

    if (found.type === "player") {
        const livePlayer = getPlayers().find(p => p.username === found.username);
        const liveName = livePlayer ? getPlayerTeamDisplayName(livePlayer) : found.name;
        return {
            ...found,
            displayName: liveName,
            icon: "🛡️",
            badgeText: `Spieler (${found.username})`
        };
    }

    return {
        ...found,
        displayName: found.name,
        icon: "🏆",
        badgeText: found.rank ? `VRS #${found.rank} (${found.points} Pkt)` : "VRS-Team"
    };
}

function formatCategoryBadge(status) {
    if (status === "laufend") return { label: "🔴 Aktuell laufend", cls: "t-badge-laufend" };
    if (status === "zukuenftig") return { label: "🗓️ Zukünftig", cls: "t-badge-zukuenftig" };
    return { label: "🏁 Vergangen", cls: "t-badge-vergangen" };
}

function buildMatchSlotMarkup(tournamentId, match, slotIndex, assignedUid, winnerUid, participants, isAdmin, preferredUids = []) {
    const resolved = getResolvedParticipant(assignedUid, participants);
    const isWinner = Boolean(winnerUid && assignedUid && winnerUid === assignedUid);
    const isLoser = Boolean(winnerUid && assignedUid && winnerUid !== assignedUid);

    if (!isAdmin) {
        if (!resolved) {
            const hint = match.slotHints?.[slotIndex] ? `TBD (${match.slotHints[slotIndex]})` : "TBD";
            return `<div class="match-team-row tbd"><span>${escapeHTML(hint)}</span><span>–</span></div>`;
        }
        const rowClass = isWinner ? "winner" : (isLoser ? "loser" : "");
        const tag = isWinner ? "🏆 Sieger" : (resolved.type === "player" ? "Spieler" : "VRS");
        return `<div class="match-team-row ${rowClass}"><span>${resolved.icon} ${escapeHTML(resolved.displayName)}</span><span style="font-size:.72rem;">${tag}</span></div>`;
    }

    const prefSet = new Set(preferredUids.filter(Boolean));
    const sorted = [...participants].sort((a, b) => {
        const aPref = prefSet.has(a.uid) ? 0 : 1;
        const bPref = prefSet.has(b.uid) ? 0 : 1;
        return aPref - bPref;
    });

    const options = sorted.map(p => {
        const info = getResolvedParticipant(p.uid, participants);
        const prefix = prefSet.has(p.uid) ? "★ " : "";
        return `<option value="${escapeHTML(p.uid)}" ${p.uid === assignedUid ? "selected" : ""}>${prefix}${info.icon} ${escapeHTML(info.displayName)}</option>`;
    }).join("");

    const tbdLabel = match.slotHints?.[slotIndex] ? `-- TBD (${match.slotHints[slotIndex]}) --` : "-- TBD (Offen) --";

    return `
        <div class="match-admin-slot">
            <select class="match-team-select ${isWinner ? "is-winner" : ""}" data-action="set-match-slot" data-tournament-id="${escapeHTML(tournamentId)}" data-match-id="${escapeHTML(match.id)}" data-slot="${slotIndex}" aria-label="${escapeHTML(match.label)} Team ${slotIndex + 1}">
                <option value="">${escapeHTML(tbdLabel)}</option>
                ${options}
            </select>
            <button type="button" class="btn-winner-toggle ${isWinner ? "active" : ""}" data-action="toggle-winner" data-tournament-id="${escapeHTML(tournamentId)}" data-match-id="${escapeHTML(match.id)}" data-uid="${escapeHTML(assignedUid || "")}" ${!assignedUid ? "disabled" : ""} title="${isWinner ? "Sieger-Markierung entfernen" : "Als Sieger festlegen"}">🏆</button>
        </div>
    `;
}

function renderMatchCard(tournamentId, match, dateLabel, dayLabel, matchFormat, graph, isAdmin, preferredUids = []) {
    const slots = graph.matchSlots[match.id] || [null, null];
    const winnerUid = graph.matchWinners[match.id] || null;
    const fmt = String(matchFormat || match.format || "BO3").toUpperCase();
    const fmtClass = fmt === "BO5" ? "bo5" : "bo3";

    return `
        <div class="match-card">
            <div class="match-card-header">
                <div class="match-card-title">
                    <strong>${escapeHTML(match.label)}</strong>
                    <span class="match-format-pill ${fmtClass}">${escapeHTML(fmt)}</span>
                </div>
                <span class="match-date-pill">${escapeHTML(dayLabel)} · ${escapeHTML(dateLabel)}</span>
            </div>
            ${buildMatchSlotMarkup(tournamentId, match, 0, slots[0], winnerUid, graph.participants, isAdmin, preferredUids)}
            ${buildMatchSlotMarkup(tournamentId, match, 1, slots[1], winnerUid, graph.participants, isAdmin, preferredUids)}
        </div>
    `;
}

function renderQuali32BracketTab(tournament, graph, isAdmin) {
    const r32Round = tournament.rounds.find(r => r.id === "r32");
    const r16Round = tournament.rounds.find(r => r.id === "r16");

    const r32Lookup = {};
    r32Round.days.forEach(day => {
        day.matches.forEach(m => {
            r32Lookup[m.id] = { match: m, dateLabel: day.dateLabel, dayLabel: day.dayLabel, fmt: m.format || r32Round.defaultFormat || "BO3" };
        });
    });

    const r16All = [];
    r16Round.days.forEach(day => {
        day.matches.forEach(m => {
            r16All.push({ match: m, dateLabel: day.dateLabel, dayLabel: day.dayLabel, fmt: m.format || r16Round.defaultFormat || "BO3" });
        });
    });

    const pairsHtml = r16All.map((r16Item, index) => {
        const [leftId, rightId] = r16Item.match.fromMatches;
        const leftR32 = r32Lookup[leftId];
        const rightR32 = r32Lookup[rightId];

        const leftSlots = graph.matchSlots[leftId] || [null, null];
        const rightSlots = graph.matchSlots[rightId] || [null, null];
        const feedingUids = [...leftSlots, ...rightSlots].filter(Boolean);

        const r16WinUid = graph.matchWinners[r16Item.match.id];
        const r16WinInfo = r16WinUid ? getResolvedParticipant(r16WinUid, graph.participants) : null;

        const lanPillText = r16WinInfo
            ? `✅ ${r16WinInfo.icon} ${escapeHTML(r16WinInfo.displayName)}<br><span style="font-weight:400;">Qualifiziert für LAN Finals</span>`
            : `🏆 Top 8 Platz #${index + 1}<br><span style="font-weight:400; color:#fde68a;">→ LAN Finals Kopenhagen</span>`;

        return `
            <div class="bracket-pair">
                <div class="bracket-pair-r32">
                    ${renderMatchCard(tournament.id, leftR32.match, leftR32.dateLabel, leftR32.dayLabel, leftR32.fmt, graph, isAdmin)}
                    ${renderMatchCard(tournament.id, rightR32.match, rightR32.dateLabel, rightR32.dayLabel, rightR32.fmt, graph, isAdmin)}
                </div>
                <div class="bracket-connector" aria-hidden="true"></div>
                <div class="bracket-pair-r16">
                    ${renderMatchCard(tournament.id, r16Item.match, r16Item.dateLabel, r16Item.dayLabel, r16Item.fmt, graph, isAdmin, feedingUids)}
                </div>
                <div class="bracket-lan-cell">
                    <button type="button" class="lan-qual-pill ${r16WinInfo ? "qualified" : ""}" data-action="open-tournament" data-tournament-id="${escapeHTML(tournament.nextTournamentId)}">${lanPillText}</button>
                </div>
            </div>
        `;
    }).join("");

    const adminControls = isAdmin ? `
        <div class="bracket-toolbar">
            <span class="muted">Admin: Wähle Teams und klicke auf 🏆, um den Sieger automatisch weiterzuleiten (R16-Sieger landen direkt in den LAN Finals).</span>
            <div class="news-form-actions" style="margin-top:0;">
                <button type="button" class="btn btn-secondary btn-small" data-action="autofill-r32" data-tournament-id="${escapeHTML(tournament.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Zugewiesene Teams in R32 setzen</button>
                <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${escapeHTML(tournament.id)}">🧹 Matches &amp; Sieger leeren</button>
            </div>
        </div>
    ` : "";

    return `
        ${adminControls}
        <p class="muted-text" style="margin-bottom:10px;">
            Klicke oben auf <strong>Round of 32</strong> oder <strong>Round of 16</strong>, um die einzelnen Spieltage übersichtlich im Detail zu sehen.
        </p>
        <div class="bracket-scroll">
            <div class="bracket-board">
                <div class="bracket-col-headers">
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="r32">
                        ⚔️ Round of 32 (16 Matches · BO3)
                        <small>14.–17. Januar 2025 · 4 Matches pro Tag</small>
                    </div>
                    <div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="r16">
                        🔥 Round of 16 (8 Matches · BO3)
                        <small>18.–19. Januar 2025 · 4 Matches pro Tag</small>
                    </div>
                    <div class="bracket-col-head clickable" data-action="open-tournament" data-tournament-id="${escapeHTML(tournament.nextTournamentId)}">
                        ✈️ LAN Finals
                        <small>23.–26. Jan · Kopenhagen</small>
                    </div>
                </div>
                ${pairsHtml}
            </div>
        </div>
    `;
}

function renderClassic8BracketTab(tournament, graph, isAdmin) {
    const allMatchDefs = getAllTournamentMatchDefs(tournament);
    const qfIds = ["qf-1", "qf-2", "qf-3", "qf-4"];
    const sfIds = ["sf-1", "sf-2"];
    const finalId = "final-1";

    const qfCards = qfIds.map(id => {
        const d = allMatchDefs[id];
        return renderMatchCard(tournament.id, d.match, d.dateLabel, d.dayLabel, d.matchFormat, graph, isAdmin);
    }).join("");

    const sfCards = sfIds.map(id => {
        const d = allMatchDefs[id];
        const sA = graph.matchSlots[d.match.fromMatches[0]] || [];
        const sB = graph.matchSlots[d.match.fromMatches[1]] || [];
        return `<div class="classic-sf-slot">${renderMatchCard(tournament.id, d.match, d.dateLabel, d.dayLabel, d.matchFormat, graph, isAdmin, [...sA, ...sB])}</div>`;
    }).join("");

    const fDef = allMatchDefs[finalId];
    const fPref = [
        ...(graph.matchSlots["sf-1"] || []),
        ...(graph.matchSlots["sf-2"] || [])
    ];
    const finalCard = renderMatchCard(tournament.id, fDef.match, fDef.dateLabel, fDef.dayLabel, fDef.matchFormat, graph, isAdmin, fPref);

    const champUid = graph.matchWinners[finalId];
    const champInfo = champUid ? getResolvedParticipant(champUid, graph.participants) : null;
    const champHtml = champInfo
        ? `<div class="champion-box"><small>🏆 Champion · 1. Platz</small><strong>${champInfo.icon} ${escapeHTML(champInfo.displayName)}</strong><span>200.000 $ Preisgeld</span></div>`
        : `<div class="champion-box"><small>🏆 Turniersieger</small><strong>TBD</strong><span>200.000 $ Preisgeld</span></div>`;

    const adminControls = isAdmin ? `
        <div class="bracket-toolbar">
            <span class="muted">Admin: Die 8 Gewinner aus dem Vorgängerturnier landen automatisch im Viertelfinale. Über 🏆 legst du die Sieger für Halbfinale &amp; Finale fest.</span>
            <div class="news-form-actions" style="margin-top:0;">
                <button type="button" class="btn btn-secondary btn-small" data-action="sync-predecessor-qf" data-tournament-id="${escapeHTML(tournament.id)}">🔄 Qualifizierte Teams neu ins Bracket übernehmen</button>
                <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${escapeHTML(tournament.id)}">🧹 Manuelle Matches/Sieger zurücksetzen</button>
            </div>
        </div>
    ` : "";

    return `
        ${adminControls}
        <div class="bracket-scroll">
            <div class="classic-bracket">
                <div class="classic-col-headers">
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="qf">
                        ⚔️ Viertelfinale (4 · BO3)
                        <small>23.–24. Januar 2025</small>
                    </div>
                    <div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="sf">
                        🔥 Halbfinale (2 · BO3)
                        <small>25. Januar 2025</small>
                    </div>
                    <div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="final">
                        🏆 Finale (1 · BO5)
                        <small>26. Januar 2025</small>
                    </div>
                    <div class="bracket-col-head">
                        🥇 Sieger
                        <small>500.000 $ Gesamtpreispool</small>
                    </div>
                </div>
                <div class="classic-bracket-body">
                    <div class="classic-col-qf">${qfCards}</div>
                    <div class="classic-col-conn-2">
                        <div class="bracket-connector" aria-hidden="true"></div>
                        <div class="bracket-connector" aria-hidden="true"></div>
                    </div>
                    <div class="classic-col-sf">${sfCards}</div>
                    <div class="classic-col-conn-1">
                        <div class="bracket-connector" aria-hidden="true"></div>
                    </div>
                    <div class="classic-col-final">${finalCard}</div>
                    <div class="classic-col-champ">${champHtml}</div>
                </div>
            </div>
        </div>
    `;
}

function renderRoundTab(tournament, round, graph, isAdmin) {
    const roundFmt = round.defaultFormat || "BO3";
    const daysHtml = round.days.map(day => `
        <div class="round-day-card">
            <div class="round-day-header">
                <strong>${escapeHTML(day.dayLabel)} · ${escapeHTML(day.dateLabel)}</strong>
                <span>${day.matches.length} ${day.matches.length === 1 ? "Match" : "Matches"}</span>
            </div>
            ${day.matches.map(m => {
                let preferred = [];
                if (Array.isArray(m.fromMatches)) {
                    const sA = graph.matchSlots[m.fromMatches[0]] || [];
                    const sB = graph.matchSlots[m.fromMatches[1]] || [];
                    preferred = [...sA, ...sB].filter(Boolean);
                }
                return renderMatchCard(tournament.id, m, day.dateLabel, day.dayLabel, m.format || roundFmt, graph, isAdmin, preferred);
            }).join("")}
        </div>
    `).join("");

    return `
        <div class="bracket-toolbar">
            <div>
                <h3 style="margin-bottom:3px;">${escapeHTML(round.name)}</h3>
                <p class="muted">${escapeHTML(round.subtitle)}</p>
            </div>
            ${isAdmin && round.id === "r32" ? `
                <div class="news-form-actions" style="margin-top:0;">
                    <button type="button" class="btn btn-secondary btn-small" data-action="autofill-r32" data-tournament-id="${escapeHTML(tournament.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer in R32 setzen</button>
                    <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${escapeHTML(tournament.id)}">🧹 R32/R16 leeren</button>
                </div>
            ` : ""}
        </div>
        <div class="round-days-grid">${daysHtml}</div>
    `;
}

function renderPrizePoolBox(tournament, graph) {
    if (!tournament.prizePoolTotal || !Array.isArray(tournament.prizeDistribution)) return "";

    const getLoserUid = (matchId) => {
        const winUid = graph.matchWinners[matchId];
        const slots = graph.matchSlots[matchId] || [null, null];
        if (!winUid || !slots[0] || !slots[1]) return null;
        return winUid === slots[0] ? slots[1] : slots[0];
    };

    const resolvePlacementTeams = (sourceType) => {
        if (sourceType === "final-winner") {
            const uid = graph.matchWinners["final-1"];
            return uid ? [getResolvedParticipant(uid, graph.participants)].filter(Boolean) : [];
        }
        if (sourceType === "final-loser") {
            const uid = getLoserUid("final-1");
            return uid ? [getResolvedParticipant(uid, graph.participants)].filter(Boolean) : [];
        }
        if (sourceType === "sf-losers") {
            return ["sf-1", "sf-2"].map(getLoserUid).filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
        }
        if (sourceType === "qf-losers") {
            return ["qf-1", "qf-2", "qf-3", "qf-4"].map(getLoserUid).filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
        }
        return [];
    };

    const tiersHtml = tournament.prizeDistribution.map(tier => {
        const teams = resolvePlacementTeams(tier.sourceType);
        const teamsText = teams.length > 0
            ? teams.map(t => `${t.icon} ${escapeHTML(t.displayName)}`).join(" · ")
            : "Noch offen";
        return `
            <div class="prize-tier">
                <div class="prize-tier-top">
                    <strong>${escapeHTML(tier.place)}</strong>
                    <span class="prize-tier-amount">${tier.amount.toLocaleString("de-DE")} $${escapeHTML(tier.labelSuffix || "")}</span>
                </div>
                <div class="prize-tier-teams">${teamsText}</div>
            </div>
        `;
    }).join("");

    return `
        <div class="prize-pool-box">
            <div class="prize-pool-header">
                <h3>💰 Preisgeldverteilung</h3>
                <span class="prize-total">Gesamtpreispool: ${tournament.prizePoolTotal.toLocaleString("de-DE")} $</span>
            </div>
            <div class="prize-grid">${tiersHtml}</div>
        </div>
    `;
}

function buildVrsSelectOptions(vrsDate, searchQuery, existingUids) {
    const entries = getVrsEntriesForDate(vrsDate);
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? entries.filter(e => e.name.toLowerCase().includes(q)) : entries;

    if (filtered.length === 0) {
        return `<option value="">Keine passenden VRS-Teams gefunden</option>`;
    }

    return filtered.map(e => {
        const alreadyIn = existingUids.has(e.uid);
        const regText = e.region ? ` · ${e.region}` : "";
        return `<option value="${escapeHTML(e.uid)}" ${alreadyIn ? "disabled" : ""}>#${e.rank} ${escapeHTML(e.name)} (${e.points} Pkt${escapeHTML(regText)})${alreadyIn ? " ✓" : ""}</option>`;
    }).join("");
}

function renderParticipantsTab(tournament, graph, isAdmin) {
    const participants = graph.participants;
    const manualParticipants = getManualParticipants(tournament.id);
    const existingUids = new Set(participants.map(p => p.uid));
    const isFull = participants.length >= tournament.maxTeams;

    let adminPanel = "";
    if (isAdmin) {
        const allPlayers = getPlayers();
        const playerOptions = allPlayers.length
            ? allPlayers.map(p => {
                const uid = `player:${p.username}`;
                const alreadyIn = existingUids.has(uid);
                const tName = getPlayerTeamDisplayName(p);
                return `<option value="${escapeHTML(p.username)}" ${alreadyIn ? "disabled" : ""}>🛡️ ${escapeHTML(tName)} (${escapeHTML(p.username)})${alreadyIn ? " ✓" : ""}</option>`;
            }).join("")
            : `<option value="">Keine Spieler erstellt</option>`;

        const vrsMap = getVrsRankingsMap();
        const vrsDates = Object.keys(vrsMap).sort();
        const savedRankingDate = localStorage.getItem("hltv_game_ranking_date");
        if (!selectedVrsPickerDate || !vrsMap[selectedVrsPickerDate]) {
            selectedVrsPickerDate = (savedRankingDate && vrsMap[savedRankingDate]) ? savedRankingDate : (vrsDates[0] || "");
        }

        const vrsDateOptions = vrsDates.map(d =>
            `<option value="${escapeHTML(d)}" ${d === selectedVrsPickerDate ? "selected" : ""}>${escapeHTML(d)}</option>`
        ).join("");

        const vrsOptions = selectedVrsPickerDate
            ? buildVrsSelectOptions(selectedVrsPickerDate, vrsSearchTerm, existingUids)
            : `<option value="">Keine VRS-Daten geladen</option>`;

        adminPanel = `
            <div class="tournament-admin-box">
                <div class="tournament-card-top">
                    <h3>🛡️ Admin: Teams dem Turnier zuweisen (${participants.length} / ${tournament.maxTeams})</h3>
                    <div class="news-form-actions" style="margin-top:0;">
                        <button type="button" class="btn btn-secondary btn-small" data-action="fill-top-vrs" data-tournament-id="${escapeHTML(tournament.id)}" ${isFull || !selectedVrsPickerDate ? "disabled" : ""}>⚡ Freie Plätze mit VRS-Top-Teams auffüllen</button>
                        <button type="button" class="btn btn-danger btn-small" data-action="clear-participants" data-tournament-id="${escapeHTML(tournament.id)}" ${manualParticipants.length === 0 ? "disabled" : ""}>Manuelle Teams entfernen</button>
                    </div>
                </div>
                <div class="assign-grid">
                    <div class="assign-card">
                        <label for="tournament-player-select">Spieler-Team zuweisen</label>
                        <div class="assign-row">
                            <select id="tournament-player-select">${playerOptions}</select>
                            <button type="button" class="btn btn-primary btn-small" data-action="add-player-team" data-tournament-id="${escapeHTML(tournament.id)}" ${isFull || allPlayers.length === 0 ? "disabled" : ""}>Hinzufügen</button>
                        </div>
                    </div>
                    <div class="assign-card">
                        <label for="tournament-vrs-select">VRS-Ranked Team zuweisen</label>
                        <div class="assign-row">
                            <select id="tournament-vrs-date" style="max-width:135px;" title="VRS-Datum">${vrsDateOptions}</select>
                            <input type="text" id="tournament-vrs-search" placeholder="Team suchen..." value="${escapeHTML(vrsSearchTerm)}">
                        </div>
                        <div class="assign-row">
                            <select id="tournament-vrs-select">${vrsOptions}</select>
                            <button type="button" class="btn btn-accent btn-small" data-action="add-vrs-team" data-tournament-id="${escapeHTML(tournament.id)}" ${isFull || !selectedVrsPickerDate ? "disabled" : ""}>Hinzufügen</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    let listHtml = "";
    if (tournament.qualifiedFrom) {
        const autoCards = graph.autoSlots.map((slot, index) => {
            if (slot.participant) {
                const info = getResolvedParticipant(slot.participant.uid, participants);
                return `
                    <div class="participant-item auto">
                        <div class="participant-info">
                            <strong>#${index + 1} ${info.icon} ${escapeHTML(info.displayName)}</strong>
                            <small>Automatisch qualifiziert (${escapeHTML(slot.label)})</small>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="participant-item pending">
                    <div class="participant-info">
                        <strong>#${index + 1} TBD (${escapeHTML(slot.label)})</strong>
                        <small>Wird automatisch aus Vorgängerturnier übernommen</small>
                    </div>
                </div>
            `;
        }).join("");

        const manualCards = manualParticipants.map((p, idx) => {
            const info = getResolvedParticipant(p.uid, participants);
            return `
                <div class="participant-item">
                    <div class="participant-info">
                        <strong>Manuell #${idx + 1}: ${info.icon} ${escapeHTML(info.displayName)}</strong>
                        <small>${escapeHTML(info.badgeText)}</small>
                    </div>
                    ${isAdmin ? `<button type="button" class="btn btn-danger btn-small" data-action="remove-participant" data-tournament-id="${escapeHTML(tournament.id)}" data-uid="${escapeHTML(p.uid)}" title="Entfernen">×</button>` : ""}
                </div>
            `;
        }).join("");

        listHtml = `<div class="participants-grid">${autoCards}${manualCards}</div>`;
    } else if (participants.length > 0) {
        listHtml = `<div class="participants-grid">${participants.map((p, index) => {
            const info = getResolvedParticipant(p.uid, participants);
            return `
                <div class="participant-item">
                    <div class="participant-info">
                        <strong>#${index + 1} ${info.icon} ${escapeHTML(info.displayName)}</strong>
                        <small>${escapeHTML(info.badgeText)}${p.region ? ` · ${escapeHTML(p.region)}` : ""}</small>
                    </div>
                    ${isAdmin ? `<button type="button" class="btn btn-danger btn-small" data-action="remove-participant" data-tournament-id="${escapeHTML(tournament.id)}" data-uid="${escapeHTML(p.uid)}" title="Entfernen">×</button>` : ""}
                </div>
            `;
        }).join("")}</div>`;
    } else {
        listHtml = `<div class="placeholder-box"><span>Noch keine Teams für dieses Turnier eingetragen (0 / ${tournament.maxTeams}).${isAdmin ? " Nutze oben die Admin-Zuweisung, um Spieler- oder VRS-Teams hinzuzufügen." : ""}</span></div>`;
    }

    return `${adminPanel}${listHtml}`;
}

function renderTournamentDetail(tournament) {
    const isAdmin = currentUser?.role === "admin";
    const status = getTournamentStatus(tournament);
    const badge = formatCategoryBadge(status);
    const graph = resolveTournamentGraph(tournament);
    const participants = graph.participants;

    const statusSelectHtml = isAdmin ? `
        <div class="tournament-admin-status">
            <label for="tournament-status-select">Status (Admin):</label>
            <select id="tournament-status-select" data-tournament-id="${escapeHTML(tournament.id)}">
                <option value="zukuenftig" ${status === "zukuenftig" ? "selected" : ""}>🗓️ Zukünftig</option>
                <option value="laufend" ${status === "laufend" ? "selected" : ""}>🔴 Aktuell laufend</option>
                <option value="vergangen" ${status === "vergangen" ? "selected" : ""}>🏁 Vergangen</option>
            </select>
        </div>
    ` : "";

    const noticesHtml = tournament.notices.map(n => `
        <div class="tournament-notice ${escapeHTML(n.type)}">
            <strong>${n.icon} ${escapeHTML(n.title)}</strong>
            <span>${escapeHTML(n.text)}</span>
            ${n.linkTournamentId ? `
                <div class="tournament-notice-actions">
                    <button type="button" class="tournament-notice-link" data-action="open-tournament" data-tournament-id="${escapeHTML(n.linkTournamentId)}">${escapeHTML(n.linkLabel)}</button>
                </div>
            ` : ""}
        </div>
    `).join("");

    const roundTabs = tournament.rounds.map(r => {
        const icon = r.id === "r32" || r.id === "qf" ? "⚔️" : (r.id === "r16" || r.id === "sf" ? "🔥" : "🏆");
        const fmtTag = r.defaultFormat ? ` (${r.defaultFormat})` : "";
        return `<button type="button" class="tournament-subtab ${activeTournamentSubTab === r.id ? "active" : ""}" data-action="switch-subtab" data-subtab="${escapeHTML(r.id)}">${icon} ${escapeHTML(r.name)}${escapeHTML(fmtTag)}</button>`;
    }).join("");

    let subContent = "";
    if (activeTournamentSubTab === "bracket") {
        subContent = tournament.bracketType === "classic8"
            ? renderClassic8BracketTab(tournament, graph, isAdmin)
            : renderQuali32BracketTab(tournament, graph, isAdmin);
    } else if (activeTournamentSubTab === "participants") {
        subContent = renderParticipantsTab(tournament, graph, isAdmin);
    } else {
        const round = tournament.rounds.find(r => r.id === activeTournamentSubTab);
        subContent = round
            ? renderRoundTab(tournament, round, graph, isAdmin)
            : (tournament.bracketType === "classic8" ? renderClassic8BracketTab(tournament, graph, isAdmin) : renderQuali32BracketTab(tournament, graph, isAdmin));
    }

    const prizeStatHtml = tournament.prizePoolTotal
        ? `<div class="stat-box"><span class="stat-label">Gesamtpreispool</span><span class="stat-value" style="color:var(--accent-orange);">${tournament.prizePoolTotal.toLocaleString("de-DE")} $</span></div>`
        : `<div class="stat-box"><span class="stat-label">Anreise bei Top 8</span><span class="stat-value">${escapeHTML(tournament.travelWindow)}</span></div>`;

    return `
        <div class="card">
            <div class="tournament-detail-topbar">
                <button type="button" class="btn btn-secondary btn-small" data-action="back-to-overview">← Zurück zur Turnierübersicht</button>
                <div class="row" style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
                    ${tournament.prizePoolTotal ? `<span class="t-badge t-badge-prize">💰 ${tournament.prizePoolTotal.toLocaleString("de-DE")} $ Preispool</span>` : ""}
                    <span class="t-badge ${badge.cls}">${badge.label}</span>
                    ${statusSelectHtml}
                </div>
            </div>

            <h2>🏅 ${escapeHTML(tournament.name)}</h2>
            <p class="muted-text">${escapeHTML(tournament.formatSummary)}</p>

            <div class="tournament-info-grid">
                <div class="stat-box"><span class="stat-label">Zeitraum</span><span class="stat-value">${escapeHTML(tournament.onlineDates)}</span></div>
                <div class="stat-box"><span class="stat-label">Austragungsort</span><span class="stat-value">${escapeHTML(tournament.onlineRegion)}</span></div>
                <div class="stat-box"><span class="stat-label">Match-Format</span><span class="stat-value">${escapeHTML(tournament.matchFormatSummary)}</span></div>
                ${prizeStatHtml}
                <div class="stat-box"><span class="stat-label">LAN Finals Ort</span><span class="stat-value">${escapeHTML(tournament.lanDates)} · ${escapeHTML(tournament.lanLocation)}</span></div>
                <div class="stat-box"><span class="stat-label">Teilnehmer</span><span class="stat-value">${participants.length} / ${tournament.maxTeams} Teams</span></div>
            </div>

            ${renderPrizePoolBox(tournament, graph)}
            <div class="tournament-notices">${noticesHtml}</div>

            <div class="tournament-subtabs" role="tablist">
                <button type="button" class="tournament-subtab ${activeTournamentSubTab === "bracket" ? "active" : ""}" data-action="switch-subtab" data-subtab="bracket">🌳 Turnierbaum</button>
                ${roundTabs}
                <button type="button" class="tournament-subtab ${activeTournamentSubTab === "participants" ? "active" : ""}" data-action="switch-subtab" data-subtab="participants">👥 Teilnehmer (${participants.length}/${tournament.maxTeams})</button>
            </div>

            <div>${subContent}</div>
        </div>
    `;
}

function renderTournamentOverview() {
    const counts = { laufend: 0, zukuenftig: 0, vergangen: 0 };
    const categorized = { laufend: [], zukuenftig: [], vergangen: [] };

    TOURNAMENTS_DATA.forEach(t => {
        const st = getTournamentStatus(t);
        if (counts[st] !== undefined) {
            counts[st]++;
            categorized[st].push(t);
        }
    });

    const activeList = categorized[activeTournamentCategory] || [];
    const emptyLabels = {
        laufend: "🔴 Aktuell laufen keine Turniere.",
        zukuenftig: "🗓️ Keine zukünftigen Turniere in dieser Kategorie.",
        vergangen: "🏁 Noch keine vergangenen Turniere vorhanden."
    };

    const listHtml = activeList.length > 0
        ? `<div class="tournament-list">${activeList.map(t => {
            const st = getTournamentStatus(t);
            const badge = formatCategoryBadge(st);
            const graph = resolveTournamentGraph(t);
            return `
                <button type="button" class="tournament-card" data-action="open-tournament" data-tournament-id="${escapeHTML(t.id)}">
                    <div class="tournament-card-top">
                        <span class="tournament-card-title">🏅 ${escapeHTML(t.name)}</span>
                        <div class="row" style="display:flex; gap:8px; flex-wrap:wrap;">
                            ${t.prizePoolTotal ? `<span class="t-badge t-badge-prize">💰 ${t.prizePoolTotal.toLocaleString("de-DE")} $</span>` : ""}
                            <span class="t-badge ${badge.cls}">${badge.label}</span>
                        </div>
                    </div>
                    <div class="tournament-card-meta">
                        <span>📅 Zeitraum: ${escapeHTML(t.onlineDates)} (${escapeHTML(t.onlineRegion)})</span>
                        ${t.bracketType === "quali32" ? `<span>✈️ LAN Finals: ${escapeHTML(t.lanDates)} (${escapeHTML(t.lanLocation)})</span>` : ""}
                        <span>🎮 Format: ${escapeHTML(t.matchFormatSummary)}</span>
                        <span>👥 ${graph.participants.length} / ${t.maxTeams} Teams</span>
                        <span>🌍 ${escapeHTML(t.inviteSummary)}</span>
                    </div>
                    <div class="tournament-card-foot">
                        <span>${escapeHTML(t.formatSummary)}</span>
                        <span>Turnierbaum &amp; Details öffnen →</span>
                    </div>
                </button>
            `;
        }).join("")}</div>`
        : `<div class="placeholder-box"><span>${emptyLabels[activeTournamentCategory]}</span></div>`;

    return `
        <div class="card">
            <h2>Turnierübersicht</h2>
            <p class="muted-text">Wähle eine Kategorie aus, um aktuell laufende, zukünftige oder vergangene Turniere anzuzeigen.</p>
            <div class="tournament-tabs" role="tablist" aria-label="Turnier-Kategorien">
                <button type="button" class="tournament-tab ${activeTournamentCategory === "laufend" ? "active" : ""}" data-tournament-tab="laufend" role="tab" aria-selected="${activeTournamentCategory === "laufend"}">
                    🔴 Aktuell laufend <span class="tournament-tab-count">${counts.laufend}</span>
                </button>
                <button type="button" class="tournament-tab ${activeTournamentCategory === "zukuenftig" ? "active" : ""}" data-tournament-tab="zukuenftig" role="tab" aria-selected="${activeTournamentCategory === "zukuenftig"}">
                    🗓️ Zukünftig <span class="tournament-tab-count">${counts.zukuenftig}</span>
                </button>
                <button type="button" class="tournament-tab ${activeTournamentCategory === "vergangen" ? "active" : ""}" data-tournament-tab="vergangen" role="tab" aria-selected="${activeTournamentCategory === "vergangen"}">
                    🏁 Vergangen <span class="tournament-tab-count">${counts.vergangen}</span>
                </button>
            </div>
            <div>${listHtml}</div>
        </div>
    `;
}

function renderTournamentsView() {
    const root = document.getElementById("tournaments-root");
    if (!root) return;

    if (activeTournamentId) {
        const tournament = getTournamentById(activeTournamentId);
        if (tournament) {
            root.innerHTML = renderTournamentDetail(tournament);
            if (currentView === "turniere") {
                document.getElementById("view-title").textContent = tournament.name;
            }
            return;
        }
        activeTournamentId = null;
    }

    root.innerHTML = renderTournamentOverview();
    if (currentView === "turniere") {
        document.getElementById("view-title").textContent = "Turniere";
    }
}

function setupTournamentEvents() {
    const root = document.getElementById("tournaments-root");
    if (!root) return;

    root.addEventListener("click", (e) => {
        const catTab = e.target.closest("[data-tournament-tab]");
        if (catTab) {
            activeTournamentCategory = catTab.dataset.tournamentTab;
            renderTournamentsView();
            return;
        }

        const actionEl = e.target.closest("[data-action]");
        if (!actionEl) return;
        const action = actionEl.dataset.action;

        if (action === "open-tournament") {
            const targetTournament = getTournamentById(actionEl.dataset.tournamentId);
            if (targetTournament) {
                activeTournamentCategory = getTournamentStatus(targetTournament);
            }
            activeTournamentId = actionEl.dataset.tournamentId;
            activeTournamentSubTab = "bracket";
            renderTournamentsView();
            document.querySelector(".content-body")?.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        if (action === "back-to-overview") {
            activeTournamentId = null;
            renderTournamentsView();
            return;
        }

        if (action === "switch-subtab") {
            activeTournamentSubTab = actionEl.dataset.subtab;
            renderTournamentsView();
            return;
        }

        // Ab hier nur Admin-Aktionen
        if (currentUser?.role !== "admin") return;
        const tId = actionEl.dataset.tournamentId;
        const tournament = getTournamentById(tId);
        if (!tournament) return;

        const state = getTournamentsState();
        if (!state[tId]) state[tId] = { participants: [], matches: {}, winners: {} };
        if (!Array.isArray(state[tId].participants)) state[tId].participants = [];
        if (!state[tId].matches) state[tId].matches = {};
        if (!state[tId].winners) state[tId].winners = {};

        if (action === "toggle-winner") {
            const matchId = actionEl.dataset.matchId;
            const uid = actionEl.dataset.uid;
            if (!uid) return;
            if (state[tId].winners[matchId] === uid) {
                delete state[tId].winners[matchId];
            } else {
                state[tId].winners[matchId] = uid;
            }
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "add-player-team") {
            const graph = resolveTournamentGraph(tournament);
            if (graph.participants.length >= tournament.maxTeams) return;
            const select = document.getElementById("tournament-player-select");
            const username = select?.value;
            if (!username) return;
            const player = getPlayers().find(p => p.username === username);
            if (!player) return;
            const uid = `player:${player.username}`;
            if (graph.participants.some(p => p.uid === uid)) return;

            state[tId].participants.push({
                uid,
                type: "player",
                username: player.username,
                name: getPlayerTeamDisplayName(player)
            });
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "add-vrs-team") {
            const graph = resolveTournamentGraph(tournament);
            if (graph.participants.length >= tournament.maxTeams) return;
            const select = document.getElementById("tournament-vrs-select");
            const uid = select?.value;
            if (!uid || !selectedVrsPickerDate) return;
            if (graph.participants.some(p => p.uid === uid)) return;

            const vrsEntry = getVrsEntriesForDate(selectedVrsPickerDate).find(entry => entry.uid === uid);
            if (!vrsEntry) return;

            state[tId].participants.push({
                uid: vrsEntry.uid,
                type: "vrs",
                name: vrsEntry.name,
                points: vrsEntry.points,
                rank: vrsEntry.rank,
                region: vrsEntry.region
            });
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "fill-top-vrs") {
            if (!selectedVrsPickerDate) return;
            const graph = resolveTournamentGraph(tournament);
            let totalCount = graph.participants.length;
            const existing = new Set(graph.participants.map(p => p.uid));
            const entries = getVrsEntriesForDate(selectedVrsPickerDate);
            for (const entry of entries) {
                if (totalCount >= tournament.maxTeams) break;
                if (existing.has(entry.uid)) continue;
                state[tId].participants.push({
                    uid: entry.uid,
                    type: "vrs",
                    name: entry.name,
                    points: entry.points,
                    rank: entry.rank,
                    region: entry.region
                });
                existing.add(entry.uid);
                totalCount++;
            }
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "remove-participant") {
            const uid = actionEl.dataset.uid;
            state[tId].participants = state[tId].participants.filter(p => p.uid !== uid);
            for (const mId of Object.keys(state[tId].matches)) {
                state[tId].matches[mId] = state[tId].matches[mId].map(slot => (slot === uid ? null : slot));
                if (state[tId].winners[mId] === uid) delete state[tId].winners[mId];
            }
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "clear-participants") {
            if (!confirm("Wirklich alle manuell zugewiesenen Teams aus diesem Turnier entfernen?")) return;
            state[tId].participants = [];
            state[tId].matches = {};
            state[tId].winners = {};
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "autofill-r32") {
            const list = resolveTournamentGraph(tournament).participants;
            const r32 = tournament.rounds.find(r => r.id === "r32");
            let idx = 0;
            r32.days.forEach(day => {
                day.matches.forEach(m => {
                    state[tId].matches[m.id] = [
                        list[idx]?.uid || null,
                        list[idx + 1]?.uid || null
                    ];
                    idx += 2;
                });
            });
            state[tId].winners = {};
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "sync-predecessor-qf") {
            state[tId].matches = {};
            state[tId].winners = {};
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "clear-matches") {
            state[tId].matches = {};
            state[tId].winners = {};
            saveTournamentsState(state);
            renderTournamentsView();
        }
    });

    root.addEventListener("change", (e) => {
        if (currentUser?.role !== "admin") return;

        if (e.target.id === "tournament-vrs-date") {
            selectedVrsPickerDate = e.target.value;
            renderTournamentsView();
            return;
        }

        if (e.target.id === "tournament-status-select") {
            const tId = e.target.dataset.tournamentId;
            const newStatus = e.target.value;
            const state = getTournamentsState();
            if (!state[tId]) state[tId] = { participants: [], matches: {}, winners: {} };
            state[tId].status = newStatus;
            activeTournamentCategory = newStatus;
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (e.target.dataset.action === "set-match-slot") {
            const tId = e.target.dataset.tournamentId;
            const matchId = e.target.dataset.matchId;
            const slotIdx = Number(e.target.dataset.slot);
            const val = e.target.value || null;

            const tournament = getTournamentById(tId);
            const prevGraph = tournament ? resolveTournamentGraph(tournament) : null;
            const prevUid = prevGraph?.matchSlots[matchId]?.[slotIdx] || null;

            const state = getTournamentsState();
            if (!state[tId]) state[tId] = { participants: [], matches: {}, winners: {} };
            if (!state[tId].matches) state[tId].matches = {};
            if (!state[tId].winners) state[tId].winners = {};
            if (!Array.isArray(state[tId].matches[matchId])) {
                state[tId].matches[matchId] = [undefined, undefined];
            }

            state[tId].matches[matchId][slotIdx] = val;
            if (prevUid && state[tId].winners[matchId] === prevUid && val !== prevUid) {
                delete state[tId].winners[matchId];
            }

            saveTournamentsState(state);
            renderTournamentsView();
        }
    });

    root.addEventListener("input", (e) => {
        if (e.target.id !== "tournament-vrs-search") return;
        vrsSearchTerm = e.target.value;
        const select = document.getElementById("tournament-vrs-select");
        const tournament = getTournamentById(activeTournamentId);
        if (!select || !tournament || !selectedVrsPickerDate) return;
        const existingUids = new Set(resolveTournamentGraph(tournament).participants.map(p => p.uid));
        select.innerHTML = buildVrsSelectOptions(selectedVrsPickerDate, vrsSearchTerm, existingUids);
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
    if (viewName === "turniere") {
        renderTournamentsView();
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
