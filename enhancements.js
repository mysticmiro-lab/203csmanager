// Admin news controls, team directory, ranking, and owner-only team renaming.
(() => {
    const KEYS = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let selectedTeamUsername = null;
    let editingNewsId = null;

    const readJSON = (key, fallback = []) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch (_) { return fallback; }
    };
    const players = () => readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item);
    const user = () => {
        try { return JSON.parse(sessionStorage.getItem(KEYS.session) || "null"); }
        catch (_) { return null; }
    };
    const newsItems = () => readJSON(KEYS.news);
    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };
    const teamName = team => String(team.teamName || team.team_name || `Team ${team.username}`).trim();

    function ensureNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav) return;
        for (const [view, label] of [["team", "👥 Teams"], ["ranking", "🏆 Ranking"]]) {
            if (nav.querySelector(`[data-view="${view}"]`)) continue;
            const item = document.createElement("li");
            item.innerHTML = `<button type="button" class="nav-item" data-view="${view}">${label}</button>`;
            nav.insertBefore(item, document.getElementById("admin-nav-li") || null);
        }
    }

    function renderDirectory() {
        const list = document.getElementById("team-directory-list");
        if (!list) return;
        document.getElementById("team-sidebar-title")?.classList.add("hidden");
        document.getElementById("team-nav-list")?.classList.add("hidden");
        const all = players();
        list.innerHTML = all.length
            ? all.map(team => `<li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(team.username)}"><span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(teamName(team))}</strong><small>Manager: ${escapeHTML(team.username)}</small></span><span class="team-directory-arrow">›</span></button></li>`).join("")
            : '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content");
        if (!target) return;
        const all = players().sort((a, b) => teamName(a).localeCompare(teamName(b), "de"));
        target.innerHTML = all.length
            ? `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead><tbody>${all.map((team, index) => `<tr><td>${index + 1}</td><td>🛡️ ${escapeHTML(teamName(team))}</td><td>${escapeHTML(team.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div><p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>`
            : '<div class="placeholder-box">Noch keine Teams im Ranking.</div>';
    }

    function renderTeam(username) {
        const team = players().find(item => item.username === username);
        if (!team) return;
        selectedTeamUsername = team.username;
        const current = user();

        // Let the app switch to the chosen team first, then render the controls for that exact team.
        if (typeof window.openTeamView === "function") window.openTeamView(team.username);
        document.getElementById("team-directory")?.classList.add("hidden");
        document.getElementById("team-details")?.classList.remove("hidden");

        const name = teamName(team);
        document.getElementById("team-view-name").textContent = name;
        document.getElementById("team-view-badge").textContent = name.charAt(0).toUpperCase();
        document.getElementById("team-view-owner").textContent = `Manager: ${team.username}`;
        document.getElementById("team-view-owner-inline").textContent = team.username;
        document.getElementById("view-title").textContent = name;

        const roster = Array.isArray(team.roster) ? team.roster : (Array.isArray(team.players) ? team.players : []);
        const statValues = document.querySelectorAll("#team-details .team-details-grid .stat-value");
        if (statValues[0]) statValues[0].textContent = team.status || "Aktiv";
        if (statValues[1]) statValues[1].textContent = `${roster.length} / 5 Spieler`;
        if (statValues[2]) statValues[2].textContent = `${(Number(team.budget) || 10000).toLocaleString("de-DE")} $`;
        const rosterPanel = document.querySelector("#team-details .placeholder-box");
        if (rosterPanel) {
            rosterPanel.innerHTML = roster.length
                ? `<strong>Kader von ${escapeHTML(name)}</strong><ul class="team-roster-list">${roster.map(player => `<li>${escapeHTML(typeof player === "string" ? player : (player.name || player.username || "Spieler"))}</li>`).join("")}</ul>`
                : `Noch keine Spieler im Kader von <strong>${escapeHTML(name)}</strong> eingetragen.`;
        }

        const header = document.querySelector("#team-details .team-header");
        if (!header) return;
        let actions = document.getElementById("team-manager-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.id = "team-manager-actions";
            actions.className = "team-manager-actions";
            header.append(actions);
        }

        // Clear any previously rendered form before deciding whether this team belongs to the viewer.
        actions.replaceChildren();
        document.querySelectorAll("#rename-team-form").forEach(form => form.remove());
        const isOwnTeam = current?.role === "player" && current.username === team.username;
        if (isOwnTeam) {
            const form = document.createElement("form");
            form.id = "rename-team-form";
            form.className = "rename-team-form";
            form.dataset.owner = team.username;
            form.innerHTML = `<label for="rename-team-input">Dein Team umbenennen</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(name)}"><button type="submit" class="btn btn-primary btn-small">Speichern</button></div><p id="team-rename-feedback" class="rename-team-feedback" aria-live="polite"></p>`;
            actions.append(form);
        }
        const back = document.createElement("button");
        back.type = "button";
        back.id = "back-to-teams-btn";
        back.className = "btn btn-secondary btn-small";
        back.textContent = "← Alle Teams";
        actions.append(back);
    }

    function showDirectory() {
        selectedTeamUsername = null;
        document.getElementById("team-details")?.classList.add("hidden");
        document.getElementById("team-directory")?.classList.remove("hidden");
        document.getElementById("view-title").textContent = "Meine Teams";
        renderDirectory();
    }

    function renderNews() {
        const feed = document.getElementById("news-feed");
        if (!feed) return;
        const admin = user()?.role === "admin";
        feed.innerHTML = newsItems().map(article => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(article.date)} von ${escapeHTML(article.author)}</div><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.body)}</p>${admin ? `<div class="news-admin-actions"><button class="btn btn-secondary btn-small" type="button" data-news-action="edit" data-news-id="${escapeHTML(article.id)}">✏️ Bearbeiten</button><button class="btn btn-danger btn-small" type="button" data-news-action="delete" data-news-id="${escapeHTML(article.id)}">🗑️ Löschen</button></div>` : ""}</article>`).join("");
    }

    function resetNewsEditor() {
        editingNewsId = null;
        document.getElementById("news-form")?.reset();
        const heading = document.getElementById("news-form-heading");
        const submit = document.getElementById("news-submit-btn");
        if (heading) heading.textContent = "Neue HLTV-News veröffentlichen (Admin)";
        if (submit) submit.textContent = "News posten";
        document.getElementById("news-cancel-edit-btn")?.classList.add("hidden");
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureNavigation();
        renderDirectory();
        renderRanking();
        window.renderNews = renderNews;
        renderNews();

        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            if (event.target.closest('[data-view="team"]')) showDirectory();
            if (event.target.closest('[data-view="ranking"]')) renderRanking();
        });
        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (button) renderTeam(button.dataset.teamOpen);
        });
        document.getElementById("view-team")?.addEventListener("click", event => {
            if (event.target.closest("#back-to-teams-btn")) showDirectory();
        });
        document.getElementById("view-team")?.addEventListener("submit", event => {
            if (!event.target.matches("#rename-team-form")) return;
            event.preventDefault();
            const current = user();
            const owner = event.target.dataset.owner;
            // Never redirect or rename a different team's record from a stale/foreign form.
            if (current?.role !== "player" || !selectedTeamUsername || owner !== selectedTeamUsername || current.username !== selectedTeamUsername) {
                event.target.remove();
                return;
            }
            const newName = document.getElementById("rename-team-input").value.trim().slice(0, 40);
            const feedback = document.getElementById("team-rename-feedback");
            if (!newName) {
                if (feedback) { feedback.textContent = "Bitte gib einen Teamnamen ein."; feedback.className = "rename-team-feedback error"; }
                return;
            }
            const stored = readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item);
            const ownTeam = stored.find(item => item.username === current.username);
            if (!ownTeam || ownTeam.username !== selectedTeamUsername) return;
            ownTeam.teamName = newName;
            localStorage.setItem(KEYS.players, JSON.stringify(stored));
            renderDirectory();
            renderRanking();
            renderTeam(current.username);
            const saved = document.getElementById("team-rename-feedback");
            if (saved) { saved.textContent = "Teamname erfolgreich gespeichert."; saved.className = "rename-team-feedback success"; }
        });

        document.getElementById("news-form")?.addEventListener("submit", event => {
            if (editingNewsId === null || user()?.role !== "admin") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const items = newsItems();
            const article = items.find(item => String(item.id) === String(editingNewsId));
            if (!article) { resetNewsEditor(); return; }
            article.title = document.getElementById("news-title-input").value.trim();
            article.body = document.getElementById("news-body-input").value.trim();
            article.date = new Date().toLocaleDateString("de-DE");
            article.author = user().username;
            localStorage.setItem(KEYS.news, JSON.stringify(items));
            resetNewsEditor();
            renderNews();
        }, true);
        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => {
            const button = event.target.closest("[data-news-action]");
            if (!button || user()?.role !== "admin") return;
            const items = newsItems();
            const article = items.find(item => String(item.id) === String(button.dataset.newsId));
            if (!article) return;
            if (button.dataset.newsAction === "edit") {
                editingNewsId = article.id;
                document.getElementById("news-title-input").value = article.title || "";
                document.getElementById("news-body-input").value = article.body || "";
                document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten";
                document.getElementById("news-submit-btn").textContent = "Änderungen speichern";
                document.getElementById("news-cancel-edit-btn").classList.remove("hidden");
                document.getElementById("admin-news-creator").scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (button.dataset.newsAction === "delete" && confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) {
                localStorage.setItem(KEYS.news, JSON.stringify(items.filter(item => String(item.id) !== String(article.id))));
                renderNews();
            }
        });

        document.getElementById("open-password-modal-btn")?.addEventListener("click", () => {
            const form = document.getElementById("change-password-form");
            if (form && !document.getElementById("password-security-warning")) {
                const warning = document.createElement("p");
                warning.id = "password-security-warning";
                warning.className = "password-security-warning";
                warning.textContent = "Sicherheitshinweis: Nutze hier niemals ein Passwort, das du auch für andere Dienste verwendest. Diese Seite ist nicht für sichere Konten ausgelegt.";
                form.prepend(warning);
            }
        });
        ["player-login-form", "admin-login-form"].forEach(id => document.getElementById(id)?.addEventListener("submit", () => setTimeout(renderNews, 0)));
        document.getElementById("add-player-form")?.addEventListener("submit", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        document.getElementById("admin-player-list")?.addEventListener("click", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        window.addEventListener("storage", event => {
            if (event.key === KEYS.players) { renderDirectory(); renderRanking(); }
            if (event.key === KEYS.news) renderNews();
        });
    });
})();
