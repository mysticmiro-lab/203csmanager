// Adds a robust team directory and owner-only team rename UI.
(() => {
    const PLAYER_KEY = "hltv_game_players";
    const SESSION_KEY = "hltv_game_session";

    const readJSON = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch (_) { return fallback; }
    };

    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    const getPlayers = () => readJSON(PLAYER_KEY, []).map(player =>
        typeof player === "string" ? { username: player } : player
    );

    const getCurrentUser = () => {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
        catch (_) { return null; }
    };

    const getTeamName = player =>
        String(player.teamName || player.team_name || `Team ${player.username}`).trim();

    function ensureTeamNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav || nav.querySelector('[data-view="team"]')) return;

        const li = document.createElement("li");
        li.innerHTML = '<button type="button" class="nav-item" data-view="team">👥 Teams</button>';
        const admin = document.getElementById("admin-nav-li");
        nav.insertBefore(li, admin || null);
    }

    function ensureTeamViewStructure() {
        const section = document.getElementById("view-team");
        if (!section) return;

        section.innerHTML = `
            <div class="card team-page-card">
                <div id="team-directory-panel">
                    <h2>Meine Teams</h2>
                    <p class="muted-text">Wähle ein Team aus, um die Teaminformationen zu öffnen.</p>
                    <div id="team-directory-list" class="team-directory-list"></div>
                </div>
                <div id="team-details-panel" class="hidden">
                    <button type="button" id="team-back-button" class="btn btn-secondary btn-small team-back-button">← Zurück zur Teamübersicht</button>
                    <div class="team-header">
                        <div id="team-detail-badge" class="team-badge">T</div>
                        <div class="team-title-group">
                            <h2 id="team-detail-name">Teamname</h2>
                            <p id="team-detail-manager" class="muted-text">Manager: -</p>
                        </div>
                        <div id="team-owner-controls" class="team-owner-controls hidden">
                            <form id="rename-team-form" class="rename-team-form">
                                <label for="rename-team-input">Dein Team umbenennen</label>
                                <div class="rename-team-controls">
                                    <input id="rename-team-input" type="text" maxlength="40" required>
                                    <button type="submit" class="btn btn-primary btn-small">Speichern</button>
                                </div>
                                <p id="rename-team-feedback" class="rename-team-feedback" aria-live="polite"></p>
                            </form>
                        </div>
                    </div>
                    <div class="team-details-grid">
                        <div class="stat-box"><span class="stat-label">Status</span><span id="team-detail-status" class="stat-value">Aktiv</span></div>
                        <div class="stat-box"><span class="stat-label">Kadergröße</span><span id="team-detail-squad" class="stat-value">0 / 5 Spieler</span></div>
                        <div class="stat-box"><span class="stat-label">Budget</span><span id="team-detail-budget" class="stat-value">10.000 $</span></div>
                    </div>
                    <div id="team-detail-roster" class="placeholder-box team-detail-roster">
                        Noch keine Spieler im Kader eingetragen.
                    </div>
                </div>
            </div>`;
    }

    function renderTeamDirectory() {
        const list = document.getElementById("team-directory-list");
        if (!list) return;

        const teams = getPlayers();
        list.innerHTML = teams.length
            ? teams.map(team => `
                <button type="button" class="team-directory-item" data-team-open="${escapeHTML(team.username)}">
                    <span class="team-directory-badge">${escapeHTML(getTeamName(team).charAt(0).toUpperCase())}</span>
                    <span class="team-directory-copy">
                        <strong>${escapeHTML(getTeamName(team))}</strong>
                        <small>Manager: ${escapeHTML(team.username)}</small>
                    </span>
                    <span class="team-directory-arrow">›</span>
                </button>`).join("")
            : '<div class="empty-team-hint">Noch keine Teams vorhanden.</div>';
    }

    function showTeam(username) {
        const team = getPlayers().find(item => item.username === username);
        if (!team) return;

        const name = getTeamName(team);
        const current = getCurrentUser();

        document.getElementById("team-directory-panel")?.classList.add("hidden");
        document.getElementById("team-details-panel")?.classList.remove("hidden");
        document.getElementById("team-detail-name").textContent = name;
        document.getElementById("team-detail-badge").textContent = name.charAt(0).toUpperCase();
        document.getElementById("team-detail-manager").textContent = `Manager: ${team.username}`;
        document.getElementById("view-title").textContent = name;

        const squad = Array.isArray(team.roster) ? team.roster : (Array.isArray(team.players) ? team.players : []);
        const budget = Number.isFinite(Number(team.budget)) ? Number(team.budget) : 10000;
        document.getElementById("team-detail-status").textContent = team.status || "Aktiv";
        document.getElementById("team-detail-squad").textContent = `${squad.length} / 5 Spieler`;
        document.getElementById("team-detail-budget").textContent = `${budget.toLocaleString("de-DE")} $`;

        const rosterElement = document.getElementById("team-detail-roster");
        rosterElement.innerHTML = squad.length
            ? `<strong>Kader von ${escapeHTML(name)}</strong><ul class="team-roster-list">${squad.map(player => `<li>${escapeHTML(typeof player === "string" ? player : (player.name || player.username || "Spieler"))}</li>`).join("")}</ul>`
            : `Noch keine Spieler im Kader von <strong>${escapeHTML(name)}</strong> eingetragen.`;

        const ownerControls = document.getElementById("team-owner-controls");
        const canRename = current?.role === "player" && current.username === team.username;
        ownerControls.classList.toggle("hidden", !canRename);
        if (canRename) {
            document.getElementById("rename-team-input").value = name;
            document.getElementById("rename-team-feedback").textContent = "";
        }

        if (typeof window.switchView === "function") window.switchView("team");
    }

    function showDirectory() {
        document.getElementById("team-details-panel")?.classList.add("hidden");
        document.getElementById("team-directory-panel")?.classList.remove("hidden");
        document.getElementById("view-title").textContent = "Meine Teams";
        renderTeamDirectory();
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureTeamNavigation();
        ensureTeamViewStructure();
        renderTeamDirectory();

        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            if (event.target.closest('[data-view="team"]')) showDirectory();
        });

        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (button) showTeam(button.dataset.teamOpen);
        });

        document.getElementById("team-back-button")?.addEventListener("click", showDirectory);

        document.getElementById("rename-team-form")?.addEventListener("submit", event => {
            event.preventDefault();
            const current = getCurrentUser();
            if (current?.role !== "player") return;

            const nameInput = document.getElementById("rename-team-input");
            const newName = nameInput.value.trim().slice(0, 40);
            const feedback = document.getElementById("rename-team-feedback");
            if (!newName) {
                feedback.textContent = "Bitte einen Teamnamen eingeben.";
                feedback.className = "rename-team-feedback error";
                return;
            }

            const stored = readJSON(PLAYER_KEY, []).map(player =>
                typeof player === "string" ? { username: player } : player
            );
            const ownTeam = stored.find(player => player.username === current.username);
            if (!ownTeam) return;

            ownTeam.teamName = newName;
            localStorage.setItem(PLAYER_KEY, JSON.stringify(stored));
            renderTeamDirectory();
            showTeam(current.username);

            feedback.textContent = "Teamname erfolgreich gespeichert.";
            feedback.className = "rename-team-feedback success";
        });

        document.getElementById("add-player-form")?.addEventListener("submit", () => {
            setTimeout(renderTeamDirectory, 0);
        });

        window.addEventListener("storage", event => {
            if (event.key === PLAYER_KEY) renderTeamDirectory();
        });
    });
})();
