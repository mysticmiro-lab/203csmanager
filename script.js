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
        defaultStatus: "zukuenftig", // "laufend" | "zukuenftig" | "vergangen"
        maxTeams: 32,
        onlineDates: "14.–19. Januar 2025",
        onlineRegion: "Europa (Online)",
        lanDates: "23.–26. Januar 2025",
        lanLocation: "Kopenhagen, Dänemark",
        travelWindow: "20.–22. Januar 2025",
        formatSummary: "Round of 32 → Round of 16 → Top 8 qualifizieren sich für die LAN Finals",
        inviteSummary: "Top 32 der Weltrangliste (keine Regionsspezifikation)",
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
                text: "Falls sich dein Team für die Top 8 qualifiziert, musst du vom 20.–22. Januar 2025 nach Kopenhagen (Dänemark) reisen, um dort vom 23.–26. Januar 2025 bei den LAN Finals weiterzuspielen."
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
                subtitle: "16 Matches · Jeweils 4 Matches pro Tag (14.–17. Januar 2025)",
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
                subtitle: "8 Matches · Jeweils 4 Matches pro Tag (18.–19. Januar 2025) → Sieger erreichen die Top 8 LAN Finals",
                days: [
                    {
                        dayLabel: "Tag 5",
                        dateLabel: "18. Januar 2025",
                        matches: [
                            { id: "r16-1", label: "R16 Match 1", fromR32: ["r32-1", "r32-2"] },
                            { id: "r16-2", label: "R16 Match 2", fromR32: ["r32-3", "r32-4"] },
                            { id: "r16-3", label: "R16 Match 3", fromR32: ["r32-5", "r32-6"] },
                            { id: "r16-4", label: "R16 Match 4", fromR32: ["r32-7", "r32-8"] }
                        ]
                    },
                    {
                        dayLabel: "Tag 6",
                        dateLabel: "19. Januar 2025",
                        matches: [
                            { id: "r16-5", label: "R16 Match 5", fromR32: ["r32-9", "r32-10"] },
                            { id: "r16-6", label: "R16 Match 6", fromR32: ["r32-11", "r32-12"] },
                            { id: "r16-7", label: "R16 Match 7", fromR32: ["r32-13", "r32-14"] },
                            { id: "r16-8", label: "R16 Match 8", fromR32: ["r32-15", "r32-16"] }
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
let activeTournamentSubTab = "bracket"; // "bracket" | "r32" | "r16" | "participants"
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
function getTournamentStatus(tournament) {
    const state = getTournamentsState();
    return state[tournament.id]?.status || tournament.defaultStatus;
}

function getTournamentParticipants(tournamentId) {
    const state = getTournamentsState();
    return Array.isArray(state[tournamentId]?.participants) ? state[tournamentId].participants : [];
}

function getTournamentMatches(tournamentId) {
    const state = getTournamentsState();
    return state[tournamentId]?.matches || {};
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

function buildMatchSlotMarkup(tournamentId, matchId, slotIndex, assignedUid, participants, isAdmin, preferredUids = []) {
    const resolved = getResolvedParticipant(assignedUid, participants);
    if (!isAdmin) {
        if (!resolved) {
            return `<div class="match-team-row tbd"><span>TBD</span><span>–</span></div>`;
        }
        return `<div class="match-team-row"><span>${resolved.icon} ${escapeHTML(resolved.displayName)}</span><span class="muted" style="font-size:.72rem;">${resolved.type === "player" ? "Spieler" : "VRS"}</span></div>`;
    }

    const prefSet = new Set(preferredUids.filter(Boolean));
    const sorted = [...participants].sort((a, b) => {
        const aPref = prefSet.has(a.uid) ? 0 : 1;
        const bPref = prefSet.has(b.uid) ? 0 : 1;
        if (aPref !== bPref) return aPref - bPref;
        return 0;
    });

    const options = sorted.map(p => {
        const info = getResolvedParticipant(p.uid, participants);
        const prefix = prefSet.has(p.uid) ? "★ " : "";
        return `<option value="${escapeHTML(p.uid)}" ${p.uid === assignedUid ? "selected" : ""}>${prefix}${info.icon} ${escapeHTML(info.displayName)}</option>`;
    }).join("");

    return `
        <select class="match-team-select" data-action="set-match-slot" data-tournament-id="${escapeHTML(tournamentId)}" data-match-id="${escapeHTML(matchId)}" data-slot="${slotIndex}" aria-label="${escapeHTML(matchId)} Team ${slotIndex + 1}">
            <option value="">-- TBD (Offen) --</option>
            ${options}
        </select>
    `;
}

function renderMatchCard(tournamentId, match, dateLabel, dayLabel, participants, matchesMap, isAdmin, preferredUids = []) {
    const slots = matchesMap[match.id] || [null, null];
    return `
        <div class="match-card">
            <div class="match-card-header">
                <strong>${escapeHTML(match.label)}</strong>
                <span class="match-date-pill">${escapeHTML(dayLabel)} · ${escapeHTML(dateLabel)}</span>
            </div>
            ${buildMatchSlotMarkup(tournamentId, match.id, 0, slots[0], participants, isAdmin, preferredUids)}
            ${buildMatchSlotMarkup(tournamentId, match.id, 1, slots[1], participants, isAdmin, preferredUids)}
        </div>
    `;
}

function renderBracketTab(tournament, participants, matchesMap, isAdmin) {
    const r32Round = tournament.rounds.find(r => r.id === "r32");
    const r16Round = tournament.rounds.find(r => r.id === "r16");

    const r32Lookup = {};
    r32Round.days.forEach(day => {
        day.matches.forEach(m => {
            r32Lookup[m.id] = { match: m, dateLabel: day.dateLabel, dayLabel: day.dayLabel };
        });
    });

    const r16All = [];
    r16Round.days.forEach(day => {
        day.matches.forEach(m => {
            r16All.push({ match: m, dateLabel: day.dateLabel, dayLabel: day.dayLabel });
        });
    });

    const pairsHtml = r16All.map((r16Item, index) => {
        const [leftId, rightId] = r16Item.match.fromR32;
        const leftR32 = r32Lookup[leftId];
        const rightR32 = r32Lookup[rightId];

        const leftSlots = matchesMap[leftId] || [null, null];
        const rightSlots = matchesMap[rightId] || [null, null];
        const feedingUids = [...leftSlots, ...rightSlots].filter(Boolean);

        return `
            <div class="bracket-pair">
                <div class="bracket-pair-r32">
                    ${renderMatchCard(tournament.id, leftR32.match, leftR32.dateLabel, leftR32.dayLabel, participants, matchesMap, isAdmin)}
                    ${renderMatchCard(tournament.id, rightR32.match, rightR32.dateLabel, rightR32.dayLabel, participants, matchesMap, isAdmin)}
                </div>
                <div class="bracket-connector" aria-hidden="true"></div>
                <div class="bracket-pair-r16">
                    ${renderMatchCard(tournament.id, r16Item.match, r16Item.dateLabel, r16Item.dayLabel, participants, matchesMap, isAdmin, feedingUids)}
                </div>
                <div class="bracket-lan-cell">
                    <div class="lan-qual-pill">🏆 Top 8 Platz #${index + 1}<br><span style="font-weight:400; color:#fde68a;">→ LAN Finals Kopenhagen</span></div>
                </div>
            </div>
        `;
    }).join("");

    const adminControls = isAdmin ? `
        <div class="bracket-toolbar">
            <span class="muted">Admin-Steuerung: Teams können direkt im Turnierbaum pro Match ausgewählt oder automatisch befüllt werden.</span>
            <div class="news-form-actions" style="margin-top:0;">
                <button type="button" class="btn btn-secondary btn-small" data-action="autofill-r32" data-tournament-id="${escapeHTML(tournament.id)}" ${participants.length === 0 ? "disabled" : ""}>🎲 Zugewiesene Teams in R32 setzen</button>
                <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${escapeHTML(tournament.id)}">🧹 Matches leeren</button>
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
                        ⚔️ Round of 32 (16 Matches)
                        <small>14.–17. Januar 2025 · 4 Matches pro Tag</small>
                    </div>
                    <div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="r16">
                        🔥 Round of 16 (8 Matches)
                        <small>18.–19. Januar 2025 · 4 Matches pro Tag</small>
                    </div>
                    <div class="bracket-col-head">
                        ✈️ LAN Finals
                        <small>23.–26. Jan · Kopenhagen</small>
                    </div>
                </div>
                ${pairsHtml}
            </div>
        </div>
    `;
}

function renderRoundTab(tournament, round, participants, matchesMap, isAdmin) {
    const daysHtml = round.days.map(day => `
        <div class="round-day-card">
            <div class="round-day-header">
                <strong>${escapeHTML(day.dayLabel)} · ${escapeHTML(day.dateLabel)}</strong>
                <span>${day.matches.length} Matches</span>
            </div>
            ${day.matches.map(m => {
                let preferred = [];
                if (Array.isArray(m.fromR32)) {
                    const sA = matchesMap[m.fromR32[0]] || [];
                    const sB = matchesMap[m.fromR32[1]] || [];
                    preferred = [...sA, ...sB].filter(Boolean);
                }
                return renderMatchCard(tournament.id, m, day.dateLabel, day.dayLabel, participants, matchesMap, isAdmin, preferred);
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
                    <button type="button" class="btn btn-secondary btn-small" data-action="autofill-r32" data-tournament-id="${escapeHTML(tournament.id)}" ${participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer in R32 setzen</button>
                    <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${escapeHTML(tournament.id)}">🧹 R32/R16 leeren</button>
                </div>
            ` : ""}
        </div>
        <div class="round-days-grid">${daysHtml}</div>
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

function renderParticipantsTab(tournament, participants, isAdmin) {
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
                        <button type="button" class="btn btn-danger btn-small" data-action="clear-participants" data-tournament-id="${escapeHTML(tournament.id)}" ${participants.length === 0 ? "disabled" : ""}>Alle entfernen</button>
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

    const listHtml = participants.length > 0
        ? `<div class="participants-grid">${participants.map((p, index) => {
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
        }).join("")}</div>`
        : `<div class="placeholder-box"><span>Noch keine Teams für dieses Turnier eingetragen (0 / ${tournament.maxTeams}).${isAdmin ? " Nutze oben die Admin-Zuweisung, um Spieler- oder VRS-Teams hinzuzufügen." : ""}</span></div>`;

    return `${adminPanel}${listHtml}`;
}

function renderTournamentDetail(tournament) {
    const isAdmin = currentUser?.role === "admin";
    const status = getTournamentStatus(tournament);
    const badge = formatCategoryBadge(status);
    const participants = getTournamentParticipants(tournament.id);
    const matchesMap = getTournamentMatches(tournament.id);

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
        </div>
    `).join("");

    let subContent = "";
    if (activeTournamentSubTab === "bracket") {
        subContent = renderBracketTab(tournament, participants, matchesMap, isAdmin);
    } else if (activeTournamentSubTab === "r32") {
        subContent = renderRoundTab(tournament, tournament.rounds.find(r => r.id === "r32"), participants, matchesMap, isAdmin);
    } else if (activeTournamentSubTab === "r16") {
        subContent = renderRoundTab(tournament, tournament.rounds.find(r => r.id === "r16"), participants, matchesMap, isAdmin);
    } else {
        subContent = renderParticipantsTab(tournament, participants, isAdmin);
    }

    return `
        <div class="card">
            <div class="tournament-detail-topbar">
                <button type="button" class="btn btn-secondary btn-small" data-action="back-to-overview">← Zurück zur Turnierübersicht</button>
                <div class="row" style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
                    <span class="t-badge ${badge.cls}">${badge.label}</span>
                    ${statusSelectHtml}
                </div>
            </div>

            <h2>🏅 ${escapeHTML(tournament.name)}</h2>
            <p class="muted-text">${escapeHTML(tournament.formatSummary)}</p>

            <div class="tournament-info-grid">
                <div class="stat-box"><span class="stat-label">Online-Phase</span><span class="stat-value">${escapeHTML(tournament.onlineDates)}</span></div>
                <div class="stat-box"><span class="stat-label">Online-Standort</span><span class="stat-value">${escapeHTML(tournament.onlineRegion)}</span></div>
                <div class="stat-box"><span class="stat-label">Anreise bei Top 8</span><span class="stat-value">${escapeHTML(tournament.travelWindow)}</span></div>
                <div class="stat-box"><span class="stat-label">LAN Finals</span><span class="stat-value">${escapeHTML(tournament.lanDates)} · ${escapeHTML(tournament.lanLocation)}</span></div>
                <div class="stat-box"><span class="stat-label">Teilnehmer</span><span class="stat-value">${participants.length} / ${tournament.maxTeams} Teams</span></div>
            </div>

            <div class="tournament-notices">${noticesHtml}</div>

            <div class="tournament-subtabs" role="tablist">
                <button type="button" class="tournament-subtab ${activeTournamentSubTab === "bracket" ? "active" : ""}" data-action="switch-subtab" data-subtab="bracket">🌳 Turnierbaum</button>
                <button type="button" class="tournament-subtab ${activeTournamentSubTab === "r32" ? "active" : ""}" data-action="switch-subtab" data-subtab="r32">⚔️ Round of 32</button>
                <button type="button" class="tournament-subtab ${activeTournamentSubTab === "r16" ? "active" : ""}" data-action="switch-subtab" data-subtab="r16">🔥 Round of 16</button>
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
            const participants = getTournamentParticipants(t.id);
            return `
                <button type="button" class="tournament-card" data-action="open-tournament" data-tournament-id="${escapeHTML(t.id)}">
                    <div class="tournament-card-top">
                        <span class="tournament-card-title">🏅 ${escapeHTML(t.name)}</span>
                        <span class="t-badge ${badge.cls}">${badge.label}</span>
                    </div>
                    <div class="tournament-card-meta">
                        <span>📅 Online: ${escapeHTML(t.onlineDates)} (${escapeHTML(t.onlineRegion)})</span>
                        <span>✈️ LAN Finals: ${escapeHTML(t.lanDates)} (${escapeHTML(t.lanLocation)})</span>
                        <span>👥 ${participants.length} / ${t.maxTeams} Teams</span>
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
        const tournament = TOURNAMENTS_DATA.find(t => t.id === activeTournamentId);
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
            activeTournamentId = actionEl.dataset.tournamentId;
            activeTournamentSubTab = "bracket";
            renderTournamentsView();
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
        const tournament = TOURNAMENTS_DATA.find(t => t.id === tId);
        if (!tournament) return;

        const state = getTournamentsState();
        if (!state[tId]) state[tId] = { participants: [], matches: {} };
        if (!Array.isArray(state[tId].participants)) state[tId].participants = [];
        if (!state[tId].matches) state[tId].matches = {};

        if (action === "add-player-team") {
            const select = document.getElementById("tournament-player-select");
            const username = select?.value;
            if (!username || state[tId].participants.length >= tournament.maxTeams) return;
            const player = getPlayers().find(p => p.username === username);
            if (!player) return;
            const uid = `player:${player.username}`;
            if (state[tId].participants.some(p => p.uid === uid)) return;

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
            const select = document.getElementById("tournament-vrs-select");
            const uid = select?.value;
            if (!uid || !selectedVrsPickerDate || state[tId].participants.length >= tournament.maxTeams) return;
            if (state[tId].participants.some(p => p.uid === uid)) return;

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
            const entries = getVrsEntriesForDate(selectedVrsPickerDate);
            const existing = new Set(state[tId].participants.map(p => p.uid));
            for (const entry of entries) {
                if (state[tId].participants.length >= tournament.maxTeams) break;
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
            }
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "clear-participants") {
            if (!confirm("Wirklich alle zugewiesenen Teams aus diesem Turnier entfernen?")) return;
            state[tId].participants = [];
            state[tId].matches = {};
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "autofill-r32") {
            const list = state[tId].participants;
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
            saveTournamentsState(state);
            renderTournamentsView();
            return;
        }

        if (action === "clear-matches") {
            state[tId].matches = {};
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
            if (!state[tId]) state[tId] = { participants: [], matches: {} };
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

            const state = getTournamentsState();
            if (!state[tId]) state[tId] = { participants: [], matches: {} };
            if (!state[tId].matches) state[tId].matches = {};
            if (!Array.isArray(state[tId].matches[matchId])) state[tId].matches[matchId] = [null, null];

            state[tId].matches[matchId][slotIdx] = val;
            saveTournamentsState(state);
            renderTournamentsView();
        }
    });

    root.addEventListener("input", (e) => {
        if (e.target.id !== "tournament-vrs-search") return;
        vrsSearchTerm = e.target.value;
        const select = document.getElementById("tournament-vrs-select");
        if (!select || !activeTournamentId || !selectedVrsPickerDate) return;
        const existingUids = new Set(getTournamentParticipants(activeTournamentId).map(p => p.uid));
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
