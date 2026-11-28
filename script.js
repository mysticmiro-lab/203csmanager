/* === START OF FILE script.js === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import { createTournamentsModule } from "./tournaments.js";

// ==================== FIREBASE KONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCNu3vb4jwZZmN27V4xaEyRytBLOmGACnM",
    authDomain: "cs-manager-55096.firebaseapp.com",
    projectId: "cs-manager-55096",
    storageBucket: "cs-manager-55096.firebasestorage.app",
    messagingSenderId: "450551395894",
    appId: "1:450551395894:web:ad4420c057c97abc37ca97"
};

const ADMIN_UID = "URaqNww1RjM87UWtqnFOS4zEaq13";
const AUTH_EMAIL_DOMAIN = "hltvgame.local";
const DEFAULT_GAME_DATE = "2025-01-01";
const VRS_INITIAL_DATE = "2025-01-01";
const TZ_STORAGE_KEY = "hltv_game_timezone";
const ONLINE_TIMEOUT_MS = 120000;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "AdminUserCreator");
const secondaryAuth = getAuth(secondaryApp);

// ==================== ECHTZEIT-CACHE & ZUSTAND ====================
let currentUser = null;
let currentView = "tutorial";
let currentManagingTab = "emails";
let loginIntent = null;
let isSigningIn = false;

let playersCache = [];
let newsCache = [];
let messagesCache = [];
let tournamentsCache = [];
let vrsOverridesCache = {};
let globalSettings = {
    gameDate: DEFAULT_GAME_DATE,
    rankingDate: DEFAULT_GAME_DATE,
    tournamentsSeeded: false,
    newsSeeded: false
};
let currentTimezone = loadSavedTimezone();

let settingsLoaded = false;
let tournamentsLoaded = false;
let seedingTournaments = false;
let seedingNews = false;
let unsubscribers = [];
let selectedTeamUid = null;
let editingNewsId = null;

let presenceHeartbeatTimer = null;
let presenceUiTimer = null;

// Ranking-Filter & Admin-VRS-Tages-Editor Zustand
let rankingRegionFilter = "all";
let vrsEditorOpen = false;
let vrsEditorDate = "";
let vrsEditorSearch = "";
let vrsEditorWorkingEntries = [];
let vrsEditorDirty = false;

// ==================== HILFSFUNKTIONEN ====================
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
}

function loadSavedTimezone() {
    const saved = localStorage.getItem(TZ_STORAGE_KEY);
    return (saved === "europe" || saved === "americas" || saved === "asia") ? saved : "europe";
}

function usernameToAuthEmail(input) {
    const trimmed = String(input || "").trim();
    if (trimmed.includes("@")) return trimmed.toLowerCase();
    return `${trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@${AUTH_EMAIL_DOMAIN}`;
}

function generateRandomPassword(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    let pw = "";
    for (let i = 0; i < length; i++) pw += chars.charAt(array[i] % chars.length);
    return pw;
}

function getTeamName(player) {
    return String(player.teamName || player.team_name || `Team ${player.username}`).trim();
}

function isPlayerOnline(player) {
    return Boolean(player?.isOnline && player?.lastSeenAt && (Date.now() - Number(player.lastSeenAt)) < ONLINE_TIMEOUT_MS);
}

function formatLastSeen(ts) {
    if (!ts) return "Noch nie online";
    const dt = new Date(Number(ts));
    if (Number.isNaN(dt.getTime())) return "Unbekannt";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msgDayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    const diffDays = Math.round((todayStart - msgDayStart) / 86400000);
    const timeStr = dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    if (diffDays === 0) return `Heute um ${timeStr} Uhr`;
    if (diffDays === 1) return `Gestern um ${timeStr} Uhr`;
    const dateStr = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${dateStr}, ${timeStr} Uhr`;
}

function getRawStaticVrsRankingsMap() {
    if (window.HLTV_VRS_RANKINGS) return window.HLTV_VRS_RANKINGS;
    if (typeof VRS_RANKINGS !== "undefined") return VRS_RANKINGS;
    return {};
}

function isFirstMondayOfMonth(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return false;
    const dt = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return false;
    return dt.getUTCDay() === 1 && dt.getUTCDate() <= 7;
}

function isVrsReferenceDate(isoDate) {
    return isoDate === VRS_INITIAL_DATE || isFirstMondayOfMonth(isoDate);
}

function getFirstMondayOfMonth(year, month1to12) {
    const first = new Date(Date.UTC(year, month1to12 - 1, 1));
    const offset = (1 - first.getUTCDay() + 7) % 7;
    return `${year}-${String(month1to12).padStart(2, "0")}-${String(1 + offset).padStart(2, "0")}`;
}

function snapToVrsReferenceDate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "") || isoDate < "2025-01-06") {
        return VRS_INITIAL_DATE;
    }
    const [y, m] = isoDate.split("-").map(Number);
    const firstMon = getFirstMondayOfMonth(y, m);
    if (isoDate >= firstMon) return firstMon;
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    return getFirstMondayOfMonth(prevYear, prevMonth);
}

function getEditorVrsReferenceDates(vrsMap, gameDate) {
    const set = new Set(Object.keys(vrsMap).filter(isVrsReferenceDate));
    set.add(VRS_INITIAL_DATE);
    const baseEnd = gameDate && gameDate > "2025-12-31" ? gameDate : "2025-12-31";
    const endIso = addDaysISO(baseEnd, 180);
    const [endY, endM] = endIso.split("-").map(Number);
    let y = 2025, m = 1;
    while (y < endY || (y === endY && m <= endM)) {
        set.add(getFirstMondayOfMonth(y, m));
        m++;
        if (m > 12) { m = 1; y++; }
    }
    return Array.from(set).sort();
}

function getEffectiveVrsRankingsMap() {
    const raw = getRawStaticVrsRankingsMap();
    const filtered = {};
    Object.keys(raw).forEach(d => {
        if (isVrsReferenceDate(d)) filtered[d] = raw[d];
    });
    Object.keys(vrsOverridesCache).forEach(d => {
        if (isVrsReferenceDate(d)) filtered[d] = vrsOverridesCache[d];
    });
    return filtered;
}

function getBestVrsDateForGameDate(gameDate) {
    const map = getEffectiveVrsRankingsMap();
    const dates = Object.keys(map).sort();
    if (dates.length === 0) return DEFAULT_GAME_DATE;
    let best = dates[0];
    for (const d of dates) {
        if (d <= gameDate) best = d;
        else break;
    }
    return best;
}

function addDaysISO(dateStr, delta) {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "") ? dateStr : DEFAULT_GAME_DATE;
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function formatDateDE(isoDate) {
    const dt = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return isoDate;
    return dt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function translateFirebaseError(err) {
    const code = err?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        return "Falscher Benutzername/E-Mail oder falsches Passwort!";
    }
    if (code === "auth/email-already-in-use") return "Ein Auth-Konto mit diesem Benutzernamen existiert bereits in Firebase Auth.";
    if (code === "auth/weak-password") return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    if (code === "auth/too-many-requests") return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
    if (code === "permission-denied") return "Keine Berechtigung (Firestore Security Rules prüfen).";
    return err?.message || "Ein unbekannter Fehler ist aufgetreten.";
}

function isTypingInTournamentFilter() {
    const id = document.activeElement?.id || "";
    return id === "tournament-vrs-search" || id === "tournament-manual-team-name" || id === "tournament-vrs-offset-val";
}

function isTypingInVrsEditor() {
    const el = document.activeElement;
    if (!el) return false;
    return Boolean(el.closest(".vrs-editor-box"));
}

// ==================== ONLINE-PRÄSENZ ====================
async function sendPresencePing(online = true) {
    if (currentUser?.role !== "player" || !auth.currentUser || auth.currentUser.uid !== currentUser.uid) return;
    try {
        await updateDoc(doc(db, "players", currentUser.uid), {
            isOnline: Boolean(online),
            lastSeenAt: Date.now()
        });
    } catch (_) {
        // Ignorieren, falls Dokument entfernt wurde oder Tab gerade schließt
    }
}

function stopPresenceTracking() {
    if (presenceHeartbeatTimer) {
        clearInterval(presenceHeartbeatTimer);
        presenceHeartbeatTimer = null;
    }
    if (presenceUiTimer) {
        clearInterval(presenceUiTimer);
        presenceUiTimer = null;
    }
}

function startPresenceTracking() {
    stopPresenceTracking();
    if (currentUser?.role === "player") {
        sendPresencePing(true);
        presenceHeartbeatTimer = setInterval(() => {
            if (document.visibilityState !== "hidden") sendPresencePing(true);
        }, 45000);
    }
    presenceUiTimer = setInterval(() => {
        renderForumOnlineStatus();
        renderTeamDirectory();
        if (currentView === "team" && selectedTeamUid && document.activeElement?.id !== "rename-team-input") {
            openTeamDetails(selectedTeamUid, false);
        }
    }, 30000);
}

// ==================== TURNIER-MODUL EINBINDEN ====================
const tournamentsModule = createTournamentsModule({
    getCurrentUser: () => currentUser,
    getPlayers: () => playersCache,
    getTeamName,
    getVrsRankingsMap: getEffectiveVrsRankingsMap,
    getSelectedRankingDate: () => getBestVrsDateForGameDate(globalSettings.gameDate),
    getGameDate: () => globalSettings.gameDate,
    getTimezone: () => currentTimezone,
    getTournamentsCache: () => tournamentsCache,
    saveTournamentDoc: async (tObj) => {
        const clean = JSON.parse(JSON.stringify(tObj));
        await setDoc(doc(db, "tournaments", clean.id), clean);
    },
    deleteTournamentDoc: async (id) => {
        await deleteDoc(doc(db, "tournaments", id));
    },
    savePlayerResponse: async (uid, chainKey, responseObj) => {
        const safeKey = String(chainKey).replace(/[^a-zA-Z0-9_-]/g, "_");
        await updateDoc(doc(db, "players", uid), {
            [`tournamentResponses.${safeKey}`]: responseObj
        });
    },
    onOpenTournament: (tournamentId) => {
        switchView("turniere");
        tournamentsModule.openTournament(tournamentId);
    },
    onTitleChange: (title) => {
        if (currentView === "turniere") {
            const heading = document.getElementById("view-title");
            if (heading) heading.textContent = title;
        }
    }
});

// ==================== INITIALISIERUNG & AUTH ====================
document.addEventListener("DOMContentLoaded", () => {
    setupAuthEvents();
    setupAppEvents();
    setupPasswordModalEvents();
    tournamentsModule.setup();

    const tzSelect = document.getElementById("timezone-select");
    if (tzSelect) tzSelect.value = currentTimezone;

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && currentUser?.role === "player") {
            sendPresencePing(true);
        }
    });

    window.addEventListener("pagehide", () => {
        if (currentUser?.role === "player") {
            sendPresencePing(false);
        }
    });

    onAuthStateChanged(auth, async (fbUser) => {
        if (isSigningIn) return;
        if (!fbUser) {
            clearRealtimeListeners();
            resetStateOnLogout();
            showAuthScreen();
            return;
        }
        await handleAuthenticatedUser(fbUser);
    });
});

function clearRealtimeListeners() {
    unsubscribers.forEach(u => { try { u(); } catch (_) {} });
    unsubscribers = [];
}

function resetStateOnLogout() {
    stopPresenceTracking();
    currentUser = null;
    playersCache = [];
    newsCache = [];
    messagesCache = [];
    tournamentsCache = [];
    vrsOverridesCache = {};
    vrsEditorOpen = false;
    vrsEditorDirty = false;
    globalSettings = { gameDate: DEFAULT_GAME_DATE, rankingDate: DEFAULT_GAME_DATE, tournamentsSeeded: false, newsSeeded: false };
    settingsLoaded = false;
    tournamentsLoaded = false;
    selectedTeamUid = null;
    editingNewsId = null;
    tournamentsModule.resetActiveTournament();
}

function showAuthScreen(errorMsg = "") {
    document.getElementById("auth-loading")?.classList.add("hidden");
    document.getElementById("app-screen")?.classList.add("hidden");
    document.getElementById("auth-screen")?.classList.remove("hidden");
    if (errorMsg) showAuthError(errorMsg);
}

async function handleAuthenticatedUser(fbUser) {
    const isAdmin = fbUser.uid === ADMIN_UID;

    if (loginIntent === "admin" && !isAdmin) {
        loginIntent = null;
        await signOut(auth);
        showAuthScreen("Dieser Account besitzt keine Admin-Rechte.");
        return;
    }

    if (!isAdmin) {
        try {
            const pSnap = await getDoc(doc(db, "players", fbUser.uid));
            if (!pSnap.exists()) {
                loginIntent = null;
                await signOut(auth);
                showAuthScreen("Dein Spielerkonto wurde entfernt oder existiert nicht mehr.");
                return;
            }
            currentUser = { uid: fbUser.uid, username: pSnap.data().username, role: "player", email: fbUser.email };
        } catch (_) {
            loginIntent = null;
            await signOut(auth);
            showAuthScreen("Zugriff verweigert: Konto ist nicht als aktiver Spieler registriert.");
            return;
        }
    } else {
        currentUser = { uid: fbUser.uid, username: "Admin", role: "admin", email: fbUser.email };
    }

    loginIntent = null;
    document.getElementById("auth-error")?.classList.add("hidden");
    showApp();
    startRealtimeListeners();
    startPresenceTracking();
}

function startRealtimeListeners() {
    clearRealtimeListeners();
    settingsLoaded = false;
    tournamentsLoaded = false;

    unsubscribers.push(onSnapshot(doc(db, "settings", "global"), async (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const gDate = data.gameDate || data.rankingDate || DEFAULT_GAME_DATE;
            globalSettings = {
                ...globalSettings,
                ...data,
                gameDate: gDate,
                rankingDate: getBestVrsDateForGameDate(gDate)
            };
        } else if (currentUser?.role === "admin") {
            await setDoc(doc(db, "settings", "global"), {
                gameDate: DEFAULT_GAME_DATE,
                rankingDate: DEFAULT_GAME_DATE,
                tournamentsSeeded: false,
                newsSeeded: false
            }, { merge: true });
        }
        settingsLoaded = true;
        renderGameDateUI();
        if (!isTypingInVrsEditor()) renderRanking();
        if (!isTypingInTournamentFilter()) tournamentsModule.render();
        renderManagingView();
        updateManagingBadges();
        maybeSeedInitialTournaments();
    }));

    unsubscribers.push(onSnapshot(collection(db, "vrs_overrides"), (snap) => {
        const nextOverrides = {};
        snap.docs.forEach(d => {
            const data = d.data();
            const dateKey = data?.date || (/^\d{4}-\d{2}-\d{2}$/.test(d.id) ? d.id : "");
            if (dateKey && Array.isArray(data?.entries)) {
                nextOverrides[dateKey] = data.entries.map(item => [
                    String(item?.name || ""),
                    Number(item?.points) || 0,
                    String(item?.region || "")
                ]);
            }
        });
        vrsOverridesCache = nextOverrides;
        if (!isTypingInVrsEditor() && !vrsEditorDirty) renderRanking();
        if (!isTypingInTournamentFilter()) tournamentsModule.render();
        renderManagingView();
        updateManagingBadges();
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "players"), orderBy("createdAt", "asc")), async (snap) => {
        playersCache = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        if (currentUser?.role === "player" && !playersCache.some(p => p.uid === currentUser.uid)) {
            stopPresenceTracking();
            await signOut(auth);
            showAuthScreen("Dein Spielerkonto wurde vom Admin entfernt.");
            return;
        }
        renderAdminPlayerList();
        renderForumOnlineStatus();
        renderTeamDirectory();
        if (currentView === "team" && selectedTeamUid && document.activeElement?.id !== "rename-team-input") {
            openTeamDetails(selectedTeamUid, false);
        }
        if (!isTypingInVrsEditor()) renderRanking();
        if (!isTypingInTournamentFilter()) tournamentsModule.render();
        renderManagingView();
        updateManagingBadges();
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), async (snap) => {
        newsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (currentUser?.role === "admin" && newsCache.length === 0 && !globalSettings.newsSeeded && !seedingNews) {
            seedingNews = true;
            try {
                await addDoc(collection(db, "news"), {
                    title: "Neue Saison im 203 CS Manager gestartet!",
                    body: "Die Server sind online! Teams, Turniere, News, Forum und Weltranking werden live über Firebase synchronisiert.",
                    author: "Admin",
                    date: new Date().toLocaleDateString("de-DE"),
                    createdAt: Date.now()
                });
                await setDoc(doc(db, "settings", "global"), { newsSeeded: true }, { merge: true });
            } finally {
                seedingNews = false;
            }
        }
        renderNews();
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "forum_messages"), orderBy("createdAt", "asc")), (snap) => {
        messagesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderForumMessages();
    }));

    unsubscribers.push(onSnapshot(collection(db, "tournaments"), (snap) => {
        tournamentsCache = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
        tournamentsLoaded = true;
        maybeSeedInitialTournaments();
        if (!isTypingInTournamentFilter()) tournamentsModule.render();
        renderManagingView();
        updateManagingBadges();
    }));
}

async function maybeSeedInitialTournaments() {
    if (currentUser?.role !== "admin" || !settingsLoaded || !tournamentsLoaded || globalSettings.tournamentsSeeded || tournamentsCache.length > 0 || seedingTournaments) {
        return;
    }
    seedingTournaments = true;
    try {
        const list = tournamentsModule.getInitialSeedTournaments();
        if (list.length > 0) {
            const batch = writeBatch(db);
            for (const t of list) {
                const clean = JSON.parse(JSON.stringify(t));
                batch.set(doc(db, "tournaments", clean.id), clean);
            }
            batch.set(doc(db, "settings", "global"), { tournamentsSeeded: true }, { merge: true });
            await batch.commit();
        } else {
            await setDoc(doc(db, "settings", "global"), { tournamentsSeeded: true }, { merge: true });
        }
    } catch (err) {
        console.error("Fehler beim Anlegen der Start-Turniere:", err);
    } finally {
        seedingTournaments = false;
    }
}

async function setGlobalGameDate(newIso) {
    if (currentUser?.role !== "admin" || !/^\d{4}-\d{2}-\d{2}$/.test(newIso)) return;
    const bestVrs = getBestVrsDateForGameDate(newIso);
    try {
        await setDoc(doc(db, "settings", "global"), {
            gameDate: newIso,
            rankingDate: bestVrs
        }, { merge: true });
    } catch (err) {
        alert(translateFirebaseError(err));
    }
}

function renderGameDateUI() {
    const label = formatDateDE(globalSettings.gameDate);
    const topbarPill = document.getElementById("topbar-game-date");
    if (topbarPill) topbarPill.textContent = `📅 ${label}`;

    const adminDisplay = document.getElementById("admin-game-date-display");
    if (adminDisplay) adminDisplay.textContent = label;

    const adminInput = document.getElementById("admin-game-date-input");
    if (adminInput && document.activeElement !== adminInput) {
        adminInput.value = globalSettings.gameDate;
    }
}

// ==================== LOGIN-EVENTS ====================
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
            const isPlayer = tab.dataset.tab === "player";
            playerForm.classList.toggle("active", isPlayer);
            adminForm.classList.toggle("active", !isPlayer);
        });
    });

    playerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = usernameToAuthEmail(document.getElementById("player-username").value);
        const password = document.getElementById("player-password").value;
        isSigningIn = true;
        loginIntent = "player";
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            isSigningIn = false;
            await handleAuthenticatedUser(cred.user);
            playerForm.reset();
        } catch (err) {
            isSigningIn = false;
            loginIntent = null;
            showAuthError(translateFirebaseError(err));
        }
    });

    adminForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const raw = document.getElementById("admin-username").value.trim();
        const email = raw.includes("@") ? raw : usernameToAuthEmail(raw);
        const password = document.getElementById("admin-password").value;
        isSigningIn = true;
        loginIntent = "admin";
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            isSigningIn = false;
            await handleAuthenticatedUser(cred.user);
            adminForm.reset();
        } catch (err) {
            isSigningIn = false;
            loginIntent = null;
            showAuthError(translateFirebaseError(err));
        }
    });
}

function showAuthError(msg) {
    const box = document.getElementById("auth-error");
    box.textContent = msg;
    box.classList.remove("hidden");
}

async function logout() {
    closePasswordModal();
    tournamentsModule.closeEditor();
    stopPresenceTracking();
    if (currentUser?.role === "player") {
        await sendPresencePing(false);
    }
    await signOut(auth);
}

// ==================== APP-STEUERUNG & EVENTS ====================
function showApp() {
    document.getElementById("auth-loading")?.classList.add("hidden");
    document.getElementById("auth-screen")?.classList.add("hidden");
    document.getElementById("app-screen")?.classList.remove("hidden");

    document.getElementById("current-user-name").textContent = currentUser.username;
    document.getElementById("current-user-role").textContent = currentUser.role === "admin" ? "Administrator" : "Spieler";
    document.getElementById("user-avatar").textContent = currentUser.username.charAt(0);

    const isAdmin = currentUser.role === "admin";
    document.getElementById("admin-nav-li").classList.toggle("hidden", !isAdmin);
    document.getElementById("admin-news-creator").classList.toggle("hidden", !isAdmin);
    document.getElementById("btn-advance-day")?.classList.toggle("hidden", !isAdmin);

    renderGameDateUI();
    renderAdminPlayerList();
    renderForumOnlineStatus();
    renderTeamDirectory();
    renderRanking();
    renderNews();
    renderForumMessages();
    renderManagingView();
    updateManagingBadges();
    tournamentsModule.render();
    switchView("tutorial");
}

function setupAppEvents() {
    document.getElementById("logout-btn").addEventListener("click", logout);

    document.getElementById("btn-advance-day")?.addEventListener("click", () => {
        setGlobalGameDate(addDaysISO(globalSettings.gameDate, 1));
    });
    document.getElementById("admin-next-day-btn")?.addEventListener("click", () => {
        setGlobalGameDate(addDaysISO(globalSettings.gameDate, 1));
    });
    document.getElementById("admin-prev-day-btn")?.addEventListener("click", () => {
        setGlobalGameDate(addDaysISO(globalSettings.gameDate, -1));
    });
    document.getElementById("admin-set-date-btn")?.addEventListener("click", () => {
        const val = document.getElementById("admin-game-date-input")?.value;
        if (val) setGlobalGameDate(val);
    });

    document.getElementById("timezone-select")?.addEventListener("change", (e) => {
        currentTimezone = e.target.value;
        localStorage.setItem(TZ_STORAGE_KEY, currentTimezone);
        tournamentsModule.render();
    });

    document.getElementById("main-nav-list").addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-item");
        if (!btn) return;
        const view = btn.dataset.view;
        if (view === "turniere") {
            tournamentsModule.resetActiveTournament();
            tournamentsModule.render();
        }
        if (view === "team") {
            showTeamDirectory();
            return;
        }
        switchView(view);
    });

    document.getElementById("view-managing")?.addEventListener("click", (e) => {
        const tabBtn = e.target.closest("[data-managing-tab]");
        if (!tabBtn) return;
        currentManagingTab = tabBtn.dataset.managingTab;
        syncManagingTabUI();
    });

    // Ranking & Admin VRS-Tages-Editor Events
    const rankingContent = document.getElementById("ranking-content");
    rankingContent?.addEventListener("change", (e) => {
        if (e.target.id === "ranking-region-filter") {
            rankingRegionFilter = e.target.value;
            renderRanking();
            return;
        }
        if (e.target.id === "vrs-edit-date-select" && currentUser?.role === "admin") {
            loadVrsEditorForDate(e.target.value);
            renderRanking();
        }
    });

    rankingContent?.addEventListener("input", (e) => {
        if (e.target.id === "vrs-edit-search") {
            vrsEditorSearch = e.target.value;
            updateVrsEditorRowsDOM();
            return;
        }
        const idxAttr = e.target.dataset.vrsIdx;
        const field = e.target.dataset.vrsField;
        if (idxAttr !== undefined && field && currentUser?.role === "admin") {
            const idx = Number(idxAttr);
            if (!vrsEditorWorkingEntries[idx]) return;
            vrsEditorWorkingEntries[idx][field] = field === "points"
                ? Math.max(0, Number(e.target.value) || 0)
                : String(e.target.value);
            vrsEditorDirty = true;
            document.getElementById("vrs-editor-dirty-tag")?.classList.remove("hidden");
        }
    });

    rankingContent?.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        if (btn.id === "toggle-vrs-editor-btn" && currentUser?.role === "admin") {
            vrsEditorOpen = !vrsEditorOpen;
            if (vrsEditorOpen) {
                const targetDate = vrsEditorDate || getBestVrsDateForGameDate(globalSettings.gameDate);
                loadVrsEditorForDate(targetDate);
            }
            renderRanking();
            return;
        }

        if (currentUser?.role !== "admin") return;

        if (btn.id === "vrs-edit-load-custom-btn") {
            const val = document.getElementById("vrs-edit-custom-date")?.value;
            if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const refDate = snapToVrsReferenceDate(val);
                if (refDate !== val) {
                    alert(`Hinweis: VRS-Listen gelten jeweils ab 01.01.2025 bzw. ab dem 1. Montag jedes Monats. Für den ${formatDateDE(val)} ist der Bezugstag ${formatDateDE(refDate)} zuständig – dieser wurde geladen.`);
                }
                loadVrsEditorForDate(refDate);
                renderRanking();
            }
            return;
        }

        if (btn.id === "vrs-add-team-btn") {
            const nameEl = document.getElementById("vrs-add-name");
            const ptsEl = document.getElementById("vrs-add-points");
            const regEl = document.getElementById("vrs-add-region");
            const name = nameEl?.value.trim();
            if (!name) return;
            const points = Math.max(0, Number(ptsEl?.value) || 0);
            const region = regEl?.value.trim() || "Europe";
            vrsEditorWorkingEntries.push({ name, points, region });
            vrsEditorWorkingEntries.sort((a, b) => b.points - a.points);
            vrsEditorDirty = true;
            renderRanking();
            return;
        }

        if (btn.dataset.vrsDelIdx !== undefined) {
            const idx = Number(btn.dataset.vrsDelIdx);
            if (idx >= 0 && idx < vrsEditorWorkingEntries.length) {
                vrsEditorWorkingEntries.splice(idx, 1);
                vrsEditorDirty = true;
                renderRanking();
            }
            return;
        }

        if (btn.id === "vrs-edit-save-btn") {
            if (!vrsEditorDate) return;
            btn.disabled = true;
            try {
                const cleaned = vrsEditorWorkingEntries
                    .map(it => ({
                        name: String(it.name || "").trim(),
                        points: Math.max(0, Number(it.points) || 0),
                        region: String(it.region || "").trim()
                    }))
                    .filter(it => it.name.length > 0)
                    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));

                await setDoc(doc(db, "vrs_overrides", vrsEditorDate), {
                    date: vrsEditorDate,
                    entries: cleaned,
                    updatedAt: Date.now()
                });
                vrsEditorWorkingEntries = cleaned;
                vrsEditorDirty = false;
                renderRanking();
            } catch (err) {
                alert(translateFirebaseError(err));
            } finally {
                btn.disabled = false;
            }
            return;
        }

        if (btn.id === "vrs-edit-reset-btn") {
            if (!vrsEditorDate || !confirm(`Bearbeiteten VRS-Stand für ${formatDateDE(vrsEditorDate)} wirklich auf Originaldaten zurücksetzen?`)) return;
            btn.disabled = true;
            try {
                await deleteDoc(doc(db, "vrs_overrides", vrsEditorDate));
                delete vrsOverridesCache[vrsEditorDate];
                loadVrsEditorForDate(vrsEditorDate);
                renderRanking();
            } catch (err) {
                alert(translateFirebaseError(err));
            } finally {
                btn.disabled = false;
            }
        }
    });

    document.getElementById("add-player-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentUser?.role !== "admin") return;

        const input = document.getElementById("new-player-username");
        const submitBtn = document.getElementById("add-player-btn");
        const newName = input.value.trim();
        const feedback = document.getElementById("admin-feedback");
        if (!newName) return;

        const authEmail = usernameToAuthEmail(newName);
        if (newName.toLowerCase() === "admin" || playersCache.some(p => p.username.toLowerCase() === newName.toLowerCase() || p.authEmail === authEmail)) {
            feedback.textContent = `Der Benutzername "${newName}" existiert bereits!`;
            feedback.className = "feedback-msg error";
            feedback.classList.remove("hidden");
            return;
        }

        const pw = generateRandomPassword(8);
        submitBtn.disabled = true;
        try {
            const cred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, pw);
            const uid = cred.user.uid;
            await signOut(secondaryAuth);

            await setDoc(doc(db, "players", uid), {
                username: newName,
                authEmail,
                teamName: `Team ${newName}`,
                points: 0,
                budget: 10000,
                status: "Aktiv",
                roster: [],
                tournamentResponses: {},
                isOnline: false,
                lastSeenAt: null,
                createdAt: Date.now()
            });

            input.value = "";
            feedback.innerHTML = `Spieler <strong>${escapeHTML(newName)}</strong> erstellt!<br>Start-Passwort (nur jetzt sichtbar, bitte kopieren): <code class="password-pill">${escapeHTML(pw)}</code> <button type="button" class="btn btn-secondary btn-small" id="copy-new-pw-btn" data-pw="${escapeHTML(pw)}">Kopieren</button>`;
            feedback.className = "feedback-msg success";
            feedback.classList.remove("hidden");
            document.getElementById("copy-new-pw-btn")?.addEventListener("click", (ev) => {
                navigator.clipboard?.writeText(ev.target.dataset.pw).then(() => { ev.target.textContent = "Kopiert!"; });
            });
        } catch (err) {
            feedback.textContent = translateFirebaseError(err);
            feedback.className = "feedback-msg error";
            feedback.classList.remove("hidden");
        } finally {
            submitBtn.disabled = false;
        }
    });

    document.getElementById("admin-player-list").addEventListener("click", async (e) => {
        if (currentUser?.role !== "admin") return;

        const saveBtn = e.target.closest("[data-action='save-player-points']");
        if (saveBtn) {
            const uid = saveBtn.dataset.uid;
            const ptsInput = saveBtn.closest(".admin-list-item")?.querySelector("[data-role='player-points-input']");
            const pts = Math.max(0, Number(ptsInput?.value) || 0);
            saveBtn.disabled = true;
            try {
                await updateDoc(doc(db, "players", uid), { points: pts });
                saveBtn.textContent = "Gespeichert ✓";
                setTimeout(() => { saveBtn.textContent = "Punkte speichern"; }, 1200);
            } catch (err) {
                alert(translateFirebaseError(err));
            } finally {
                saveBtn.disabled = false;
            }
            return;
        }

        const remBtn = e.target.closest("[data-action='remove-player']");
        if (remBtn) {
            const { uid, username } = remBtn.dataset;
            if (!confirm(`Spieler „${username}“ wirklich entfernen? (Hinweis: Falls der Name neu vergeben werden soll, auch unter Firebase Console → Authentication → Users löschen.)`)) return;
            try { await deleteDoc(doc(db, "players", uid)); }
            catch (err) { alert(translateFirebaseError(err)); }
        }
    });

    document.getElementById("chat-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("chat-input");
        const text = input.value.trim();
        if (!text || !currentUser) return;
        input.disabled = true;
        try {
            const now = new Date();
            await addDoc(collection(db, "forum_messages"), {
                uid: currentUser.uid,
                author: currentUser.username,
                role: currentUser.role,
                text,
                date: now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
                time: now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
                createdAt: Date.now()
            });
            input.value = "";
            if (currentUser.role === "player") sendPresencePing(true);
        } catch (err) {
            alert(translateFirebaseError(err));
        } finally {
            input.disabled = false;
            input.focus();
        }
    });

    document.getElementById("chat-messages").addEventListener("click", async (e) => {
        const del = e.target.closest("[data-action='delete-msg']");
        if (!del || currentUser?.role !== "admin") return;
        try { await deleteDoc(doc(db, "forum_messages", del.dataset.id)); }
        catch (err) { alert(translateFirebaseError(err)); }
    });

    document.getElementById("news-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentUser?.role !== "admin") return;
        const title = document.getElementById("news-title-input").value.trim();
        const body = document.getElementById("news-body-input").value.trim();
        if (!title || !body) return;
        try {
            if (editingNewsId) {
                await updateDoc(doc(db, "news", editingNewsId), { title, body, date: formatDateDE(globalSettings.gameDate), author: currentUser.username });
                resetNewsEditor();
            } else {
                await addDoc(collection(db, "news"), { title, body, author: currentUser.username, date: formatDateDE(globalSettings.gameDate), createdAt: Date.now() });
                document.getElementById("news-form").reset();
            }
        } catch (err) { alert(translateFirebaseError(err)); }
    });

    document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);

    document.getElementById("news-feed")?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-news-action]");
        if (!btn || currentUser?.role !== "admin") return;
        const id = btn.dataset.newsId;
        const article = newsCache.find(n => n.id === id);
        if (!article) return;

        if (btn.dataset.newsAction === "edit") {
            editingNewsId = id;
            document.getElementById("news-title-input").value = article.title || "";
            document.getElementById("news-body-input").value = article.body || "";
            document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten";
            document.getElementById("news-submit-btn").textContent = "Änderungen speichern";
            document.getElementById("news-cancel-edit-btn").classList.remove("hidden");
            document.getElementById("admin-news-creator").scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (btn.dataset.newsAction === "delete" && confirm(`News „${article.title}“ löschen?`)) {
            try { await deleteDoc(doc(db, "news", id)); }
            catch (err) { alert(translateFirebaseError(err)); }
        }
    });

    document.getElementById("team-directory-list")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-team-open]");
        if (btn) openTeamDetails(btn.dataset.teamOpen);
    });

    document.getElementById("view-team")?.addEventListener("click", (e) => {
        if (e.target.closest("[data-team-back]")) showTeamDirectory();
    });

    document.getElementById("view-team")?.addEventListener("submit", async (e) => {
        if (!e.target.matches("#rename-team-form")) return;
        e.preventDefault();
        if (currentUser?.role !== "player" || selectedTeamUid !== currentUser.uid) return;

        const newName = document.getElementById("rename-team-input").value.trim().slice(0, 40);
        const fb = document.getElementById("team-rename-feedback");
        if (!newName) {
            if (fb) { fb.textContent = "Bitte gib einen Teamnamen ein."; fb.className = "rename-team-feedback error"; }
            return;
        }
        try {
            await updateDoc(doc(db, "players", currentUser.uid), { teamName: newName });
            const savedFb = document.getElementById("team-rename-feedback");
            if (savedFb) { savedFb.textContent = "Teamname erfolgreich gespeichert."; savedFb.className = "rename-team-feedback success"; }
        } catch (err) {
            if (fb) { fb.textContent = translateFirebaseError(err); fb.className = "rename-team-feedback error"; }
        }
    });
}

// ==================== PASSWORT ÄNDERN ====================
function setupPasswordModalEvents() {
    const modal = document.getElementById("password-modal");
    const form = document.getElementById("change-password-form");

    document.getElementById("open-password-modal-btn")?.addEventListener("click", () => {
        form?.reset();
        document.getElementById("password-feedback")?.classList.add("hidden");
        modal?.classList.remove("hidden");
    });
    document.getElementById("close-password-modal")?.addEventListener("click", closePasswordModal);
    document.getElementById("cancel-password-modal")?.addEventListener("click", closePasswordModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) closePasswordModal(); });

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        const oldPw = document.getElementById("old-password").value;
        const newPw = document.getElementById("new-password").value;
        const confirmPw = document.getElementById("confirm-password").value;

        if (newPw.length < 6) return showPasswordFeedback("Mindestens 6 Zeichen erforderlich.", "error");
        if (newPw !== confirmPw) return showPasswordFeedback("Passwörter stimmen nicht überein.", "error");

        try {
            const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPw);
            await reauthenticateWithCredential(auth.currentUser, cred);
            await updatePassword(auth.currentUser, newPw);
            form.reset();
            showPasswordFeedback("Passwort erfolgreich geändert!", "success");
            setTimeout(() => { if (!modal.classList.contains("hidden")) closePasswordModal(); }, 1200);
        } catch (err) {
            showPasswordFeedback(translateFirebaseError(err), "error");
        }
    });
}

function showPasswordFeedback(msg, type) {
    const fb = document.getElementById("password-feedback");
    if (!fb) return;
    fb.textContent = msg;
    fb.className = `feedback-msg ${type}`;
    fb.classList.remove("hidden");
}

function closePasswordModal() {
    document.getElementById("password-modal")?.classList.add("hidden");
    document.getElementById("change-password-form")?.reset();
    document.getElementById("password-feedback")?.classList.add("hidden");
}

// ==================== ANSICHTEN & RENDERING ====================
const VIEW_TITLES = {
    "tutorial": "Tutorial",
    "news": "HLTV - News",
    "forum": "HLTV - Forum",
    "managing": "Managing",
    "transfermarkt": "Transfermarkt",
    "pack-opening": "Pack Opening",
    "turniere": "Turniere",
    "team": "Meine Teams",
    "ranking": "Ranking",
    "admin-panel": "Admin-Panel"
};

function switchView(viewName) {
    currentView = viewName;
    if (viewName !== "team") selectedTeamUid = null;

    document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

    document.getElementById(`view-${viewName}`)?.classList.add("active");
    document.querySelector(`#main-nav-list .nav-item[data-view="${viewName}"]`)?.classList.add("active");
    document.getElementById("view-title").textContent = VIEW_TITLES[viewName] || "Übersicht";

    if (viewName === "forum") {
        renderForumOnlineStatus();
        scrollChatToBottom();
    }
    if (viewName === "turniere") tournamentsModule.render();
    if (viewName === "managing") {
        syncManagingTabUI();
        renderManagingView();
    }
    if (viewName === "ranking") renderRanking();
}

function syncManagingTabUI() {
    document.querySelectorAll("[data-managing-tab]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.managingTab === currentManagingTab);
    });
    document.getElementById("managing-emails-panel")?.classList.toggle("hidden", currentManagingTab !== "emails");
    document.getElementById("managing-tactics-panel")?.classList.toggle("hidden", currentManagingTab !== "tactics");
}

function renderManagingView() {
    const root = document.getElementById("managing-emails-root");
    if (root && typeof tournamentsModule.renderManagingEmails === "function") {
        tournamentsModule.renderManagingEmails(root);
    }
}

function updateManagingBadges() {
    const count = typeof tournamentsModule.getPendingInviteCountForCurrentUser === "function"
        ? tournamentsModule.getPendingInviteCountForCurrentUser()
        : 0;

    const sideBadge = document.getElementById("managing-unread-badge");
    const tabBadge = document.getElementById("managing-tab-email-badge");
    [sideBadge, tabBadge].forEach(el => {
        if (!el) return;
        if (count > 0) {
            el.textContent = String(count);
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    });
}

function renderForumOnlineStatus() {
    const badge = document.getElementById("forum-online-badge");
    const textEl = document.getElementById("forum-online-text");
    if (!badge || !textEl) return;
    const total = playersCache.length;
    const online = playersCache.filter(isPlayerOnline).length;
    textEl.textContent = `${online} von ${total} ${total === 1 ? "Spieler" : "Spielern"} online`;
    badge.classList.toggle("none", online === 0);
}

function renderTeamDirectory() {
    const list = document.getElementById("team-directory-list");
    if (!list) return;
    list.replaceChildren();
    if (!playersCache.length) {
        const empty = document.createElement("li");
        empty.className = "empty-team-hint";
        empty.textContent = "Noch keine Teams vorhanden.";
        list.append(empty);
        return;
    }
    playersCache.forEach(team => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "team-directory-item";
        btn.dataset.teamOpen = team.uid;
        const online = isPlayerOnline(team);
        const statusShort = online
            ? "🟢 Gerade online"
            : `⚫ ${team.lastSeenAt ? `Zuletzt: ${formatLastSeen(team.lastSeenAt)}` : "Noch nie online"}`;
        btn.innerHTML = `<span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(getTeamName(team))}</strong><small>Manager: ${escapeHTML(team.username)} · ${escapeHTML(statusShort)}</small></span><span class="team-directory-arrow">›</span>`;
        li.append(btn);
        list.append(li);
    });
}

function showTeamDirectory() {
    selectedTeamUid = null;
    switchView("team");
    document.getElementById("team-details")?.classList.add("hidden");
    document.getElementById("team-directory")?.classList.remove("hidden");
    renderTeamDirectory();
}

function openTeamDetails(uid, switchTab = true) {
    const team = playersCache.find(p => p.uid === uid);
    if (!team) { if (switchTab) showTeamDirectory(); return; }
    selectedTeamUid = uid;
    if (switchTab) switchView("team");

    const name = getTeamName(team);
    document.getElementById("view-title").textContent = name;
    document.getElementById("team-directory")?.classList.add("hidden");
    document.getElementById("team-details")?.classList.remove("hidden");
    document.getElementById("team-view-name").textContent = name;
    document.getElementById("team-view-owner").textContent = `Spielerteam · Manager: ${team.username}`;

    const online = isPlayerOnline(team);
    const presenceText = online
        ? "🟢 Gerade online"
        : (team.lastSeenAt ? `⚫ Zuletzt online: ${formatLastSeen(team.lastSeenAt)}` : "⚫ Noch nie angemeldet");
    const presencePill = document.getElementById("team-player-presence");
    if (presencePill) {
        presencePill.textContent = presenceText;
        presencePill.className = `presence-pill ${online ? "online" : "offline"}`;
    }

    const statPresence = document.getElementById("team-stat-presence");
    if (statPresence) {
        statPresence.textContent = online ? "🟢 Gerade online" : formatLastSeen(team.lastSeenAt);
    }

    const roster = Array.isArray(team.roster) ? team.roster : [];
    document.getElementById("team-stat-status").textContent = team.status || "Aktiv";
    document.getElementById("team-stat-squad").textContent = `${roster.length} / 5 Spieler`;
    document.getElementById("team-stat-budget").textContent = `${(Number(team.budget) || 10000).toLocaleString("de-DE")} $`;
    document.getElementById("team-stat-points").textContent = (Number(team.points) || 0).toLocaleString("de-DE");

    const rosterPanel = document.getElementById("team-roster-panel");
    if (rosterPanel) {
        rosterPanel.innerHTML = roster.length
            ? `<strong>Kader von ${escapeHTML(name)}</strong><ul class="team-roster-list">${roster.map(p => `<li>${escapeHTML(typeof p === "string" ? p : (p.name || p.username || "Spieler"))}</li>`).join("")}</ul>`
            : `Noch keine Spieler im Kader von <strong>${escapeHTML(name)}</strong> eingetragen.`;
    }

    const actions = document.getElementById("team-manager-actions");
    if (!actions) return;
    actions.replaceChildren();
    if (currentUser?.role === "player" && currentUser.uid === team.uid) {
        const form = document.createElement("form");
        form.id = "rename-team-form";
        form.className = "rename-team-form";
        form.innerHTML = `<label for="rename-team-input">Dein Team umbenennen</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(name)}"><button type="submit" class="btn btn-primary btn-small">Speichern</button></div><p id="team-rename-feedback" class="rename-team-feedback" aria-live="polite"></p>`;
        actions.append(form);
    }
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn btn-secondary btn-small";
    back.dataset.teamBack = "true";
    back.textContent = "← Alle Teams";
    actions.append(back);
}

// ==================== RANKING & ADMIN VRS-TAGES-EDITOR ====================
function loadVrsEditorForDate(dateISO) {
    const refDate = snapToVrsReferenceDate(dateISO);
    const vrsMap = getEffectiveVrsRankingsMap();
    vrsEditorDate = refDate;
    const rawList = vrsMap[refDate] || vrsMap[getBestVrsDateForGameDate(refDate)] || [];
    vrsEditorWorkingEntries = rawList.map(([name, pts, region]) => ({
        name: String(name || ""),
        points: Number(pts) || 0,
        region: String(region || "")
    }));
    vrsEditorDirty = false;
}

function buildVrsEditorRowsHTML() {
    const q = vrsEditorSearch.trim().toLowerCase();
    const rows = [];
    vrsEditorWorkingEntries.forEach((item, idx) => {
        if (q && !item.name.toLowerCase().includes(q) && !item.region.toLowerCase().includes(q)) return;
        rows.push(`
            <tr>
                <td style="width:46px; color:var(--text-muted);">#${idx + 1}</td>
                <td><input type="text" class="vrs-editor-input" data-vrs-idx="${idx}" data-vrs-field="name" value="${escapeHTML(item.name)}"></td>
                <td style="width:110px;"><input type="number" class="vrs-editor-input" data-vrs-idx="${idx}" data-vrs-field="points" min="0" value="${Number(item.points) || 0}"></td>
                <td style="width:180px;"><input type="text" class="vrs-editor-input" list="vrs-region-datalist" data-vrs-idx="${idx}" data-vrs-field="region" value="${escapeHTML(item.region)}" placeholder="z. B. Europe"></td>
                <td style="width:70px; text-align:right;"><button type="button" class="btn btn-danger btn-small" data-vrs-del-idx="${idx}" title="Entfernen">🗑️</button></td>
            </tr>
        `);
    });
    return rows.length
        ? rows.join("")
        : `<tr><td colspan="5" class="empty-team-hint">Keine passenden Teams für diesen Filter gefunden.</td></tr>`;
}

function updateVrsEditorRowsDOM() {
    const tbody = document.getElementById("vrs-editor-tbody");
    if (tbody) tbody.innerHTML = buildVrsEditorRowsHTML();
}

function getRegionBadgeClass(region) {
    const r = String(region || "");
    if (!r) return "";
    if (r.includes("Europe") && !r.includes("Americas") && !r.includes("Asia")) return "eu";
    if (r.includes("Americas") && !r.includes("Europe")) return "am";
    if (r.includes("Asia") && !r.includes("Americas")) return "as";
    if (r.includes("Europe")) return "eu";
    return "am";
}

function renderRanking() {
    const target = document.getElementById("ranking-content");
    if (!target) return;
    const vrsMap = getEffectiveVrsRankingsMap();
    const date = getBestVrsDateForGameDate(globalSettings.gameDate);
    const admin = currentUser?.role === "admin";

    const playerTeams = playersCache.map(t => ({
        name: getTeamName(t),
        manager: t.username,
        points: Number(t.points) || 0,
        region: String(t.region || ""),
        official: false
    }));
    const officialTeams = (vrsMap[date] || []).map(([name, pts, region]) => ({
        name: String(name),
        manager: "HLTV / VRS",
        points: Number(pts) || 0,
        region: String(region || ""),
        official: true
    }));

    let all = [...playerTeams, ...officialTeams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));
    if (rankingRegionFilter !== "all") {
        all = all.filter(t => t.region.includes(rankingRegionFilter));
    }

    const isDayEdited = Object.hasOwn(vrsOverridesCache, date);
    let editorHtml = "";
    if (admin && vrsEditorOpen) {
        if (!vrsEditorDate) loadVrsEditorForDate(date);
        const allDates = getEditorVrsReferenceDates(vrsMap, globalSettings.gameDate);
        if (vrsEditorDate && !allDates.includes(vrsEditorDate)) allDates.push(vrsEditorDate);
        allDates.sort();
        const dateOpts = allDates.map(d => {
            const isEdited = Object.hasOwn(vrsOverridesCache, d);
            const isPresent = Object.hasOwn(vrsMap, d);
            const suffix = isEdited ? " (bearbeitet)" : (!isPresent ? " (neu anlegen)" : "");
            return `<option value="${escapeHTML(d)}" ${d === vrsEditorDate ? "selected" : ""}>${escapeHTML(d)}${suffix}</option>`;
        }).join("");
        const hasOverride = Object.hasOwn(vrsOverridesCache, vrsEditorDate);

        editorHtml = `
            <div class="vrs-editor-box">
                <div class="tournament-card-top">
                    <h3>🛠️ VRS-Bezugstag bearbeiten: ${escapeHTML(formatDateDE(vrsEditorDate))} <span id="vrs-editor-dirty-tag" class="t-badge t-badge-prize ${vrsEditorDirty ? "" : "hidden"}">Ungespeicherte Änderungen</span></h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        ${hasOverride ? `<button type="button" id="vrs-edit-reset-btn" class="btn btn-danger btn-small">↩️ Original wiederherstellen</button>` : ""}
                        <button type="button" id="vrs-edit-save-btn" class="btn btn-primary btn-small">💾 VRS-Stand in Firebase speichern</button>
                    </div>
                </div>
                <p class="vrs-editor-hint">Bezugstage sind der <strong>01.01.2025</strong> (bis 05.01.) sowie jeder <strong>1. Montag im Monat</strong>. Änderungen an einem Bezugstag gelten automatisch für alle Folgetage bis zum nächsten Bezugstag.</p>
                <div class="vrs-editor-controls">
                    <label for="vrs-edit-date-select" style="font-size:.82rem; color:var(--text-muted);">Bezugstag:</label>
                    <select id="vrs-edit-date-select">${dateOpts}</select>
                    <input type="date" id="vrs-edit-custom-date" value="${escapeHTML(vrsEditorDate)}">
                    <button type="button" id="vrs-edit-load-custom-btn" class="btn btn-secondary btn-small">Bezugstag laden</button>
                    <input type="text" id="vrs-edit-search" placeholder="Team oder Region suchen..." value="${escapeHTML(vrsEditorSearch)}" style="min-width:190px; flex:1;">
                </div>
                <div class="vrs-editor-add-row">
                    <input type="text" id="vrs-add-name" placeholder="Neuer Teamname..." style="flex:1; min-width:150px;">
                    <input type="number" id="vrs-add-points" placeholder="Punkte" min="0" value="1000" style="width:110px;">
                    <input type="text" id="vrs-add-region" list="vrs-region-datalist" placeholder="Region (z. B. Europe)" value="Europe" style="width:170px;">
                    <button type="button" id="vrs-add-team-btn" class="btn btn-accent btn-small">+ Team hinzufügen</button>
                </div>
                <datalist id="vrs-region-datalist">
                    <option value="Europe"></option>
                    <option value="Americas"></option>
                    <option value="Asia"></option>
                    <option value="Europe / Americas"></option>
                    <option value="Americas / Asia"></option>
                </datalist>
                <div class="vrs-editor-table-wrap">
                    <table class="vrs-editor-table">
                        <thead><tr><th>#</th><th>Teamname</th><th>Punkte</th><th>Region</th><th></th></tr></thead>
                        <tbody id="vrs-editor-tbody">${buildVrsEditorRowsHTML()}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    target.innerHTML = `
        <div class="ranking-toolbar">
            <div class="ranking-filter-group">
                <label for="ranking-region-filter" style="font-size:.84rem; color:var(--text-muted);">Region:</label>
                <select id="ranking-region-filter">
                    <option value="all" ${rankingRegionFilter === "all" ? "selected" : ""}>🌍 Global (Alle Regionen)</option>
                    <option value="Europe" ${rankingRegionFilter === "Europe" ? "selected" : ""}>🇪🇺 Europe</option>
                    <option value="Americas" ${rankingRegionFilter === "Americas" ? "selected" : ""}>🌎 Americas</option>
                    <option value="Asia" ${rankingRegionFilter === "Asia" ? "selected" : ""}>🌏 Asia</option>
                </select>
                ${isDayEdited ? `<span class="t-badge t-badge-prize">✏️ VRS-Stand manuell angepasst</span>` : ""}
            </div>
            ${admin ? `<button type="button" id="toggle-vrs-editor-btn" class="btn btn-accent btn-small">${vrsEditorOpen ? "✖ VRS-Editor schließen" : "🛠️ VRS-Ranking bearbeiten"}</button>` : ""}
        </div>
        ${editorHtml}
        <div class="ranking-table-wrap">
            <table class="ranking-table">
                <thead><tr><th>Platz</th><th>Team</th><th>Region</th><th>Art</th><th>Manager / Quelle</th><th>Punkte</th></tr></thead>
                <tbody>${all.map((t, i) => `<tr><td>${i + 1}</td><td>${t.official ? "🏆" : "🛡️"} ${escapeHTML(t.name)}</td><td>${t.region ? `<span class="region-badge ${getRegionBadgeClass(t.region)}">${escapeHTML(t.region)}</span>` : "–"}</td><td>${t.official ? "HLTV-Team" : "Spielerteam"}</td><td>${escapeHTML(t.manager)}</td><td><strong>${t.points.toLocaleString("de-DE")}</strong></td></tr>`).join("")}</tbody>
            </table>
        </div>
        <p class="ranking-note">🏆 = offizielles HLTV-/VRS-Team · 🛡️ = Spielerteam · Spieldatum: ${escapeHTML(formatDateDE(globalSettings.gameDate))} (aktiver VRS-Bezugstag: ${escapeHTML(formatDateDE(date))}).</p>
    `;
}

function renderAdminPlayerList() {
    const list = document.getElementById("admin-player-list");
    const countSpan = document.getElementById("player-count");
    if (!list || !countSpan) return;
    countSpan.textContent = playersCache.length;

    if (!playersCache.length) {
        list.innerHTML = `<li class="empty-team-hint">Noch keine Spieler angelegt.</li>`;
        return;
    }

    list.innerHTML = playersCache.map(p => `
        <li class="admin-list-item">
            <div class="admin-player-info">
                <strong>${escapeHTML(p.username)}</strong>
                <span>(${escapeHTML(getTeamName(p))})</span>
                <span class="password-changed-tag">${isPlayerOnline(p) ? "🟢 Online" : "🔒 Auth aktiv"}</span>
            </div>
            <div class="admin-actions">
                <input type="number" class="inline-points-input" data-role="player-points-input" min="0" value="${Number(p.points) || 0}" title="VRS-Punkte">
                <button class="btn btn-secondary btn-small" data-action="save-player-points" data-uid="${escapeHTML(p.uid)}">Punkte speichern</button>
                <button class="btn btn-danger" data-action="remove-player" data-uid="${escapeHTML(p.uid)}" data-username="${escapeHTML(p.username)}">Entfernen</button>
            </div>
        </li>
    `).join("");
}

function renderForumMessages() {
    const container = document.getElementById("chat-messages");
    if (!container) return;
    if (!messagesCache.length) {
        container.innerHTML = `<div class="empty-team-hint" style="text-align:center; margin-top:20px;">Noch keine Nachrichten im Forum.</div>`;
        return;
    }
    const admin = currentUser?.role === "admin";
    container.innerHTML = messagesCache.map(m => {
        const isOwn = currentUser && m.uid === currentUser.uid;
        const msgDate = m.date || (m.createdAt ? new Date(m.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
        const timeStr = msgDate ? `${msgDate} · ${m.time || ""}` : (m.time || "");
        return `
            <div class="chat-msg ${isOwn ? "own-msg" : ""}">
                <div class="chat-msg-header">
                    <span class="chat-author ${m.role === "admin" ? "admin-badge" : ""}">${escapeHTML(m.author)}${m.role === "admin" ? " [ADMIN]" : ""}</span>
                    <span class="chat-time">${escapeHTML(timeStr)}</span>
                    ${admin ? `<button type="button" class="btn btn-danger btn-small" style="margin-left:auto; padding:1px 6px;" data-action="delete-msg" data-id="${escapeHTML(m.id)}">×</button>` : ""}
                </div>
                <div class="chat-text">${escapeHTML(m.text)}</div>
            </div>
        `;
    }).join("");
    scrollChatToBottom();
}

function scrollChatToBottom() {
    const c = document.getElementById("chat-messages");
    if (c) c.scrollTop = c.scrollHeight;
}

function renderNews() {
    const feed = document.getElementById("news-feed");
    if (!feed) return;
    const admin = currentUser?.role === "admin";
    feed.innerHTML = newsCache.map(a => `
        <article class="news-item">
            <div class="news-meta">Veröffentlicht am ${escapeHTML(a.date)} von ${escapeHTML(a.author)}</div>
            <h3>${escapeHTML(a.title)}</h3>
            <p>${escapeHTML(a.body)}</p>
            ${admin ? `<div class="news-admin-actions"><button class="btn btn-secondary btn-small" type="button" data-news-action="edit" data-news-id="${escapeHTML(a.id)}">Bearbeiten</button><button class="btn btn-danger btn-small" type="button" data-news-action="delete" data-news-id="${escapeHTML(a.id)}">Löschen</button></div>` : ""}
        </article>
    `).join("");
}

function resetNewsEditor() {
    editingNewsId = null;
    document.getElementById("news-form")?.reset();
    const h = document.getElementById("news-form-heading");
    const s = document.getElementById("news-submit-btn");
    if (h) h.textContent = "Neue HLTV-News veröffentlichen (Admin)";
    if (s) s.textContent = "News posten";
    document.getElementById("news-cancel-edit-btn")?.classList.add("hidden");
}
/* === END OF FILE script.js === */
