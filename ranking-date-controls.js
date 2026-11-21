// Admin date controls and the 2025-01-03 snapshot. Load after enhancements.js.
(() => {
    const STORAGE_KEY = "hltv_game_ranking_date";
    const SNAPSHOT_DATE = "2025-01-03";
    let snapshot = [];

    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    function parseSnapshot(text) {
        const rows = [];
        for (const line of text.split(/\r?\n/)) {
            const match = line.match(/^\s*\d+\.\s*(.*?)\s*[—–-]\s*(\d+)\s*Punkte\s*$/i);
            if (!match) continue;
            let name = match[1].trim();
            // Some source rows repeat the team name back-to-back (e.g. "G2G2").
            for (let split = 1; split <= name.length / 2; split++) {
                if (name.length % 2 === 0 && name.slice(0, split) === name.slice(split) && name.length / 2 === split) {
                    name = name.slice(0, split);
                    break;
                }
            }
            rows.push([name, Number(match[2])]);
        }
        return rows;
    }

    function getUser() {
        try { return JSON.parse(sessionStorage.getItem("hltv_game_session") || "null"); }
        catch (_) { return null; }
    }

    function getPlayers() {
        try {
            return (JSON.parse(localStorage.getItem("hltv_game_players")) || []).map(item =>
                typeof item === "string" ? { username: item } : item
            );
        } catch (_) { return []; }
    }

    function makeControls(target) {
        if (getUser()?.role !== "admin" || target.querySelector(".ranking-date-parts")) return;
        const legacy = target.querySelector("#ranking-date-select");
        if (!legacy) return;

        legacy.setAttribute("aria-hidden", "true");
        legacy.tabIndex = -1;
        legacy.classList.add("ranking-date-legacy-select");

        const savedDate = localStorage.getItem(STORAGE_KEY) || "2025-01-01";
        const [savedYear, savedMonth, savedDay] = savedDate.split("-").map(Number);
        const controls = document.createElement("div");
        controls.className = "ranking-date-parts";
        controls.setAttribute("aria-label", "Ranking-Datum auswählen");
        const years = Array.from({ length: 31 }, (_, index) => 2000 + index);
        const months = Array.from({ length: 12 }, (_, index) => index + 1);
        const days = Array.from({ length: 31 }, (_, index) => index + 1);
        const select = (label, id, options, selected, format) => {
            const wrapper = document.createElement("label");
            wrapper.textContent = label;
            const input = document.createElement("select");
            input.id = id;
            for (const value of options) {
                const option = document.createElement("option");
                option.value = String(value);
                option.textContent = format(value);
                option.selected = value === selected;
                input.append(option);
            }
            wrapper.append(input);
            controls.append(wrapper);
        };
        select("Jahr", "ranking-year", years, years.includes(savedYear) ? savedYear : 2025, value => String(value));
        select("Monat", "ranking-month", months, savedMonth || 1, value => String(value).padStart(2, "0"));
        select("Tag", "ranking-day", days, savedDay || 1, value => String(value).padStart(2, "0"));
        legacy.before(controls);
    }

    function renderSnapshot(target) {
        if (!snapshot.length) {
            target.insertAdjacentHTML("beforeend", '<p class="ranking-note">Der Ranking-Datensatz für den 3. Januar 2025 konnte nicht geladen werden.</p>');
            return;
        }
        const playerTeams = getPlayers().map(team => ({
            name: String(team.teamName || team.team_name || `Team ${team.username}`).trim(),
            manager: team.username,
            points: Number(team.points) || 0,
            official: false
        }));
        const officialTeams = snapshot.map(([name, points]) => ({ name, manager: "HLTV / VRS", points, official: true }));
        const all = [...playerTeams, ...officialTeams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));
        const wrap = document.createElement("div");
        wrap.className = "ranking-table-wrap";
        wrap.innerHTML = `<table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Art</th><th>Manager / Quelle</th><th>Punkte</th></tr></thead><tbody>${all.map((team, index) => `<tr><td>${index + 1}</td><td>${team.official ? "🏆" : "🛡️"} ${escapeHTML(team.name)}</td><td>${team.official ? "HLTV-Team" : "Spielerteam"}</td><td>${escapeHTML(team.manager)}</td><td><strong>${team.points.toLocaleString("de-DE")}</strong></td></tr>`).join("")}</tbody></table></div>`;
        target.append(wrap);
    }

    function onDateChange(target) {
        const year = Number(target.querySelector("#ranking-year")?.value);
        const month = Number(target.querySelector("#ranking-month")?.value);
        const day = Number(target.querySelector("#ranking-day")?.value);
        if (!year || !month || !day) return;
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        localStorage.setItem(STORAGE_KEY, date);

        if (date === SNAPSHOT_DATE) {
            target.querySelector(".ranking-table-wrap")?.remove();
            target.querySelector(".ranking-note")?.remove();
            renderSnapshot(target);
            return;
        }
        const legacy = target.querySelector("#ranking-date-select");
        const note = target.querySelector(".ranking-note");
        if (date === "2025-01-01" || date === "2025-01-02") {
            if (note) note.remove();
            legacy.value = date;
            legacy.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            target.querySelector(".ranking-table-wrap")?.remove();
            if (note) note.remove();
            target.insertAdjacentHTML("beforeend", '<p class="ranking-note">Für dieses Datum ist kein Ranking-Datensatz vorhanden.</p>');
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const target = document.getElementById("ranking-content");
        if (!target) return;

        fetch(new URL("3jan25", document.currentScript?.src || window.location.href))
            .then(response => { if (!response.ok) throw new Error("Ranking-Datei nicht verfügbar"); return response.text(); })
            .then(text => { snapshot = parseSnapshot(text); })
            .catch(() => { snapshot = []; });

        const observer = new MutationObserver(() => makeControls(target));
        observer.observe(target, { childList: true, subtree: true });
        makeControls(target);

        target.addEventListener("change", event => {
            if (!event.target.matches("#ranking-year, #ranking-month, #ranking-day")) return;
            if (getUser()?.role !== "admin") return;
            // Wait for the extensionless data file to finish loading before rendering it.
            if (event.target.closest(".ranking-date-parts") && snapshot.length === 0) {
                fetch(new URL("3jan25", document.currentScript?.src || window.location.href)).then(response => response.text()).then(text => {
                    snapshot = parseSnapshot(text);
                    onDateChange(target);
                }).catch(() => onDateChange(target));
                return;
            }
            onDateChange(target);
        }, true);

        target.addEventListener("click", event => {
            if (event.target.closest('[data-view="ranking"]')) setTimeout(() => makeControls(target), 0);
        });
        window.addEventListener("storage", event => {
            if (event.key === "hltv_game_players" && localStorage.getItem(STORAGE_KEY) === SNAPSHOT_DATE) {
                target.querySelector(".ranking-table-wrap")?.remove();
                renderSnapshot(target);
            }
        });
    });
})();
