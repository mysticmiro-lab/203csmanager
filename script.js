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
const TZ_STORAGE_KEY = "hltv_game_timezone";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "AdminUserCreator");
const secondaryAuth = getAuth(secondaryApp);

// ==================== ECHTZEIT-CACHE & ZUSTAND ====================
let currentUser = null;
let currentView = "tutorial";
let loginIntent = null;
let isSigningIn = false;

let playersCache = [];
let newsCache = [];
let messagesCache = [];
let tournamentsCache = [];
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

function getVrsRankingsMap() {
    if (window.HLTV_VRS_RANKINGS) return window.HLTV_VRS_RANKINGS;
    if (typeof VRS_RANKINGS !== "undefined") return VRS_RANKINGS;
    return {};
}

function getBestVrsDateForGameDate(gameDate) {
    const map = getVrsRankingsMap();
    if (Object.hasOwn(map, gameDate)) return gameDate;
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

// ==================== TURNIER-MODUL EINBINDEN ====================
const tournamentsModule = createTournamentsModule({
    getCurrentUser: () => currentUser,
    getPlayers: () => playersCache,
    getTeamName,
    getVrsRankingsMap,
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
    currentUser = null;
    playersCache = [];
    newsCache = [];
    messagesCache = [];
    tournamentsCache = [];
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
        renderRanking();
        tournamentsModule.render();
        maybeSeedInitialTournaments();
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "players"), orderBy("createdAt", "asc")), async (snap) => {
        playersCache = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        if (currentUser?.role === "player" && !playersCache.some(p => p.uid === currentUser.uid)) {
            await signOut(auth);
            showAuthScreen("Dein Spielerkonto wurde vom Admin entfernt.");
            return;
        }
        renderAdminPlayerList();
        renderTeamDirectory();
        if (currentView === "team" && selectedTeamUid && document.activeElement?.id !== "rename-team-input") {
            openTeamDetails(selectedTeamUid, false);
        }
        renderRanking();
        if (document.activeElement?.id !== "tournament-vrs-search") tournamentsModule.render();
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), async (snap) => {
        newsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (currentUser?.role === "admin" && newsCache.length === 0 && !globalSettings.newsSeeded && !seedingNews) {
            seedingNews = true;
            try {
                await addDoc(collection(db, "news"), {
                    title: "Neue Saison im HLTV Manager gestartet!",
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
        if (document.activeElement?.id !== "tournament-vrs-search") tournamentsModule.render();
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
    renderTeamDirectory();
    renderRanking();
    renderNews();
    renderForumMessages();
    tournamentsModule.render();
    switchView("tutorial");
}

function setupAppEvents() {
    document.getElementById("logout-btn").addEventListener("click", logout);

    // Globaler +1 Tag Button in Topbar & Kontrollen im Admin-Panel
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

    // Zeitzonen-Umschalter (für alle Spieler)
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

    // Admin: Neuen Spieler erstellen
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

    // Admin Spielerliste
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

    // Forum-Chat
    document.getElementById("chat-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("chat-input");
        const text = input.value.trim();
        if (!text || !currentUser) return;
        input.disabled = true;
        try {
            await addDoc(collection(db, "forum_messages"), {
                uid: currentUser.uid,
                author: currentUser.username,
                role: currentUser.role,
                text,
                time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
                createdAt: Date.now()
            });
            input.value = "";
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

    // News
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

    // Teams & Umbenennen
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

    if (viewName === "forum") scrollChatToBottom();
    if (viewName === "turniere") tournamentsModule.render();
    if (viewName === "ranking") renderRanking();
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
        btn.innerHTML = `<span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(getTeamName(team))}</strong><small>Spielerteam · Manager: ${escapeHTML(team.username)}</small></span><span class="team-directory-arrow">›</span>`;
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

function renderRanking() {
    const target = document.getElementById("ranking-content");
    if (!target) return;
    const vrsMap = getVrsRankingsMap();
    const date = getBestVrsDateForGameDate(globalSettings.gameDate);

    const playerTeams = playersCache.map(t => ({ name: getTeamName(t), manager: t.username, points: Number(t.points) || 0, official: false }));
    const officialTeams = (vrsMap[date] || []).map(([name, pts]) => ({ name, manager: "HLTV / VRS", points: Number(pts) || 0, official: true }));
    const all = [...playerTeams, ...officialTeams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));

    target.innerHTML = `
        <div class="ranking-table-wrap">
            <table class="ranking-table">
                <thead><tr><th>Platz</th><th>Team</th><th>Art</th><th>Manager / Quelle</th><th>Punkte</th></tr></thead>
                <tbody>${all.map((t, i) => `<tr><td>${i + 1}</td><td>${t.official ? "🏆" : "🛡️"} ${escapeHTML(t.name)}</td><td>${t.official ? "HLTV-Team" : "Spielerteam"}</td><td>${escapeHTML(t.manager)}</td><td><strong>${t.points.toLocaleString("de-DE")}</strong></td></tr>`).join("")}</tbody>
            </table>
        </div>
        <p class="ranking-note">🏆 = offizielles HLTV-/VRS-Team · 🛡️ = Spielerteam · Spieldatum: ${escapeHTML(formatDateDE(globalSettings.gameDate))} (VRS-Stand: ${escapeHTML(formatDateDE(date))}).</p>
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
                <span class="password-changed-tag">🔒 Auth aktiv</span>
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
        return `
            <div class="chat-msg ${isOwn ? "own-msg" : ""}">
                <div class="chat-msg-header">
                    <span class="chat-author ${m.role === "admin" ? "admin-badge" : ""}">${escapeHTML(m.author)}${m.role === "admin" ? " [ADMIN]" : ""}</span>
                    <span class="chat-time">${escapeHTML(m.time)}</span>
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
