// ==================== CS2 MODULARES TURNIER-SYSTEM ====================
export function createTournamentsModule(deps) {
    const {
        getCurrentUser,
        getPlayers,
        getTeamName,
        getVrsRankingsMap,
        getSelectedRankingDate,
        getGameDate,
        getTimezone,
        getTournamentsCache,
        saveTournamentDoc,
        deleteTournamentDoc,
        savePlayerResponse,
        onOpenTournament,
        onTitleChange
    } = deps;

    let activeCategory = "laufend";
    let activeTournamentId = null;
    let activeSubTab = "";
    let selectedVrsDate = "";
    let vrsSearchTerm = "";
    let selectedTierTarget = "stage1";
    let vrsFillMode = "rank";
    let vrsFillValue = "1";
    let activeOqSection = "all";
    let oqPickerContext = null;

    const TIMEZONES = {
        europe: { label: "UTC+1", offsetFromBase: 0 },
        americas: { label: "UTC-5", offsetFromBase: -6 },
        asia: { label: "UTC+8", offsetFromBase: 7 }
    };

    const esc = (str) => {
        const div = document.createElement("div");
        div.textContent = String(str ?? "");
        return div.innerHTML;
    };

    const sanitizeKey = (k) => String(k || "").replace(/[^a-zA-Z0-9_-]/g, "_");

    const addDaysISO = (dateStr, delta) => {
        const base = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "") ? dateStr : "2025-01-01";
        const [y, m, d] = base.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d + delta));
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    };

    const formatDateDE = (iso) => {
        if (!iso) return "";
        const dt = new Date(`${iso}T00:00:00Z`);
        return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    };

    const convertFromBaseTimezone = (dateISO, timeStr, tzKey) => {
        const tz = TIMEZONES[tzKey] || TIMEZONES.europe;
        if (!dateISO || !timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
            return { dateISO, timeStr, tzLabel: tz.label };
        }
        const [y, m, d] = dateISO.split("-").map(Number);
        const [hh, mm] = timeStr.split(":").map(Number);
        const shifted = new Date(Date.UTC(y, m - 1, d, hh + tz.offsetFromBase, mm));
        const outDate = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
        const outTime = `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
        return { dateISO: outDate, timeStr: outTime, tzLabel: tz.label };
    };

    const tryParseGermanOrIsoDate = (text) => {
        const s = String(text || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dotMatch) return `${dotMatch[3]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[1].padStart(2, "0")}`;
        const months = {
            januar: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mär: 3, april: 4, apr: 4,
            mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9,
            oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12
        };
        const textMatch = s.match(/^(\d{1,2})\.\s*([a-zäöüß]+)\s+(\d{4})$/i);
        if (textMatch) {
            const mNum = months[textMatch[2].toLowerCase()];
            if (mNum) return `${textMatch[3]}-${String(mNum).padStart(2, "0")}-${textMatch[1].padStart(2, "0")}`;
        }
        return null;
    };

    const getTournamentById = (id) => getTournamentsCache().find(t => t.id === id) || null;
    const isAdmin = () => getCurrentUser()?.role === "admin";
    const currentGameDate = () => getGameDate?.() || "2025-01-01";

    function getTournamentDateBounds(t) {
        const dates = [];
        const addIso = (v) => { if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) dates.push(v); };
        addIso(t.startDate);
        addIso(t.endDate);
        (t.rounds || []).forEach(r => (r.days || []).forEach(d => {
            addIso(d.dateISO);
            (d.matches || []).forEach(m => addIso(m.defaultDateISO));
        }));
        (t.swissGroups || []).forEach(g => (g.rounds || []).forEach(r => {
            addIso(r.dateISO);
            (r.matches || []).forEach(m => addIso(m.defaultDateISO));
        }));
        (t.rrGroups || []).forEach(g => (g.rounds || []).forEach(r => {
            addIso(r.dateISO);
            (r.matches || []).forEach(m => addIso(m.defaultDateISO));
        }));
        (t.deGroups || []).forEach(g => (g.matches || []).forEach(m => addIso(m.defaultDateISO)));
        (t.playInStage?.rounds || []).forEach(r => (r.days || []).forEach(d => {
            addIso(d.dateISO);
            (d.matches || []).forEach(m => addIso(m.defaultDateISO));
        }));
        Object.values(t.matchSchedules || {}).forEach(sc => addIso(sc?.date));
        dates.sort();

        const start = /^\d{4}-\d{2}-\d{2}$/.test(t.startDate || "") ? t.startDate : (dates[0] || "2025-01-01");
        const end = /^\d{4}-\d{2}-\d{2}$/.test(t.endDate || "") ? t.endDate : (dates[dates.length - 1] || start);
        return { start, end: end < start ? start : end };
    }

    function getEffectiveStatus(t) {
        if (t.statusMode === "manual" && ["laufend", "zukuenftig", "vergangen"].includes(t.status)) {
            return t.status;
        }
        const gDate = currentGameDate();
        const { start, end } = getTournamentDateBounds(t);
        if (gDate < start) return "zukuenftig";
        if (gDate > end) return "vergangen";
        return "laufend";
    }

    function formatCategoryBadge(status) {
        if (status === "laufend") return { label: "🔴 Aktuell laufend", cls: "t-badge-laufend" };
        if (status === "zukuenftig") return { label: "🗓️ Zukünftig", cls: "t-badge-zukuenftig" };
        return { label: "🏁 Vergangen", cls: "t-badge-vergangen" };
    }

    function getVrsEntriesForDate(date) {
        const list = getVrsRankingsMap()[date] || [];
        const counts = {};
        return list.map((item, idx) => {
            const name = String(item[0]);
            counts[name] = (counts[name] || 0) + 1;
            return { uid: `vrs:${name}#${counts[name]}`, rank: idx + 1, name, points: Number(item[1]) || 0, region: item[2] ? String(item[2]) : "" };
        });
    }

    function buildVrsLookupForDate(date) {
        const byUid = new Map();
        const byName = new Map();
        getVrsEntriesForDate(date).forEach(e => {
            byUid.set(e.uid, e.points);
            if (!byName.has(e.name)) byName.set(e.name, e.points);
        });
        return { byUid, byName };
    }

    // ==================== GENERATOREN FÜR ALLE STUFEN ====================
    function chunkIntoDays(matches, startDate, dayOffset, matchesPerDay) {
        const perDay = Math.max(1, Number(matchesPerDay) || 4);
        const days = [];
        for (let i = 0; i < matches.length; i += perDay) {
            const dIdx = Math.floor(i / perDay);
            const isoDate = addDaysISO(startDate, dayOffset + dIdx);
            days.push({
                dayLabel: "",
                dateISO: isoDate,
                dateLabel: formatDateDE(isoDate),
                matches: matches.slice(i, i + perDay).map(m => ({ ...m, defaultDateISO: isoDate }))
            });
        }
        return { days, nextOffset: dayOffset + days.length };
    }

    function generateBracketSeeds(n) {
        let seeds = [1, 2];
        while (seeds.length < n) {
            const nextSum = seeds.length * 2 + 1;
            const expanded = [];
            for (const s of seeds) expanded.push(s, nextSum - s);
            seeds = expanded;
        }
        return seeds;
    }

    function getBracketRoundName(roundSize) {
        if (roundSize === 2) return "Finale";
        if (roundSize === 4) return "Halbfinale";
        if (roundSize === 8) return "Viertelfinale";
        if (roundSize === 16) return "Achtelfinale";
        return `Round of ${roundSize}`;
    }

    function buildOpenQualifierPlayoffs(size, oqQualifierCount, startDate, dayOffset, defaultFormat, finalFormat) {
        const validSize = [8, 16, 32, 64, 128, 256, 512].includes(Number(size)) ? Number(size) : 64;
        const qualCap = Math.min(Math.max(1, Number(oqQualifierCount) || 4), Math.floor(validSize / 2));
        const rounds = [];
        let curSize = validSize;
        let offset = dayOffset;
        let prevIds = null;

        while (curSize >= qualCap * 2) {
            const matchCount = curSize / 2;
            const isQualiRound = matchCount === qualCap;
            const roundName = getBracketRoundName(curSize);
            const rId = `oq-r${curSize}`;
            const fmt = (isQualiRound && matchCount === 1) ? finalFormat : defaultFormat;

            const matches = [];
            for (let i = 0; i < matchCount; i++) {
                const m = {
                    id: `${rId}-${i + 1}`,
                    label: matchCount === 1 ? roundName : `R${curSize} #${i + 1}`,
                    format: fmt
                };
                if (prevIds) m.fromMatches = [prevIds[i * 2], prevIds[i * 2 + 1]];
                matches.push(m);
            }

            const perDay = matchCount > 16 ? matchCount : Math.max(4, matchCount);
            const chunked = chunkIntoDays(matches, startDate, offset, perDay);
            offset = chunked.nextOffset;
            rounds.push({
                id: rId,
                name: roundName,
                defaultFormat: fmt,
                subtitle: `${matchCount} Matches (${fmt})${isQualiRound ? ` → Top ${qualCap} weiter` : ""}`,
                days: chunked.days
            });

            prevIds = matches.map(m => m.id);
            curSize = curSize / 2;
        }
        return { rounds, qualCap, nextOffset: offset };
    }

    function buildDoubleElimPlayoffs(size, startDate, dayOffset, defaultFormat, finalFormat, isQualifierMode = false) {
        let offset = dayOffset;

        if (size === 16 && isQualifierMode) {
            const ubR1 = Array.from({ length: 8 }, (_, i) => ({
                id: `de-ub-r1-${i + 1}`, label: `UB Achtelfinale ${i + 1}`, format: defaultFormat,
                slotHints: [`Seed #${i * 2 + 1}`, `Seed #${i * 2 + 2}`]
            }));
            const d1 = chunkIntoDays(ubR1, startDate, offset, 4);
            offset = d1.nextOffset;

            const lbR1 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-lb-r1-${i + 1}`, label: `LB Runde 1 #${i + 1}`, format: defaultFormat,
                fromLosers: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`],
                slotHints: [`Verlierer UB R1 #${i * 2 + 1}`, `Verlierer UB R1 #${i * 2 + 2}`]
            }));
            const d3 = chunkIntoDays(lbR1, startDate, offset, 4);

            const ubR2 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-ub-r2-${i + 1}`, label: `UB Quali-Runde ${i + 1}`, format: defaultFormat,
                fromMatches: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`],
                slotHints: [`Sieger UB R1 #${i * 2 + 1}`, `Sieger UB R1 #${i * 2 + 2}`],
                isQualifyingMatch: true
            }));
            const d2 = chunkIntoDays(ubR2, startDate, offset, 4);
            offset = Math.max(d2.nextOffset, d3.nextOffset);

            const lbR2 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-lb-r2-${i + 1}`, label: `LB Quali-Runde ${i + 1}`, format: defaultFormat,
                fromMixed: [{ type: "winner", id: `de-lb-r1-${i + 1}` }, { type: "loser", id: `de-ub-r2-${4 - i}` }],
                slotHints: [`Sieger LB R1 #${i + 1}`, `Absteiger UB Quali #${4 - i}`],
                isQualifyingMatch: true
            }));
            const d4 = chunkIntoDays(lbR2, startDate, offset, 4);

            return {
                isDoubleElim: true,
                isQualifierOnly: true,
                size: 16,
                qualifierCount: 8,
                qualifierMatchIds: [
                    "de-ub-r2-1", "de-ub-r2-2", "de-ub-r2-3", "de-ub-r2-4",
                    "de-lb-r2-1", "de-lb-r2-2", "de-lb-r2-3", "de-lb-r2-4"
                ],
                rounds: [
                    { id: "ub-r1", name: "UB Runde 1", defaultFormat, subtitle: "8 Matches", days: d1.days },
                    { id: "lb-r1", name: "LB Runde 1", defaultFormat, subtitle: "4 Matches", days: d3.days },
                    { id: "ub-r2", name: "UB Quali-Runde", defaultFormat, subtitle: "4 Quali-Matches", days: d2.days },
                    { id: "lb-r2", name: "LB Quali-Runde", defaultFormat, subtitle: "4 Quali-Matches", days: d4.days }
                ]
            };
        }

        if (size === 16) {
            const ubR1 = Array.from({ length: 8 }, (_, i) => ({ id: `de-ub-r1-${i + 1}`, label: `UB Achtelfinale ${i + 1}`, format: defaultFormat }));
            const d1 = chunkIntoDays(ubR1, startDate, offset, 4); offset = d1.nextOffset;
            const ubQf = Array.from({ length: 4 }, (_, i) => ({ id: `de-ub-qf-${i + 1}`, label: `UB Viertelfinale ${i + 1}`, format: defaultFormat, fromMatches: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`] }));
            const d2 = chunkIntoDays(ubQf, startDate, offset, 4); offset = d2.nextOffset;
            const ubSf = Array.from({ length: 2 }, (_, i) => ({ id: `de-ub-sf-${i + 1}`, label: `UB Halbfinale ${i + 1}`, format: defaultFormat, fromMatches: [`de-ub-qf-${i * 2 + 1}`, `de-ub-qf-${i * 2 + 2}`] }));
            const d3 = chunkIntoDays(ubSf, startDate, offset, 2); offset = d3.nextOffset;
            const ubF = [{ id: "de-ub-f-1", label: "Upper Bracket Finale", format: defaultFormat, fromMatches: ["de-ub-sf-1", "de-ub-sf-2"] }];
            const d4 = chunkIntoDays(ubF, startDate, offset, 1); offset = d4.nextOffset;

            const lbR1 = Array.from({ length: 4 }, (_, i) => ({ id: `de-lb-r1-${i + 1}`, label: `LB Runde 1 #${i + 1}`, format: defaultFormat, fromLosers: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`] }));
            const lbR2 = Array.from({ length: 4 }, (_, i) => ({ id: `de-lb-r2-${i + 1}`, label: `LB Runde 2 #${i + 1}`, format: defaultFormat, fromMixed: [{ type: "winner", id: `de-lb-r1-${i + 1}` }, { type: "loser", id: `de-ub-qf-${4 - i}` }] }));
            const lbR3 = Array.from({ length: 2 }, (_, i) => ({ id: `de-lb-r3-${i + 1}`, label: `LB Runde 3 #${i + 1}`, format: defaultFormat, fromMatches: [`de-lb-r2-${i * 2 + 1}`, `de-lb-r2-${i * 2 + 2}`] }));
            const lbR4 = Array.from({ length: 2 }, (_, i) => ({ id: `de-lb-r4-${i + 1}`, label: `LB Runde 4 #${i + 1}`, format: defaultFormat, fromMixed: [{ type: "winner", id: `de-lb-r3-${i + 1}` }, { type: "loser", id: `de-ub-sf-${2 - i}` }] }));
            const lbSf = [{ id: "de-lb-sf-1", label: "Lower Bracket Halbfinale", format: defaultFormat, fromMatches: ["de-lb-r4-1", "de-lb-r4-2"] }];
            const lbF = [{ id: "de-lb-f-1", label: "Lower Bracket Finale", format: defaultFormat, fromMixed: [{ type: "loser", id: "de-ub-f-1" }, { type: "winner", id: "de-lb-sf-1" }] }];
            const gf = [{ id: "de-gf-1", label: "Grand Final", format: finalFormat, fromMatches: ["de-ub-f-1", "de-lb-f-1"] }];

            return {
                isDoubleElim: true, isQualifierOnly: false, size: 16,
                rounds: [
                    { id: "ub-r1", name: "UB Achtelfinale", defaultFormat, days: d1.days },
                    { id: "ub-qf", name: "UB Viertelfinale", defaultFormat, days: d2.days },
                    { id: "ub-sf", name: "UB Halbfinale", defaultFormat, days: d3.days },
                    { id: "ub-final", name: "UB Finale", defaultFormat, days: d4.days },
                    { id: "lb-r1", name: "LB Runde 1", defaultFormat, days: chunkIntoDays(lbR1, startDate, offset, 4).days },
                    { id: "lb-r2", name: "LB Runde 2", defaultFormat, days: chunkIntoDays(lbR2, startDate, offset + 1, 4).days },
                    { id: "lb-r3", name: "LB Runde 3", defaultFormat, days: chunkIntoDays(lbR3, startDate, offset + 2, 2).days },
                    { id: "lb-r4", name: "LB Runde 4", defaultFormat, days: chunkIntoDays(lbR4, startDate, offset + 3, 2).days },
                    { id: "lb-sf", name: "LB Halbfinale", defaultFormat, days: chunkIntoDays(lbSf, startDate, offset + 4, 1).days },
                    { id: "lb-final", name: "LB Finale", defaultFormat, days: chunkIntoDays(lbF, startDate, offset + 5, 1).days },
                    { id: "grand-final", name: "Grand Final", defaultFormat: finalFormat, days: chunkIntoDays(gf, startDate, offset + 6, 1).days }
                ]
            };
        }

        const ubQf = Array.from({ length: 4 }, (_, i) => ({ id: `de8-ub-qf-${i + 1}`, label: `UB Viertelfinale ${i + 1}`, format: defaultFormat }));
        const ubSf = Array.from({ length: 2 }, (_, i) => ({ id: `de8-ub-sf-${i + 1}`, label: `UB Halbfinale ${i + 1}`, format: defaultFormat, fromMatches: [`de8-ub-qf-${i * 2 + 1}`, `de8-ub-qf-${i * 2 + 2}`] }));
        const ubF = [{ id: "de8-ub-f-1", label: "UB Finale", format: defaultFormat, fromMatches: ["de8-ub-sf-1", "de8-ub-sf-2"] }];
        const lbR1 = Array.from({ length: 2 }, (_, i) => ({ id: `de8-lb-r1-${i + 1}`, label: `LB Runde 1 #${i + 1}`, format: defaultFormat, fromLosers: [`de8-ub-qf-${i * 2 + 1}`, `de8-ub-qf-${i * 2 + 2}`] }));
        const lbR2 = Array.from({ length: 2 }, (_, i) => ({ id: `de8-lb-r2-${i + 1}`, label: `LB Runde 2 #${i + 1}`, format: defaultFormat, fromMixed: [{ type: "winner", id: `de8-lb-r1-${i + 1}` }, { type: "loser", id: `de8-ub-sf-${2 - i}` }] }));
        const lbSf = [{ id: "de8-lb-sf-1", label: "LB Halbfinale", format: defaultFormat, fromMatches: ["de8-lb-r2-1", "de8-lb-r2-2"] }];
        const lbF = [{ id: "de8-lb-f-1", label: "LB Finale", format: defaultFormat, fromMixed: [{ type: "loser", id: "de8-ub-f-1" }, { type: "winner", id: "de8-lb-sf-1" }] }];
        const gf = [{ id: "de8-gf-1", label: "Grand Final", format: finalFormat, fromMatches: ["de8-ub-f-1", "de8-lb-f-1"] }];

        return {
            isDoubleElim: true, isQualifierOnly: false, size: 8,
            rounds: [
                { id: "ub-qf", name: "UB Viertelfinale", defaultFormat, days: chunkIntoDays(ubQf, startDate, offset, 4).days },
                { id: "ub-sf", name: "UB Halbfinale", defaultFormat, days: chunkIntoDays(ubSf, startDate, offset + 1, 2).days },
                { id: "ub-final", name: "UB Finale", defaultFormat, days: chunkIntoDays(ubF, startDate, offset + 2, 1).days },
                { id: "lb-r1", name: "LB Runde 1", defaultFormat, days: chunkIntoDays(lbR1, startDate, offset + 1, 2).days },
                { id: "lb-r2", name: "LB Runde 2", defaultFormat, days: chunkIntoDays(lbR2, startDate, offset + 2, 2).days },
                { id: "lb-sf", name: "LB Halbfinale", defaultFormat, days: chunkIntoDays(lbSf, startDate, offset + 3, 1).days },
                { id: "lb-final", name: "LB Finale", defaultFormat, days: chunkIntoDays(lbF, startDate, offset + 4, 1).days },
                { id: "grand-final", name: "Grand Final", defaultFormat: finalFormat, days: chunkIntoDays(gf, startDate, offset + 5, 1).days }
            ]
        };
    }

    function buildSingleElimPlayoffs(size, opts) {
        const { startDate, dayOffset = 0, matchesPerDay = 4, defaultFormat = "BO3", finalFormat = "BO5", directInvites = 0, isQuali32 = false } = opts;
        let offset = dayOffset;
        const rounds = [];

        if (size === 6) {
            const vf = [
                { id: "po-qf-1", label: "Viertelfinale 1", format: defaultFormat, slotHints: ["Gruppenzweiter A", "Gruppendritter B"] },
                { id: "po-qf-2", label: "Viertelfinale 2", format: defaultFormat, slotHints: ["Gruppenzweiter B", "Gruppendritter A"] }
            ];
            rounds.push({ id: "po-qf", name: "Viertelfinale", defaultFormat, days: chunkIntoDays(vf, startDate, offset, 2).days });
            offset += 1;
            const hf = [
                { id: "po-sf-1", label: "Halbfinale 1", format: defaultFormat, fromMatches: [null, "po-qf-1"], slotHints: ["Gruppensieger A (Freilos)", "Sieger VF #1"] },
                { id: "po-sf-2", label: "Halbfinale 2", format: defaultFormat, fromMatches: [null, "po-qf-2"], slotHints: ["Gruppensieger B (Freilos)", "Sieger VF #2"] }
            ];
            rounds.push({ id: "po-sf", name: "Halbfinale", defaultFormat, days: chunkIntoDays(hf, startDate, offset, 2).days });
            offset += 1;
            const fin = [{ id: "po-final-1", label: "Grand Final", format: finalFormat, fromMatches: ["po-sf-1", "po-sf-2"], slotHints: ["Sieger HF #1", "Sieger HF #2"] }];
            rounds.push({ id: "po-final", name: "Finale", defaultFormat: finalFormat, days: chunkIntoDays(fin, startDate, offset, 1).days });
            return rounds;
        }

        if (size === 32 && isQuali32) {
            const r32Matches = Array.from({ length: 16 }, (_, i) => ({
                id: `r32-${i + 1}`,
                label: `R32 Match ${i + 1}`,
                format: defaultFormat
            }));
            const c1 = chunkIntoDays(r32Matches, startDate, offset, matchesPerDay);
            offset = c1.nextOffset;
            rounds.push({ id: "r32", name: "Round of 32", defaultFormat, subtitle: `16 Matches (${defaultFormat})`, days: c1.days });

            const r16Matches = Array.from({ length: 8 }, (_, i) => ({
                id: `r16-${i + 1}`,
                label: `R16 Match ${i + 1}`,
                format: defaultFormat,
                r32WinnersOnly: true,
                slotHints: ["R32-Sieger wählen", "R32-Sieger wählen"]
            }));
            const c2 = chunkIntoDays(r16Matches, startDate, offset, matchesPerDay);
            rounds.push({ id: "r16", name: "Round of 16", defaultFormat, subtitle: `8 Matches (${defaultFormat}) · Nur R32-Sieger wählbar`, days: c2.days });
            return rounds;
        }

        const stages = size === 16
            ? [{ id: "r16", name: "Achtelfinale", label: "Achtelfinale", count: 8, fmt: defaultFormat }, { id: "qf", name: "Viertelfinale", label: "Viertelfinale", count: 4, fmt: defaultFormat }, { id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat }, { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }]
            : size === 8
                ? [{ id: "qf", name: "Viertelfinale", label: "Viertelfinale", count: 4, fmt: defaultFormat }, { id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat }, { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }]
                : [{ id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat }, { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }];

        let prevIds = null;
        stages.forEach((st, idx) => {
            const matches = [];
            for (let i = 0; i < st.count; i++) {
                const m = { id: `${st.id}-${i + 1}`, label: st.count === 1 ? st.label : `${st.label} ${i + 1}`, format: st.fmt };
                if (prevIds) {
                    m.fromMatches = [prevIds[i * 2], prevIds[i * 2 + 1]];
                    m.slotHints = [`Sieger ${stages[idx - 1].name} #${i * 2 + 1}`, `Sieger ${stages[idx - 1].name} #${i * 2 + 2}`];
                } else if (idx === 0 && size === 16 && directInvites === 8) {
                    m.slotHints = [`Direkt eingeladen #${i + 1}`, `Stage-Qualifikant #${8 - i}`];
                }
                matches.push(m);
            }
            const perDay = st.count <= 2 ? st.count : matchesPerDay;
            const chunked = chunkIntoDays(matches, startDate, offset, perDay);
            offset = chunked.nextOffset;
            rounds.push({ id: st.id, name: st.name, defaultFormat: st.fmt, subtitle: `${st.count} Matches (${st.fmt})`, days: chunked.days });
            prevIds = matches.map(m => m.id);
        });
        return rounds;
    }

    function buildPlayInStage(matchCount, startDate, dayOffset, format) {
        const matches = Array.from({ length: matchCount }, (_, i) => ({
            id: `pi-m-${i + 1}`, label: `Play-In Match ${i + 1}`, format,
            slotHints: [`Play-In Team ${i * 2 + 1}`, `Play-In Team ${i * 2 + 2}`]
        }));
        const chunked = chunkIntoDays(matches, startDate, dayOffset, Math.min(4, matchCount));
        return {
            matchCount, advanceCount: matchCount,
            rounds: [{ id: "play-in-r1", name: "Play-In Phase", defaultFormat: format, subtitle: `${matchCount} Matches (${format}) → ${matchCount} Sieger weiter`, days: chunked.days }],
            qualifierMatchIds: matches.map(m => m.id),
            nextOffset: chunked.nextOffset
        };
    }

    function buildSwissStage(groupId, name, teamCount, winsToAdvance, lossesToEliminate, startDate, dayOffset, defaultFormat, deciderFormat) {
        const roundCounts = teamCount >= 16 ? [8, 8, 8, 6, 3] : [4, 4, 2];
        const rounds = roundCounts.map((count, rIdx) => {
            const isoDate = addDaysISO(startDate, dayOffset + rIdx);
            return {
                id: `sw-${groupId}-r${rIdx + 1}`, name: `Runde ${rIdx + 1}`, dateISO: isoDate, dateLabel: formatDateDE(isoDate),
                matches: Array.from({ length: count }, (_, i) => ({
                    id: `sw-${groupId}-r${rIdx + 1}-${i + 1}`, label: `${name} R${rIdx + 1} #${i + 1}`, defaultDateISO: isoDate,
                    format: (rIdx >= roundCounts.length - 1 || (teamCount >= 16 && rIdx >= 2)) ? deciderFormat : defaultFormat
                }))
            };
        });
        return { id: groupId, name, teamCount, winsToAdvance, lossesToEliminate, rounds, nextOffset: dayOffset + roundCounts.length };
    }

    function buildGslGroup(groupId, size, startDate, dayOffset, defaultFormat, advanceCount = 2) {
        const p = `gsl-${groupId}`;
        const adv = Number(advanceCount) || 2;
        const iso0 = addDaysISO(startDate, dayOffset), iso1 = addDaysISO(startDate, dayOffset + 1);
        const iso2 = addDaysISO(startDate, dayOffset + 2), iso3 = addDaysISO(startDate, dayOffset + 3);

        if (size === 4) {
            if (adv === 1) {
                return {
                    id: groupId, name: `Gruppe ${groupId}`, size: 4, advanceCount: 1,
                    matches: [
                        { id: `${p}-o1`, round: "Opening", label: `Grp ${groupId} Opening 1`, defaultDateISO: iso0, dateLabel: formatDateDE(iso0), format: defaultFormat, slotHints: ["Seed 1", "Seed 4"] },
                        { id: `${p}-o2`, round: "Opening", label: `Grp ${groupId} Opening 2`, defaultDateISO: iso0, dateLabel: formatDateDE(iso0), format: defaultFormat, slotHints: ["Seed 2", "Seed 3"] },
                        { id: `${p}-ub`, round: "Upper Final", label: `Grp ${groupId} Upper Final`, defaultDateISO: iso1, dateLabel: formatDateDE(iso1), format: defaultFormat, fromMatches: [`${p}-o1`, `${p}-o2`], slotHints: ["Sieger Opening 1", "Sieger Opening 2"] },
                        { id: `${p}-lb`, round: "Elimination", label: `Grp ${groupId} Elimination`, defaultDateISO: iso1, dateLabel: formatDateDE(iso1), format: defaultFormat, fromLosers: [`${p}-o1`, `${p}-o2`], slotHints: ["Verlierer Opening 1", "Verlierer Opening 2"] },
                        { id: `${p}-cf`, round: "Consolidation", label: `Grp ${groupId} Consolidation Final`, defaultDateISO: iso2, dateLabel: formatDateDE(iso2), format: defaultFormat, fromMixed: [{ type: "loser", id: `${p}-ub` }, { type: "winner", id: `${p}-lb` }], slotHints: ["Verlierer Upper Final", "Sieger Elimination"] },
                        { id: `${p}-gf`, round: "Group Final", label: `Grp ${groupId} Group Final`, defaultDateISO: iso3, dateLabel: formatDateDE(iso3), format: defaultFormat, fromMatches: [`${p}-ub`, `${p}-cf`], slotHints: ["Sieger Upper Final", "Sieger Consolidation"] }
                    ],
                    qualifierMatchIds: [`${p}-gf`],
                    nextOffset: dayOffset + 4
                };
            }
            return {
                id: groupId, name: `Gruppe ${groupId}`, size: 4, advanceCount: 2,
                matches: [
                    { id: `${p}-o1`, round: "Opening", label: `Grp ${groupId} Opening 1`, defaultDateISO: iso0, dateLabel: formatDateDE(iso0), format: defaultFormat, slotHints: ["Seed 1", "Seed 4"] },
                    { id: `${p}-o2`, round: "Opening", label: `Grp ${groupId} Opening 2`, defaultDateISO: iso0, dateLabel: formatDateDE(iso0), format: defaultFormat, slotHints: ["Seed 2", "Seed 3"] },
                    { id: `${p}-w1`, round: "Winners", label: `Grp ${groupId} Winners`, defaultDateISO: iso1, dateLabel: formatDateDE(iso1), format: defaultFormat, fromMatches: [`${p}-o1`, `${p}-o2`], slotHints: ["Sieger Opening 1", "Sieger Opening 2"] },
                    { id: `${p}-l1`, round: "Elimination", label: `Grp ${groupId} Elimination`, defaultDateISO: iso1, dateLabel: formatDateDE(iso1), format: defaultFormat, fromLosers: [`${p}-o1`, `${p}-o2`], slotHints: ["Verlierer Opening 1", "Verlierer Opening 2"] },
                    { id: `${p}-d1`, round: "Decider", label: `Grp ${groupId} Decider`, defaultDateISO: iso2, dateLabel: formatDateDE(iso2), format: defaultFormat, fromMixed: [{ type: "loser", id: `${p}-w1` }, { type: "winner", id: `${p}-l1` }], slotHints: ["Verlierer Winners", "Sieger Elimination"] }
                ],
                qualifierMatchIds: [`${p}-w1`, `${p}-d1`],
                nextOffset: dayOffset + 3
            };
        }
        return { id: groupId, name: `Gruppe ${groupId}`, size, advanceCount: adv, matches: [], qualifierMatchIds: [], nextOffset: dayOffset + 2 };
    }

    function buildRoundRobinGroup(groupId, size, advanceCount, startDate, dayOffset, defaultFormat) {
        const n = size % 2 === 0 ? size : size + 1;
        const arr = Array.from({ length: n }, (_, i) => i);
        const rounds = [];
        for (let r = 0; r < n - 1; r++) {
            const iso = addDaysISO(startDate, dayOffset + r);
            const matches = [];
            for (let i = 0; i < n / 2; i++) {
                const a = arr[i], b = arr[n - 1 - i];
                if (a < size && b < size) {
                    matches.push({ id: `rr-${groupId}-r${r + 1}-${matches.length + 1}`, label: `Grp ${groupId} · R${r + 1} #${matches.length + 1}`, defaultDateISO: iso, format: defaultFormat, initialSlotIndices: [a, b] });
                }
            }
            rounds.push({ id: `rr-${groupId}-r${r + 1}`, name: `Runde ${r + 1}`, dateISO: iso, dateLabel: formatDateDE(iso), matches });
            arr.splice(1, 0, arr.pop());
        }
        return { id: groupId, name: `Gruppe ${groupId}`, size, advanceCount, rounds, nextOffset: dayOffset + (n - 1) };
    }

    function buildTournamentFromModularConfig(cfg) {
        const startDate = cfg.startDate || "2025-02-01";
        const defaultFormat = cfg.defaultFormat || "BO3";
        const deciderFormat = cfg.deciderFormat || "BO3";
        const finalFormat = cfg.finalFormat || "BO5";
        const matchesPerDay = Number(cfg.matchesPerDay) || 4;

        const hasStage1 = Boolean(cfg.hasStage1);
        const stage1Type = cfg.stage1Type || "swiss";
        const groupCount = Math.max(1, Math.min(4, Number(cfg.groupCount) || 1));
        const groupSize = Number(cfg.groupSize) || (stage1Type === "swiss" ? 16 : 8);
        const advancePerGroup = Number(cfg.advancePerGroup) || 2;

        const hasPlayIn = Boolean(cfg.hasPlayIn);
        const playInMatches = Math.max(1, Math.min(8, Number(cfg.playInMatches) || 4));

        const hasPlayoffs = Boolean(cfg.hasPlayoffs);
        const playoffType = cfg.playoffType || "single_elim";
        const isDoubleElimQuali = playoffType === "double_elim_quali";
        const isOpenQualifier = playoffType === "open_qualifier";
        const playoffSize = isDoubleElimQuali ? 16 : (Number(cfg.playoffSize) || 8);
        const directInvites = isOpenQualifier ? 0 : Math.max(0, Number(cfg.directInvites) || 0);
        const isQuali32 = !isOpenQualifier && Boolean(cfg.isQuali32 || playoffSize === 32);
        const oqQualifierCount = isOpenQualifier
            ? Math.min(Math.max(1, Number(cfg.oqQualifierCount) || 4), Math.floor(playoffSize / 2))
            : 0;

        let currentDayOffset = 0;
        let swissGroups = [];
        let deGroups = [];
        let rrGroups = [];
        let playInStage = null;
        let playoffRounds = [];
        let isDoubleElimPlayoffs = false;
        let deQualiMeta = null;

        if (hasStage1) {
            const letters = ["A", "B", "C", "D"];
            if (stage1Type === "swiss") {
                const wins = groupSize >= 16 ? 3 : 2;
                swissGroups = letters.slice(0, groupCount).map(g =>
                    buildSwissStage(g, groupCount > 1 ? `Gruppe ${g}` : "Gruppenphase", groupSize, wins, wins, startDate, currentDayOffset, defaultFormat, deciderFormat)
                );
                currentDayOffset = Math.max(...swissGroups.map(g => g.nextOffset));
            } else if (stage1Type === "gsl") {
                deGroups = letters.slice(0, groupCount).map(g =>
                    buildGslGroup(g, groupSize, startDate, currentDayOffset, defaultFormat, advancePerGroup)
                );
                currentDayOffset = Math.max(...deGroups.map(g => g.nextOffset));
            } else if (stage1Type === "round_robin") {
                rrGroups = letters.slice(0, groupCount).map(g =>
                    buildRoundRobinGroup(g, groupSize, advancePerGroup, startDate, currentDayOffset, defaultFormat)
                );
                currentDayOffset = Math.max(...rrGroups.map(g => g.nextOffset));
            }
        }

        if (hasPlayIn) {
            playInStage = buildPlayInStage(playInMatches, startDate, currentDayOffset, defaultFormat);
            currentDayOffset = playInStage.nextOffset;
        }

        if (hasPlayoffs) {
            if (isOpenQualifier) {
                const oq = buildOpenQualifierPlayoffs(playoffSize, oqQualifierCount, startDate, currentDayOffset, defaultFormat, finalFormat);
                playoffRounds = oq.rounds;
                currentDayOffset = oq.nextOffset;
            } else if (isDoubleElimQuali || playoffType === "double_elim") {
                isDoubleElimPlayoffs = true;
                const de = buildDoubleElimPlayoffs(
                    playoffSize >= 16 ? 16 : 8, startDate, currentDayOffset, defaultFormat, finalFormat, isDoubleElimQuali
                );
                playoffRounds = de.rounds;
                if (de.isQualifierOnly) deQualiMeta = de;
            } else {
                playoffRounds = buildSingleElimPlayoffs(playoffSize, {
                    startDate, dayOffset: currentDayOffset, matchesPerDay, defaultFormat, finalFormat, directInvites, isQuali32
                });
            }
        }

        let totalTeams = 0;
        if (hasStage1) totalTeams += groupCount * groupSize;
        if (hasPlayoffs && directInvites > 0) totalTeams += directInvites;
        if (!hasStage1 && hasPlayoffs) totalTeams = isQuali32 ? 32 : playoffSize;
        if (!hasStage1 && !hasPlayoffs && hasPlayIn) totalTeams = playInMatches * 2;
        if (totalTeams === 0) totalTeams = 16;

        const computedEndDate = addDaysISO(startDate, Math.max(0, currentDayOffset - 1));
        const endDate = /^\d{4}-\d{2}-\d{2}$/.test(cfg.endDate || "") ? cfg.endDate : computedEndDate;

        const prizeTotal = Number(cfg.prizePoolTotal) || 0;
        const prizeDistribution = [];
        if (Number(cfg.prize1) > 0) prizeDistribution.push({ place: "🥇 1. Platz", amount: Number(cfg.prize1), sourceType: "final-winner" });
        if (Number(cfg.prize2) > 0) prizeDistribution.push({ place: "🥈 2. Platz", amount: Number(cfg.prize2), sourceType: "final-loser" });
        if (Number(cfg.prize34) > 0) prizeDistribution.push({ place: "🥉 3.–4. Platz", amount: Number(cfg.prize34), sourceType: "sf-losers", labelSuffix: " (je Team)" });
        if (Number(cfg.prize58) > 0) prizeDistribution.push({ place: "🏅 5.–8. Platz", amount: Number(cfg.prize58), sourceType: "qf-losers", labelSuffix: " (je Team)" });

        const notices = [];
        if (cfg.locationNotice?.trim()) {
            notices.push({ type: "info", icon: "📍", title: "Turnier- & Standort-Hinweis", text: cfg.locationNotice.trim() });
        }
        if (cfg.travelNotice?.trim() || cfg.nextTournamentId) {
            const nextT = cfg.nextTournamentId ? getTournamentById(cfg.nextTournamentId) : null;
            notices.push({
                type: "warning", icon: "✈️", title: "Reise- & Folge-Turnier-Hinweis",
                text: cfg.travelNotice?.trim() || "Die Gewinner qualifizieren sich für das verknüpfte Folge-Turnier.",
                linkTournamentId: nextT ? nextT.id : "", linkLabel: nextT ? `→ Zu ${nextT.name}` : ""
            });
        }
        if (cfg.predecessorId) {
            const predT = getTournamentById(cfg.predecessorId);
            if (predT) {
                notices.push({
                    type: "neutral", icon: "🏆", title: "Automatische Qualifikation",
                    text: `Qualifizierte Teams aus „${predT.name}“ werden automatisch übernommen.`,
                    linkTournamentId: predT.id, linkLabel: `← Zum Vorgängerturnier: ${predT.name}`
                });
            }
        }

        let qualifiedFrom = null;
        if (cfg.predecessorId) {
            const predT = getTournamentById(cfg.predecessorId);
            let count = 8;
            if (predT) {
                if (predT.playoffType === "open_qualifier" || predT.isOpenQualifier) count = Number(predT.oqQualifierCount) || 4;
                else if (predT.isDoubleElimQuali || predT.isQuali32) count = 8;
                else if (predT.hasPlayIn) count = predT.playInMatches || 4;
                else if (predT.hasStage1) {
                    if (predT.stage1Type === "swiss") count = (predT.groupCount || 1) * ((predT.groupSize || 16) >= 16 ? 8 : 4);
                    else count = (predT.groupCount || 1) * (predT.advancePerGroup || 2);
                } else if (predT.hasPlayoffs) {
                    count = 1;
                }
            }
            qualifiedFrom = {
                tournamentId: cfg.predecessorId,
                slots: Array.from({ length: count }, (_, i) => ({ matchId: `q-${i + 1}`, label: `Qualifikant #${i + 1}` }))
            };
        }

        const matchFormatSummary = defaultFormat === finalFormat ? `Best of ${defaultFormat.slice(2)} (${defaultFormat})` : `${defaultFormat} (Finale: ${finalFormat})`;
        const statusInput = cfg.status || "auto";

        return {
            id: cfg.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cfg.name.trim(),
            statusMode: statusInput === "auto" ? "auto" : "manual",
            status: statusInput,
            useAutoInvites: cfg.useAutoInvites !== false,
            startDate,
            endDate,
            matchesPerDay,
            maxTeams: totalTeams,
            hasStage1, stage1Type, groupCount, groupSize, advancePerGroup,
            hasPlayIn, playInMatches,
            hasPlayoffs, playoffType, isDoubleElimQuali, isOpenQualifier, oqQualifierCount, deQualiMeta,
            playoffSize, directInvites, isQuali32, isDoubleElimPlayoffs,
            onlineDates: cfg.onlineDates.trim(),
            onlineRegion: cfg.onlineRegion.trim(),
            lanDates: (cfg.lanDates || "").trim(),
            lanLocation: (cfg.lanLocation || "").trim(),
            travelWindow: (cfg.travelWindow || "").trim(),
            defaultFormat, deciderFormat, finalFormat, matchFormatSummary,
            formatSummary: `${totalTeams} Teams (${matchFormatSummary})`,
            inviteSummary: (cfg.inviteSummary || `Top ${totalTeams} Teams`).trim(),
            nextTournamentId: cfg.nextTournamentId || "",
            qualifiedFrom,
            prizePoolTotal: prizeTotal,
            prizeDistribution,
            notices,
            swissGroups, deGroups, rrGroups, playInStage, rounds: playoffRounds,
            participants: cfg.existingParticipants || [],
            matches: cfg.existingMatches || {},
            matchSchedules: cfg.existingMatchSchedules || {},
            winners: cfg.existingWinners || {},
            defaultWins: cfg.existingDefaultWins || {},
            invitesBaked: Boolean(cfg.invitesBaked),
            sortOrder: cfg.sortOrder ?? Date.now(),
            createdAt: cfg.createdAt ?? Date.now()
        };
    }

    function getInitialSeedTournaments() {
        return [];
    }

    // ==================== VRS-EINLADUNGEN & VERBUND-LOGIK ====================
    function splitBaseParticipantsByTier(t) {
        const raw = Array.isArray(t.participants) ? t.participants : [];
        const hasStage2Direct = Boolean(t.hasStage1 && t.hasPlayoffs && Number(t.directInvites) > 0);
        const predSlots = t.qualifiedFrom?.slots?.length || 0;
        const stage1DirectCap = hasStage2Direct ? Math.max(0, ((t.groupCount || 1) * (t.groupSize || 16)) - predSlots) : raw.length;

        const stage1Base = [];
        const playoffsDirectBase = [];
        const allBase = [];
        const manualPlayers = [];
        let untaggedIdx = 0;

        raw.forEach(p => {
            if (p.type === "player") manualPlayers.push(p);
            allBase.push(p);
            if (!hasStage2Direct) return;
            if (p.slotGroup === "playoffs_direct") {
                playoffsDirectBase.push(p);
            } else if (p.slotGroup === "stage1") {
                stage1Base.push(p);
            } else if (untaggedIdx < stage1DirectCap) {
                stage1Base.push(p);
                untaggedIdx++;
            } else {
                playoffsDirectBase.push(p);
                untaggedIdx++;
            }
        });

        return { hasStage2Direct, stage1DirectCap, stage1Base, playoffsDirectBase, allBase, manualPlayers };
    }

    function getPlayerResponseForChain(player, chainMemberIds, chainRootId) {
        const resMap = player.tournamentResponses || {};
        const rootKey = sanitizeKey(chainRootId);
        if (resMap[rootKey]) return resMap[rootKey];
        for (const id of chainMemberIds) {
            const sk = sanitizeKey(id);
            if (resMap[sk]) return resMap[sk];
        }
        return null;
    }

    function findMaxQualifyingPlayers(playersDesc, hurdlesAsc) {
        const limit = Math.min(playersDesc.length, hurdlesAsc.length);
        for (let m = limit; m >= 1; m--) {
            let ok = true;
            for (let i = 0; i < m; i++) {
                if (playersDesc[i].points <= hurdlesAsc[m - 1 - i]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return m;
        }
        return 0;
    }

    function computeMinPointsNeededForTier(otherPlayersDesc, hurdlesAsc) {
        if (!hurdlesAsc || hurdlesAsc.length === 0) return null;
        const canQualifyAt = (pts) => {
            const test = [...otherPlayersDesc, { uid: "__probe__", points: pts }]
                .sort((a, b) => b.points - a.points);
            const m = findMaxQualifyingPlayers(test, hurdlesAsc);
            return test.slice(0, m).some(p => p.uid === "__probe__");
        };
        if (!canQualifyAt(9999999)) return null;
        if (canQualifyAt(0)) return 0;
        let lo = 1;
        let hi = Math.max(1, ...hurdlesAsc.filter(x => x >= 0)) + 10000;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (canQualifyAt(mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    function computeAllCircuitsInviteData() {
        const allTournaments = getTournamentsCache();
        const gDate = currentGameDate();
        const vrsDate = getSelectedRankingDate();
        const vrsLookup = buildVrsLookupForDate(vrsDate);
        const players = getPlayers();

        const tMap = new Map(allTournaments.map(t => [t.id, t]));
        const adj = new Map(allTournaments.map(t => [t.id, new Set()]));

        allTournaments.forEach(t => {
            const predId = t.qualifiedFrom?.tournamentId;
            if (predId && tMap.has(predId)) {
                adj.get(t.id).add(predId);
                adj.get(predId).add(t.id);
            }
            if (t.nextTournamentId && tMap.has(t.nextTournamentId)) {
                adj.get(t.id).add(t.nextTournamentId);
                adj.get(t.nextTournamentId).add(t.id);
            }
        });

        const visited = new Set();
        const circuits = [];
        const tournamentToCircuit = new Map();
        const tierResultsByTournament = new Map();
        const emailsByPlayerUid = new Map();
        players.forEach(p => emailsByPlayerUid.set(p.uid, []));

        const getBaseLivePoints = (p) => {
            if (p.type === "vrs") {
                return vrsLookup.byUid.get(p.uid) ?? vrsLookup.byName.get(p.name) ?? (Number(p.points) || 0);
            }
            return Number(p.points) || 0;
        };

        for (const t of allTournaments) {
            if (visited.has(t.id)) continue;
            const comp = [];
            const q = [t.id];
            visited.add(t.id);
            while (q.length > 0) {
                const cur = q.shift();
                const obj = tMap.get(cur);
                if (obj) comp.push(obj);
                for (const nb of (adj.get(cur) || [])) {
                    if (!visited.has(nb)) {
                        visited.add(nb);
                        q.push(nb);
                    }
                }
            }

            const compIds = new Set(comp.map(x => x.id));
            const hasOutgoing = new Set();
            comp.forEach(x => {
                if (x.nextTournamentId && compIds.has(x.nextTournamentId)) hasOutgoing.add(x.id);
                if (x.qualifiedFrom?.tournamentId && compIds.has(x.qualifiedFrom.tournamentId)) hasOutgoing.add(x.qualifiedFrom.tournamentId);
            });
            const roots = comp.filter(x => !hasOutgoing.has(x.id))
                .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
            const rootT = roots[0] || comp[0];
            const chainRootId = rootT.id;

            const levelMap = new Map([[chainRootId, 0]]);
            const lq = [chainRootId];
            while (lq.length > 0) {
                const curId = lq.shift();
                const curLvl = levelMap.get(curId);
                const curObj = tMap.get(curId);
                if (!curObj) continue;
                const preds = [];
                if (curObj.qualifiedFrom?.tournamentId && compIds.has(curObj.qualifiedFrom.tournamentId)) {
                    preds.push(curObj.qualifiedFrom.tournamentId);
                }
                comp.forEach(other => {
                    if (other.nextTournamentId === curId) preds.push(other.id);
                });
                preds.forEach(pid => {
                    if (!levelMap.has(pid) || levelMap.get(pid) < curLvl + 1) {
                        levelMap.set(pid, curLvl + 1);
                        lq.push(pid);
                    }
                });
            }

            comp.forEach(x => {
                if (!levelMap.has(x.id)) levelMap.set(x.id, 0);
            });

            const sortedMembers = [...comp].sort((a, b) => {
                const la = levelMap.get(a.id) ?? 0;
                const lb = levelMap.get(b.id) ?? 0;
                if (la !== lb) return la - lb;
                return (getTournamentDateBounds(b).start).localeCompare(getTournamentDateBounds(a).start);
            });

            const startDates = comp.map(x => getTournamentDateBounds(x).start).sort();
            const chainStartDate = startDates[0] || "2025-01-01";
            const regStart = addDaysISO(chainStartDate, -14);
            const regEnd = addDaysISO(chainStartDate, -7);
            const phase = gDate < regStart ? "before" : (gDate < regEnd ? "open" : "closed");

            const tiers = [];
            const manualPlayerUidsInChain = new Set();

            sortedMembers.forEach(member => {
                const split = splitBaseParticipantsByTier(member);
                split.manualPlayers.forEach(mp => {
                    if (mp.playerUid) manualPlayerUidsInChain.add(mp.playerUid);
                });

                if (member.useAutoInvites === false || member.invitesBaked) return;

                const predSlots = member.qualifiedFrom?.slots?.length || 0;
                if (split.hasStage2Direct) {
                    const poBase = split.playoffsDirectBase.filter(p => p.type !== "player");
                    const s1Base = split.stage1Base.filter(p => p.type !== "player");
                    tiers.push({
                        tournament: member,
                        tierKey: "playoffs_direct",
                        tierLabel: `${member.name} – Playoffs (Direkt-Invite)`,
                        shortLabel: "Playoffs (Direkt-Invite)",
                        capacity: Number(member.directInvites) || 0,
                        baseNonPlayer: poBase.map(p => ({ ...p, livePoints: getBaseLivePoints(p) })),
                        isOpenQualifier: false
                    });
                    tiers.push({
                        tournament: member,
                        tierKey: "stage1",
                        tierLabel: `${member.name} – Gruppenphase`,
                        shortLabel: "Gruppenphase",
                        capacity: Math.max(0, ((member.groupCount || 1) * (member.groupSize || 16)) - predSlots),
                        baseNonPlayer: s1Base.map(p => ({ ...p, livePoints: getBaseLivePoints(p) })),
                        isOpenQualifier: false
                    });
                } else {
                    const nonPlayer = split.allBase.filter(p => p.type !== "player");
                    tiers.push({
                        tournament: member,
                        tierKey: "main",
                        tierLabel: comp.length > 1 ? `${member.name}` : `${member.name} – Hauptfeld`,
                        shortLabel: comp.length > 1 ? member.name : "Hauptfeld",
                        capacity: Math.max(0, (Number(member.maxTeams) || 16) - predSlots),
                        baseNonPlayer: nonPlayer.map(p => ({ ...p, livePoints: getBaseLivePoints(p) })),
                        isOpenQualifier: Boolean(member.playoffType === "open_qualifier" || member.isOpenQualifier)
                    });
                }
            });

            const activeCandidates = [];
            const declinedPlayers = [];
            const expiredPendingPlayers = [];

            players.forEach(p => {
                if (manualPlayerUidsInChain.has(p.uid)) return;
                const resp = getPlayerResponseForChain(p, compIds, chainRootId);
                const entry = {
                    playerUid: p.uid,
                    uid: `player:${p.uid}`,
                    username: p.username,
                    name: getTeamName(p),
                    points: Number(p.points) || 0,
                    createdAt: p.createdAt || 0,
                    response: resp
                };
                if (resp?.status === "declined") {
                    declinedPlayers.push(entry);
                } else if (phase === "closed" && resp?.status !== "accepted") {
                    expiredPendingPlayers.push(entry);
                } else if (phase !== "before") {
                    activeCandidates.push(entry);
                }
            });

            activeCandidates.sort((a, b) => b.points - a.points || a.createdAt - b.createdAt);

            let remaining = [...activeCandidates];
            const tierEvaluations = [];
            const playerTierAssignment = new Map();

            tiers.forEach(tier => {
                const baseAsc = [...tier.baseNonPlayer].sort((a, b) => a.livePoints - b.livePoints);
                const cappedBase = baseAsc.length > tier.capacity ? baseAsc.slice(baseAsc.length - tier.capacity) : baseAsc;
                const emptyCount = Math.max(0, tier.capacity - cappedBase.length);
                const hurdles = [...Array(emptyCount).fill(-1), ...cappedBase.map(b => b.livePoints)].slice(0, tier.capacity);

                const m = findMaxQualifyingPlayers(remaining, hurdles);
                const chosen = remaining.slice(0, m);
                const displaceCount = Math.max(0, m - emptyCount);
                const displacedBase = cappedBase.slice(0, displaceCount);
                const displacedSet = new Set(displacedBase.map(d => d.uid));

                const evalObj = {
                    ...tier,
                    hurdles,
                    emptyCount,
                    invitedPlayers: chosen,
                    displacedBase,
                    displacedBaseUids: displacedSet
                };
                tierEvaluations.push(evalObj);

                chosen.forEach(cp => {
                    playerTierAssignment.set(cp.playerUid, evalObj);
                });

                if (!tierResultsByTournament.has(tier.tournament.id)) {
                    tierResultsByTournament.set(tier.tournament.id, {});
                }
                tierResultsByTournament.get(tier.tournament.id)[tier.tierKey] = evalObj;

                remaining = remaining.slice(m);
            });

            // Auch wenn ein Spieler in der geschlossenen Phase gar nicht akzeptiert hat, ermitteln ob er eigentlich eingeladen worden wäre (für Abgelaufen-E-Mail)
            const circuitObj = {
                chainRootId,
                rootName: rootT.name,
                members: sortedMembers,
                chainStartDate,
                regStart,
                regEnd,
                phase,
                tiers: tierEvaluations,
                activeCandidates,
                declinedPlayers,
                expiredPendingPlayers,
                remainingUnplaced: remaining,
                playerTierAssignment
            };
            circuits.push(circuitObj);
            comp.forEach(m => tournamentToCircuit.set(m.id, circuitObj));

            // E-Mails pro Spieler aufbauen
            if (phase !== "before" && tiers.length > 0) {
                players.forEach(p => {
                    if (manualPlayerUidsInChain.has(p.uid)) return;
                    const resp = getPlayerResponseForChain(p, compIds, chainRootId);
                    const assignedTier = playerTierAssignment.get(p.uid) || null;
                    const myPts = Number(p.points) || 0;
                    const list = emailsByPlayerUid.get(p.uid) || [];

                    if (resp?.status === "declined") {
                        list.push({
                            id: `mail-${chainRootId}-${p.uid}`,
                            chainRootId,
                            tournamentId: resp.tierTournamentId || chainRootId,
                            circuitTitle: rootT.name,
                            chainNames: sortedMembers.map(m => m.name),
                            tierLabel: resp.tierLabel || rootT.name,
                            sender: `Tournament Organizer · ${rootT.name}`,
                            dateLabel: formatDateDE(resp.gameDate || regStart),
                            deadlineLabel: formatDateDE(addDaysISO(regEnd, -1)),
                            status: "declined",
                            canRespond: false,
                            myPoints: myPts,
                            subject: `Abgelehnt: Turnier-Einladung für ${rootT.name}`,
                            body: `Du hast die Einladung für diesen Turnier-Verbund abgelehnt. Der freigewordene Platz wurde automatisch an das nächste berechtigte Team weitergegeben.`
                        });
                    } else if (assignedTier) {
                        const isAccepted = resp?.status === "accepted";
                        const shiftedTier = isAccepted && resp.tierKey && (resp.tierTournamentId !== assignedTier.tournament.id || resp.tierKey !== assignedTier.tierKey);
                        let status = "pending";
                        if (isAccepted) status = "accepted";
                        else if (phase === "closed") status = "expired";

                        list.push({
                            id: `mail-${chainRootId}-${p.uid}`,
                            chainRootId,
                            tournamentId: assignedTier.tournament.id,
                            tierKey: assignedTier.tierKey,
                            tierLabel: assignedTier.tierLabel,
                            circuitTitle: rootT.name,
                            chainNames: sortedMembers.map(m => m.name),
                            sender: `Tournament Organizer · ${rootT.name}`,
                            dateLabel: formatDateDE(regStart),
                            deadlineLabel: formatDateDE(addDaysISO(regEnd, -1)),
                            status,
                            shiftedTier,
                            previousTierLabel: resp?.tierLabel || "",
                            canRespond: phase === "open" && !isAccepted,
                            myPoints: myPts,
                            subject: shiftedTier
                                ? `Update (${assignedTier.shortLabel}): ${rootT.name}`
                                : `Turnier-Einladung: ${assignedTier.tierLabel}`,
                            body: isAccepted
                                ? (shiftedTier
                                    ? `Durch VRS-Verschiebungen oder Absagen anderer Teams startet dein Team nun in folgender Stufe: ${assignedTier.tierLabel}. Deine Anmeldung für den Verbund ist weiterhin aktiv!`
                                    : `Deine Teilnahme für ${assignedTier.tierLabel} (${myPts} VRS-Punkte) ist bestätigt. Bei aufeinander aufbauenden Turnieren gilt deine Anmeldung automatisch für den gesamten Turnier-Verbund.`)
                                : (phase === "open"
                                    ? `Aufgrund eures VRS-Rankings (${myPts} Punkte) laden wir euch offiziell zu „${assignedTier.tierLabel}“ ein. Bitte bestätige oder lehne die Teilnahme bis zum ${formatDateDE(addDaysISO(regEnd, -1))} ab. Hinweis: Deine Entscheidung gilt für den gesamten Verbund (${sortedMembers.map(x => x.name).join(" → ")}).`
                                    : `Die Anmeldefrist (${formatDateDE(addDaysISO(regEnd, -1))}) für ${assignedTier.tierLabel} ist abgelaufen, ohne dass die Einladung bestätigt wurde.`)
                        });
                    } else if (resp?.status === "accepted") {
                        // Spieler hatte angenommen, wurde aber während der Anmeldephase von punktstärkeren Teams verdrängt!
                        list.push({
                            id: `mail-${chainRootId}-${p.uid}`,
                            chainRootId,
                            tournamentId: chainRootId,
                            circuitTitle: rootT.name,
                            chainNames: sortedMembers.map(m => m.name),
                            tierLabel: "Ausgeschieden (VRS zu niedrig)",
                            sender: `Tournament Organizer · ${rootT.name}`,
                            dateLabel: formatDateDE(gDate),
                            deadlineLabel: formatDateDE(addDaysISO(regEnd, -1)),
                            status: "info",
                            canRespond: false,
                            myPoints: myPts,
                            subject: `VRS-Update: Platz in ${rootT.name} verloren`,
                            body: `Andere Spielerteams mit höherem VRS-Ranking haben sich angemeldet. Dein aktuelles VRS-Ranking (${myPts} Punkte) reicht leider nicht mehr für einen Startplatz im Verbund „${rootT.name}“ aus.`
                        });
                    } else if (phase === "closed" && expiredPendingPlayers.some(ep => ep.playerUid === p.uid)) {
                        // Prüfen, ob er theoretisch mit seinen Punkten während der offenen Phase eingeladen gewesen wäre
                        const lowestTier = tierEvaluations[tierEvaluations.length - 1];
                        if (lowestTier) {
                            const others = activeCandidates.filter(c => c.playerUid !== p.uid);
                            const needed = computeMinPointsNeededForTier(others, lowestTier.hurdles);
                            if (needed !== null && myPts >= needed) {
                                list.push({
                                    id: `mail-${chainRootId}-${p.uid}`,
                                    chainRootId,
                                    tournamentId: chainRootId,
                                    circuitTitle: rootT.name,
                                    chainNames: sortedMembers.map(m => m.name),
                                    tierLabel: lowestTier.tierLabel,
                                    sender: `Tournament Organizer · ${rootT.name}`,
                                    dateLabel: formatDateDE(regStart),
                                    deadlineLabel: formatDateDE(addDaysISO(regEnd, -1)),
                                    status: "expired",
                                    canRespond: false,
                                    myPoints: myPts,
                                    subject: `Abgelaufen: Einladung für ${rootT.name}`,
                                    body: `Die Anmeldefrist ist am ${formatDateDE(addDaysISO(regEnd, -1))} abgelaufen. Da keine Bestätigung eingegangen ist, wurde kein Startplatz vergeben.`
                                });
                            }
                        }
                    }

                    emailsByPlayerUid.set(p.uid, list);
                });
            }
        }

        return { circuits, tournamentToCircuit, tierResultsByTournament, emailsByPlayerUid, vrsLookup };
    }

    // ==================== TURNIER-GRAPH AUFLÖSEN ====================
    function resolveTournamentGraph(tournament, visited = new Set(), inviteCache = null) {
        if (!tournament || visited.has(tournament.id)) {
            return {
                participants: [], autoSlots: [], matchSlots: {}, matchWinners: {},
                matchSchedules: {}, defaultWins: {}, swissStandings: {}, rrStandings: {},
                stageAdvancers: [], r32Winners: []
            };
        }
        visited.add(tournament.id);

        const invData = inviteCache || computeAllCircuitsInviteData();
        const circuit = invData.tournamentToCircuit.get(tournament.id) || null;
        const tTiers = invData.tierResultsByTournament.get(tournament.id) || {};
        const vrsLookup = invData.vrsLookup;

        const hideSpoilers = !isAdmin();
        const gDate = currentGameDate();
        const rawManual = Array.isArray(tournament.participants) ? tournament.participants : [];
        const matchesMap = tournament.matches || {};
        const winnersMap = tournament.winners || {};
        const matchSchedules = tournament.matchSchedules || {};
        const defaultWins = tournament.defaultWins || {};

        let predGraph = null;
        if (tournament.qualifiedFrom?.tournamentId) {
            const predT = getTournamentById(tournament.qualifiedFrom.tournamentId);
            if (predT) predGraph = resolveTournamentGraph(predT, new Set(visited), invData);
        }

        const autoSlots = [];
        const participants = [];
        const seen = new Set();

        // 1. Effektive Basis-Teilnehmer + VRS-Verdrängung anwenden (sobald Anmeldephase vorbei ist, oder für Admin nach Anmeldeschluss)
        const applyDynamicDisplacement = Boolean(
            tournament.useAutoInvites !== false &&
            !tournament.invitesBaked &&
            circuit &&
            circuit.phase === "closed"
        );

        const displacedAll = new Set();
        const extraAcceptedPlayers = [];

        if (applyDynamicDisplacement) {
            Object.values(tTiers).forEach(tr => {
                tr.displacedBaseUids.forEach(u => displacedAll.add(u));
                tr.invitedPlayers.forEach(ip => {
                    if (ip.response?.status === "accepted") {
                        extraAcceptedPlayers.push({
                            uid: ip.uid,
                            type: "player",
                            playerUid: ip.playerUid,
                            username: ip.username,
                            name: ip.name,
                            points: ip.points,
                            slotGroup: tr.tierKey === "playoffs_direct" ? "playoffs_direct" : "stage1",
                            invitedViaEmail: true
                        });
                    }
                });
            });
        }

        // Qualifikanten aus Vorgängerturnier
        if (tournament.qualifiedFrom && predGraph) {
            const predAdv = predGraph.stageAdvancers || [];
            (tournament.qualifiedFrom.slots || []).forEach((slot, idx) => {
                let winUid = predGraph.matchWinners[slot.matchId] || null;
                if (!winUid && predAdv[idx]) winUid = predAdv[idx];
                const pObj = winUid ? predGraph.participants.find(p => p.uid === winUid) : null;
                autoSlots.push({ matchId: slot.matchId, label: slot.label, participant: pObj ? { ...pObj, autoQualified: true } : null });
                if (pObj && !seen.has(pObj.uid)) {
                    seen.add(pObj.uid);
                    participants.push({ ...pObj, autoQualified: true, slotGroup: "stage1" });
                }
            });
        }

        // Manuelle / VRS Basis-Teilnehmer minus verdrängte Teams + bestätigte Einladungen
        const keptManual = rawManual.filter(p => !displacedAll.has(p.uid));
        const livePts = (p) => {
            if (p.type === "player") {
                const live = getPlayers().find(pl => pl.uid === p.playerUid || pl.username === p.username);
                return live ? (Number(live.points) || 0) : (Number(p.points) || 0);
            }
            if (p.type === "vrs") {
                return vrsLookup.byUid.get(p.uid) ?? vrsLookup.byName.get(p.name) ?? (Number(p.points) || 0);
            }
            return Number(p.points) || 0;
        };

        const combinedDirect = [...keptManual, ...extraAcceptedPlayers];
        if (applyDynamicDisplacement && extraAcceptedPlayers.length > 0) {
            // Nach VRS-Punkten absteigend sortieren (innerhalb gleicher slotGroup), damit verschobene Teams exakt nachrücken
            const groupOrder = (p) => (p.slotGroup === "playoffs_direct" ? 1 : 0);
            combinedDirect.sort((a, b) => groupOrder(a) - groupOrder(b) || livePts(b) - livePts(a));
        }

        combinedDirect.forEach(p => {
            if (!seen.has(p.uid)) {
                seen.add(p.uid);
                participants.push(p);
            }
        });

        const matchSlots = {};
        const matchWinners = {};
        const r32WinnerSet = new Set();

        const isMatchFinishedForView = (m, fallbackIso = "") => {
            if (!hideSpoilers) return true;
            const mIso = matchSchedules[m.id]?.date || m.defaultDateISO || fallbackIso || tournament.startDate || "";
            return Boolean(mIso && gDate && mIso < gDate);
        };

        const resolveMatch = (m, groupSlice = [], roundReady = true, fallbackIso = "") => {
            const stored = matchesMap[m.id];
            const row = [null, null];
            const ignoreFromMatches = Boolean(tournament.isQuali32 && m.id.startsWith("r16-"));

            for (let s = 0; s < 2; s++) {
                if (hideSpoilers && !roundReady) {
                    row[s] = null;
                    continue;
                }

                let feedFinished = true;
                if (hideSpoilers && !ignoreFromMatches) {
                    if (Array.isArray(m.fromMatches) && m.fromMatches[s]) feedFinished = Boolean(matchWinners[m.fromMatches[s]]);
                    else if (Array.isArray(m.fromLosers) && m.fromLosers[s]) feedFinished = Boolean(matchWinners[m.fromLosers[s]]);
                    else if (Array.isArray(m.fromMixed) && m.fromMixed[s]) feedFinished = Boolean(matchWinners[m.fromMixed[s].id]);
                    else if (Array.isArray(m.fromPredecessor) && m.fromPredecessor[s] && predGraph) feedFinished = Boolean(predGraph.matchWinners[m.fromPredecessor[s]]);
                }

                if (!feedFinished) {
                    row[s] = null;
                } else if (Array.isArray(stored) && stored[s] !== undefined && stored[s] !== null && stored[s] !== "") {
                    row[s] = stored[s];
                } else if (Array.isArray(m.initialSlotIndices) && groupSlice[m.initialSlotIndices[s]]) {
                    row[s] = groupSlice[m.initialSlotIndices[s]].uid;
                } else if (!ignoreFromMatches && Array.isArray(m.fromMatches) && m.fromMatches[s]) {
                    row[s] = matchWinners[m.fromMatches[s]] || null;
                } else if (!ignoreFromMatches && Array.isArray(m.fromLosers) && m.fromLosers[s]) {
                    const srcId = m.fromLosers[s];
                    const w = matchWinners[srcId], sl = matchSlots[srcId] || [null, null];
                    row[s] = (w && sl[0] && sl[1] && sl[0] !== "__BYE__" && sl[1] !== "__BYE__") ? (w === sl[0] ? sl[1] : sl[0]) : null;
                } else if (!ignoreFromMatches && Array.isArray(m.fromMixed) && m.fromMixed[s]) {
                    const cfg = m.fromMixed[s];
                    const w = matchWinners[cfg.id], sl = matchSlots[cfg.id] || [null, null];
                    row[s] = cfg.type === "winner" ? (w || null) : ((w && sl[0] && sl[1] && sl[0] !== "__BYE__" && sl[1] !== "__BYE__") ? (w === sl[0] ? sl[1] : sl[0]) : null);
                } else if (!ignoreFromMatches && Array.isArray(m.fromPredecessor) && m.fromPredecessor[s] && predGraph) {
                    row[s] = predGraph.matchWinners[m.fromPredecessor[s]] || null;
                }

                if (row[s] && row[s] !== "__BYE__" && !seen.has(row[s])) row[s] = null;
                if (hideSpoilers && ignoreFromMatches && row[s] && !r32WinnerSet.has(row[s])) {
                    row[s] = null;
                }
            }

            matchSlots[m.id] = row;
            const rawW = isMatchFinishedForView(m, fallbackIso) ? (winnersMap[m.id] || null) : null;
            matchWinners[m.id] = (rawW && rawW !== "__BYE__" && (rawW === row[0] || rawW === row[1])) ? rawW : null;
        };

        const swissStandings = {};
        const rrStandings = {};
        const stageAdvancers = [];

        // 1. Swiss
        const stage1Pool = getStage1ParticipantsRaw(tournament, participants);
        (tournament.swissGroups || []).forEach((g, gIdx) => {
            const gTeams = stage1Pool.slice(gIdx * g.teamCount, (gIdx + 1) * g.teamCount);
            const table = {};
            gTeams.forEach((p, idx) => { table[p.uid] = { uid: p.uid, seed: idx + 1, wins: 0, losses: 0, opponents: new Set() }; });

            g.rounds.forEach((r, rIdx) => {
                let roundReady = true;
                if (hideSpoilers && rIdx > 0) {
                    const prevR = g.rounds[rIdx - 1];
                    const prevDates = (prevR.matches || []).map(pm => matchSchedules[pm.id]?.date || pm.defaultDateISO || prevR.dateISO).filter(Boolean).sort();
                    const prevEnd = prevDates[prevDates.length - 1] || prevR.dateISO || "";
                    roundReady = Boolean(prevEnd && gDate && prevEnd < gDate);
                }
                r.matches.forEach(m => {
                    resolveMatch(m, [], roundReady, r.dateISO || "");
                    const sl = matchSlots[m.id], w = matchWinners[m.id];
                    if (sl[0] && sl[1] && sl[0] !== "__BYE__" && sl[1] !== "__BYE__") {
                        if (table[sl[0]]) table[sl[0]].opponents.add(sl[1]);
                        if (table[sl[1]]) table[sl[1]].opponents.add(sl[0]);
                    }
                    if (w && sl[0] && sl[1]) {
                        const l = w === sl[0] ? sl[1] : sl[0];
                        if (table[w]) table[w].wins++;
                        if (l && l !== "__BYE__" && table[l]) table[l].losses++;
                    }
                });
            });

            const sorted = Object.values(table).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.wins - a.wins || a.losses - b.losses || a.seed - b.seed);
            swissStandings[g.id] = sorted;
            sorted.filter(row => row.wins >= g.winsToAdvance).forEach(row => stageAdvancers.push(row.uid));
        });

        // 2. GSL
        (tournament.deGroups || []).forEach(g => {
            g.matches.forEach(m => resolveMatch(m));
            (g.qualifierMatchIds || []).forEach(qId => {
                if (matchWinners[qId]) stageAdvancers.push(matchWinners[qId]);
            });
        });

        // 3. Round-Robin
        (tournament.rrGroups || []).forEach((g, gIdx) => {
            const gTeams = stage1Pool.slice(gIdx * g.size, (gIdx + 1) * g.size);
            const table = {};
            gTeams.forEach((p, idx) => { table[p.uid] = { uid: p.uid, seed: idx + 1, played: 0, wins: 0, losses: 0, points: 0 }; });
            g.rounds.forEach(r => r.matches.forEach(m => {
                resolveMatch(m, gTeams, true, r.dateISO || "");
                const sl = matchSlots[m.id], w = matchWinners[m.id];
                if (w && sl[0] && sl[1]) {
                    const l = w === sl[0] ? sl[1] : sl[0];
                    if (table[w]) { table[w].played++; table[w].wins++; table[w].points += 3; }
                    if (l && l !== "__BYE__" && table[l]) { table[l].played++; table[l].losses++; }
                }
            }));
            const sorted = Object.values(table).sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.seed - b.seed);
            rrStandings[g.id] = sorted;
            sorted.slice(0, g.advanceCount || 2).forEach(row => { if (row.played > 0) stageAdvancers.push(row.uid); });
        });

        // 4. Play-In
        if (tournament.playInStage) {
            tournament.playInStage.rounds.forEach(r => r.days.forEach(d => d.matches.forEach(m => resolveMatch(m, [], true, d.dateISO || ""))));
            (tournament.playInStage.qualifierMatchIds || []).forEach(qId => {
                if (matchWinners[qId]) stageAdvancers.push(matchWinners[qId]);
            });
        }

        // 5. Playoffs / Quali32 / Open Qualifier
        const roundsList = tournament.rounds || [];
        roundsList.forEach(r => {
            r.days.forEach(d => d.matches.forEach(m => {
                resolveMatch(m, [], true, d.dateISO || "");
                if (tournament.isQuali32 && r.id === "r32" && matchWinners[m.id]) {
                    r32WinnerSet.add(matchWinners[m.id]);
                }
            }));
        });

        const r32Winners = Array.from(r32WinnerSet);

        // 6. Qualifikanten für Folge-Turniere sammeln
        if (tournament.isDoubleElimQuali && tournament.deQualiMeta?.qualifierMatchIds) {
            tournament.deQualiMeta.qualifierMatchIds.forEach(qId => {
                if (matchWinners[qId]) stageAdvancers.push(matchWinners[qId]);
            });
        } else if (tournament.isQuali32) {
            (roundsList.find(r => r.id === "r16")?.days || []).flatMap(d => d.matches).forEach(m => {
                if (matchWinners[m.id]) stageAdvancers.push(matchWinners[m.id]);
            });
        } else if (tournament.playoffType === "open_qualifier" || tournament.isOpenQualifier) {
            const finalRound = roundsList[roundsList.length - 1];
            (finalRound?.days || []).flatMap(d => d.matches).forEach(m => {
                if (matchWinners[m.id]) stageAdvancers.push(matchWinners[m.id]);
            });
        } else if (!tournament.hasStage1 && !tournament.hasPlayIn && roundsList.length > 0) {
            const finalRound = roundsList[roundsList.length - 1];
            (finalRound.days || []).flatMap(d => d.matches).forEach(m => {
                if (matchWinners[m.id]) stageAdvancers.push(matchWinners[m.id]);
            });
        }

        return {
            participants,
            autoSlots,
            matchSlots,
            matchWinners,
            matchSchedules,
            defaultWins,
            swissStandings,
            rrStandings,
            stageAdvancers,
            r32Winners
        };
    }

    function getStage1ParticipantsRaw(t, participants) {
        if (!(t.hasStage1 && t.hasPlayoffs && Number(t.directInvites) > 0)) return participants;
        const cap = (t.groupCount || 1) * (t.groupSize || 16);
        const explicit = participants.filter(p => p.slotGroup === "stage1" || p.autoQualified);
        const untagged = participants.filter(p => !p.slotGroup && !p.autoQualified);
        return [...explicit, ...untagged].slice(0, cap);
    }

    function getPlayoffDirectParticipantsRaw(t, participants) {
        if (!(t.hasStage1 && t.hasPlayoffs && Number(t.directInvites) > 0)) return participants;
        const cap = (t.groupCount || 1) * (t.groupSize || 16);
        const explicitDirect = participants.filter(p => p.slotGroup === "playoffs_direct");
        const explicitStage1Count = participants.filter(p => p.slotGroup === "stage1" || p.autoQualified).length;
        const untagged = participants.filter(p => !p.slotGroup && !p.autoQualified);
        const remainingForStage1 = Math.max(0, cap - explicitStage1Count);
        return [...explicitDirect, ...untagged.slice(remainingForStage1)];
    }
    // ==================== TEILNEHMER-AUFLÖSUNG & SICHTBARKEIT ====================
    function getResolvedParticipant(uid, participants) {
        if (!uid) return null;
        if (uid === "__BYE__") {
            return { uid: "__BYE__", displayName: "Freilos (BYE)", icon: "", isBye: true, badgeText: "Freilos" };
        }
        const found = participants.find(p => p.uid === uid);
        if (!found) return null;
        if (found.type === "player") {
            const live = getPlayers().find(p => p.uid === found.playerUid || p.username === found.username);
            return { ...found, displayName: live ? getTeamName(live) : found.name, icon: "🛡️", badgeText: `Spieler (${found.username})` };
        }
        if (found.type === "manual") {
            return { ...found, displayName: found.name, icon: "", badgeText: "Manuelles Team" };
        }
        return { ...found, displayName: found.name, icon: "", badgeText: found.rank ? `VRS #${found.rank} (${found.points} Pkt)` : "VRS-Team" };
    }

    function formatParticipantLabel(info) {
        if (!info) return "";
        return `${info.icon ? `${info.icon} ` : ""}${esc(info.displayName)}`;
    }

    function getTournamentVisibilityInfo(t, invData = null) {
        const bounds = getTournamentDateBounds(t);
        const revealDate = addDaysISO(bounds.start, -7);
        const gDate = currentGameDate();
        const canSeeLineupAndBracket = isAdmin() || gDate >= revealDate;

        const data = invData || computeAllCircuitsInviteData();
        const circuit = data.tournamentToCircuit.get(t.id) || null;
        const user = getCurrentUser();
        let myLowRankNotice = null;
        let myHigherTierNotice = null;
        let myInvitedNotice = null;

        if (!isAdmin() && user?.role === "player" && circuit && !canSeeLineupAndBracket && t.useAutoInvites !== false) {
            const myPlayer = getPlayers().find(p => p.uid === user.uid);
            const myPts = Number(myPlayer?.points) || 0;
            const compIds = new Set(circuit.members.map(m => m.id));
            const resp = myPlayer ? getPlayerResponseForChain(myPlayer, compIds, circuit.chainRootId) : null;
            const assigned = circuit.playerTierAssignment.get(user.uid) || null;

            if (circuit.phase === "open") {
                if (resp?.status === "declined") {
                    myHigherTierNotice = "Du hast die Einladung für diesen Turnier-Verbund abgelehnt.";
                } else if (assigned) {
                    if (assigned.tournament.id === t.id) {
                        myInvitedNotice = resp?.status === "accepted"
                            ? `Dein Team ist für „${assigned.shortLabel}“ bestätigt.`
                            : `Dein Team hat eine offene Turnier-Einladung für „${assigned.shortLabel}“ im Postfach (Managing → E-Mails)!`;
                    } else {
                        const tLevel = circuit.members.findIndex(m => m.id === t.id);
                        const aLevel = circuit.members.findIndex(m => m.id === assigned.tournament.id);
                        if (aLevel >= 0 && aLevel < tLevel) {
                            myHigherTierNotice = `Dein Team (${myPts} Pkt.) ist durch das VRS-Ranking bereits für ein höheres Turnier im Verbund (${assigned.tournament.name}) eingeladen!`;
                        } else {
                            const tTiers = Object.values(data.tierResultsByTournament.get(t.id) || {});
                            const lowestTTier = tTiers[tTiers.length - 1];
                            if (lowestTTier) {
                                const others = circuit.activeCandidates.filter(c => c.playerUid !== user.uid);
                                const needed = computeMinPointsNeededForTier(others, lowestTTier.hurdles);
                                myLowRankNotice = needed !== null
                                    ? `Das VRS-Ranking deines Teams (${myPts} Pkt.) ist zu niedrig, um sich direkt für dieses Turnier anzumelden (aktuell mindestens ${needed} Pkt. erforderlich).`
                                    : `Das VRS-Ranking deines Teams (${myPts} Pkt.) ist für dieses Turnier zu niedrig.`;
                            }
                        }
                    }
                } else {
                    const tTiers = Object.values(data.tierResultsByTournament.get(t.id) || {});
                    const lowestTTier = tTiers[tTiers.length - 1];
                    if (lowestTTier) {
                        const others = circuit.activeCandidates.filter(c => c.playerUid !== user.uid);
                        const needed = computeMinPointsNeededForTier(others, lowestTTier.hurdles);
                        myLowRankNotice = needed !== null
                            ? `Das VRS-Ranking deines Teams (${myPts} Pkt.) ist zu niedrig, um sich für dieses Turnier anzumelden (aktuell mindestens ${needed} Pkt. erforderlich).`
                            : `Das VRS-Ranking deines Teams (${myPts} Pkt.) ist zu niedrig, um sich für dieses Turnier anzumelden.`;
                    }
                }
            }
        }

        return {
            canSeeLineupAndBracket,
            revealDate,
            bounds,
            circuit,
            myLowRankNotice,
            myHigherTierNotice,
            myInvitedNotice
        };
    }

    // ==================== RUNDEN-DEDUPLIZIERUNG & MATCH-SLOTS ====================
    function getScopeMatchIds(t, matchId) {
        if (!t) return [matchId];

        for (const r of (t.rounds || [])) {
            const ids = (r.days || []).flatMap(d => (d.matches || []).map(m => m.id));
            if (ids.includes(matchId)) return ids;
        }

        for (let gIdx = 0; gIdx < (t.swissGroups || []).length; gIdx++) {
            const g = t.swissGroups[gIdx];
            for (let rIdx = 0; rIdx < (g.rounds || []).length; rIdx++) {
                const ids = (g.rounds[rIdx].matches || []).map(m => m.id);
                if (ids.includes(matchId)) {
                    if (rIdx === 0) {
                        return (t.swissGroups || []).flatMap(sg => (sg.rounds?.[0]?.matches || []).map(m => m.id));
                    }
                    return ids;
                }
            }
        }

        for (const g of (t.deGroups || [])) {
            const found = (g.matches || []).find(m => m.id === matchId);
            if (found) {
                if (found.round === "Opening") {
                    return (t.deGroups || []).flatMap(dg => (dg.matches || []).filter(x => x.round === "Opening").map(x => x.id));
                }
                return (g.matches || []).filter(x => x.round === found.round).map(x => x.id);
            }
        }

        for (const g of (t.rrGroups || [])) {
            for (let rIdx = 0; rIdx < (g.rounds || []).length; rIdx++) {
                const ids = (g.rounds[rIdx].matches || []).map(m => m.id);
                if (ids.includes(matchId)) {
                    if (rIdx === 0) {
                        return (t.rrGroups || []).flatMap(rg => (rg.rounds?.[0]?.matches || []).map(m => m.id));
                    }
                    return ids;
                }
            }
        }

        if (t.playInStage) {
            const ids = (t.playInStage.rounds || []).flatMap(r => (r.days || []).flatMap(d => (d.matches || []).map(m => m.id)));
            if (ids.includes(matchId)) return ids;
        }

        return [matchId];
    }

    function getUsedUidsInMatchScope(t, matchId, currentSlotIdx, graph) {
        const used = new Set();
        const scopeIds = getScopeMatchIds(t, matchId);
        scopeIds.forEach(otherId => {
            const slots = graph.matchSlots[otherId] || [null, null];
            if (otherId !== matchId) {
                if (slots[0] && slots[0] !== "__BYE__") used.add(slots[0]);
                if (slots[1] && slots[1] !== "__BYE__") used.add(slots[1]);
            } else {
                const otherSlot = slots[1 - currentSlotIdx];
                if (otherSlot && otherSlot !== "__BYE__") used.add(otherSlot);
            }
        });
        return used;
    }

    function getAllowedParticipantsForMatch(t, match, slotIdx, graph, currentAssignedUid) {
        let pool = graph.participants;
        if (t?.isQuali32 && match.id.startsWith("r16-")) {
            const winSet = new Set(graph.r32Winners || []);
            pool = pool.filter(p => winSet.has(p.uid) || p.uid === currentAssignedUid);
        }
        const used = getUsedUidsInMatchScope(t, match.id, slotIdx, graph);
        return pool.filter(p => !used.has(p.uid) || p.uid === currentAssignedUid);
    }

    function buildMatchSlotMarkup(tId, match, slotIdx, assignedUid, winnerUid, graph, admin, preferredUids = []) {
        const participants = graph.participants;
        const resolved = getResolvedParticipant(assignedUid, participants);
        const isWin = Boolean(winnerUid && assignedUid && winnerUid === assignedUid);
        const isLoss = Boolean(winnerUid && assignedUid && assignedUid !== "__BYE__" && winnerUid !== assignedUid);

        if (!admin) {
            if (!resolved) {
                const hint = match.slotHints?.[slotIdx] ? `TBD (${match.slotHints[slotIdx]})` : "TBD";
                return `<div class="match-team-row tbd"><span>${esc(hint)}</span><span>–</span></div>`;
            }
            if (resolved.isBye) {
                return `<div class="match-team-row tbd"><span>— Freilos (BYE) —</span><span>W/O</span></div>`;
            }
            return `<div class="match-team-row ${isWin ? "winner" : (isLoss ? "loser" : "")}"><span>${formatParticipantLabel(resolved)}</span><span style="font-size:.72rem;">${isWin ? "Sieger" : (resolved.type === "player" ? "Spieler" : "VRS")}</span></div>`;
        }

        const tObj = getTournamentById(tId);
        const allowed = getAllowedParticipantsForMatch(tObj, match, slotIdx, graph, assignedUid);
        const prefSet = new Set(preferredUids.filter(Boolean));
        const sorted = [...allowed].sort((a, b) => (prefSet.has(a.uid) ? 0 : 1) - (prefSet.has(b.uid) ? 0 : 1));
        const options = sorted.map(p => {
            const info = getResolvedParticipant(p.uid, participants);
            return `<option value="${esc(p.uid)}" ${p.uid === assignedUid ? "selected" : ""}>${prefSet.has(p.uid) ? "★ " : ""}${formatParticipantLabel(info)}</option>`;
        }).join("");
        const tbd = match.slotHints?.[slotIdx] ? `-- TBD (${match.slotHints[slotIdx]}) --` : "-- TBD (Offen) --";
        const canWin = Boolean(assignedUid && assignedUid !== "__BYE__");

        return `
            <div class="match-admin-slot">
                <select class="match-team-select ${isWin ? "is-winner" : ""}" data-action="set-match-slot" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" data-slot="${slotIdx}">
                    <option value="">${esc(tbd)}</option>
                    <option value="__BYE__" ${assignedUid === "__BYE__" ? "selected" : ""}>— Freilos (BYE) —</option>
                    ${options}
                </select>
                <button type="button" class="btn-winner-toggle ${isWin ? "active" : ""}" data-action="toggle-winner" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" data-uid="${esc(assignedUid || "")}" ${!canWin ? "disabled" : ""} title="Als Sieger festlegen">🏆</button>
            </div>
        `;
    }

    function renderMatchCard(tId, match, defaultDateLabel, matchFormat, graph, admin, preferred = [], dayEdited = false) {
        const slots = graph.matchSlots[match.id] || [null, null];
        const winUid = graph.matchWinners[match.id] || null;
        const isDefWin = Boolean(graph.defaultWins?.[match.id]);
        const fmt = String(matchFormat || match.format || "BO3").toUpperCase();
        const fmtCls = fmt === "BO5" ? "bo5" : "bo3";

        const sched = graph.matchSchedules?.[match.id] || {};
        const matchDateISO = sched.date || match.defaultDateISO || "";
        const matchTime = sched.time || match.time || "";
        const tzKey = getTimezone?.() || "europe";
        const conv = convertFromBaseTimezone(matchDateISO, matchTime, tzKey);

        let scheduleMarkup = "";
        if (admin) {
            const previewHtml = (tzKey !== "europe" && matchTime)
                ? `<div class="match-tz-preview">${esc(conv.tzLabel)}: ${esc(formatDateDE(conv.dateISO))} · ${esc(conv.timeStr)}</div>`
                : "";
            scheduleMarkup = `
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <div class="match-admin-schedule">
                        <input type="date" class="match-date-input" data-action="set-match-date" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" value="${esc(matchDateISO)}" title="Spieldatum (Basis: Europa UTC+1)">
                        <input type="time" class="match-time-input" data-action="set-match-time" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" value="${esc(matchTime)}" title="Spielzeit (Basis: Europa UTC+1)">
                    </div>
                    ${previewHtml}
                </div>
            `;
        } else {
            const displayDate = (sched.date || (matchTime && tzKey !== "europe"))
                ? formatDateDE(conv.dateISO)
                : (dayEdited && defaultDateLabel ? defaultDateLabel : (conv.dateISO ? formatDateDE(conv.dateISO) : defaultDateLabel));
            const timePart = conv.timeStr ? ` · ${esc(conv.timeStr)} (${esc(conv.tzLabel)})` : "";
            scheduleMarkup = `<span class="match-date-pill">${esc(displayDate)}${timePart}</span>`;
        }

        return `
            <div class="match-card">
                <div class="match-card-header">
                    <div class="match-card-title">
                        <strong>${esc(match.label)}</strong>
                        <span class="match-format-pill ${fmtCls}">${esc(fmt)}</span>
                        ${isDefWin ? `<span class="oq-defwin-badge">W/O Def-Win</span>` : ""}
                    </div>
                    <div class="match-schedule-info">${scheduleMarkup}</div>
                </div>
                ${buildMatchSlotMarkup(tId, match, 0, slots[0], winUid, graph, admin, preferred)}
                ${buildMatchSlotMarkup(tId, match, 1, slots[1], winUid, graph, admin, preferred)}
            </div>
        `;
    }

    // ==================== RO32 + RO16 GETRENNT (OHNE VERKETTETEN BAUM) ====================
    function renderQuali32Bracket(t, graph, admin) {
        const r32 = t.rounds.find(r => r.id === "r32");
        const r16 = t.rounds.find(r => r.id === "r16");
        if (!r32 || !r16) return "";

        const r32DaysHtml = r32.days.map((d, dIdx) => `
            <div class="round-day-card">
                <div class="round-day-header">
                    <strong>${esc(d.dateLabel)}</strong>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <span>${d.matches.length} Matches</span>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-date-label" data-path-type="round-day" data-tournament-id="${esc(t.id)}" data-target-id="${esc(r32.id)}" data-sub-index="${dIdx}" data-current-val="${esc(d.dateLabel)}" title="Datum bearbeiten">✏️</button>` : ""}
                    </div>
                </div>
                ${d.matches.map(m => renderMatchCard(t.id, m, d.dateLabel, m.format || r32.defaultFormat, graph, admin, [], d.dateEdited)).join("")}
            </div>
        `).join("");

        const r16Flat = r16.days.flatMap(d => d.matches.map(m => ({ m, d })));
        const hasNext = Boolean(t.nextTournamentId && getTournamentById(t.nextTournamentId));

        const r16RowsHtml = r16Flat.map((item, idx) => {
            const winUid = graph.matchWinners[item.m.id];
            const winInfo = winUid ? getResolvedParticipant(winUid, graph.participants) : null;
            const pillTxt = winInfo
                ? `✅ ${formatParticipantLabel(winInfo)}<br><span style="font-weight:400;">Qualifiziert (Top 8)</span>`
                : `Top 8 Platz #${idx + 1}<br><span style="font-weight:400; color:#fde68a;">→ Weiter</span>`;
            const pill = hasNext
                ? `<button type="button" class="lan-qual-pill ${winInfo ? "qualified" : ""}" data-action="open-tournament" data-tournament-id="${esc(t.nextTournamentId)}">${pillTxt}</button>`
                : `<div class="lan-qual-pill ${winInfo ? "qualified" : ""}" style="cursor:default;">${pillTxt}</div>`;

            return `
                <div class="quali32-r16-row">
                    <div>${renderMatchCard(t.id, item.m, item.d.dateLabel, item.m.format || r16.defaultFormat, graph, admin, graph.r32Winners || [], item.d.dateEdited)}</div>
                    <div class="quali32-r16-qual">${pill}</div>
                </div>
            `;
        }).join("");

        return `
            ${admin ? `<div class="bracket-toolbar"><span class="muted">Admin: In RO16 stehen ausschließlich die Gewinner der Round of 32 zur Auswahl.</span><div class="news-form-actions" style="margin-top:0;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten verteilen</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 RO32 setzen</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-r16-from-r32" data-tournament-id="${esc(t.id)}" ${(graph.r32Winners || []).length === 0 ? "disabled" : ""}>⚡ RO32-Sieger in RO16 paaren</button><button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Leeren</button></div></div>` : ""}

            <div class="quali32-section">
                <div class="quali32-section-head">
                    <h3>⚔️ Round of 32 (16 Matches · ${esc(r32.defaultFormat || "BO3")})</h3>
                    <span class="muted">${(graph.r32Winners || []).length} / 16 Sieger ermittelt</span>
                </div>
                <div class="round-days-grid">${r32DaysHtml}</div>
            </div>

            <div class="quali32-section">
                <div class="quali32-section-head">
                    <h3>🔥 Round of 16 (8 Matches → Top 8 Quali · ${esc(r16.defaultFormat || "BO3")})</h3>
                    <span class="muted">Eigenständige Paarungen aus den RO32-Siegern</span>
                </div>
                <div class="quali32-r16-list">${r16RowsHtml}</div>
            </div>
        `;
    }

    function renderDoubleElimQualiBracket(t, graph, admin) {
        const findRound = (id) => (t.rounds || []).find(r => r.id === id);
        const ubR1 = findRound("ub-r1"), ubR2 = findRound("ub-r2"), lbR1 = findRound("lb-r1"), lbR2 = findRound("lb-r2");
        if (!ubR1 || !ubR2 || !lbR1 || !lbR2) return "";

        const flat = (r) => r.days.flatMap(d => d.matches.map(m => ({ m, d })));
        const ub1 = flat(ubR1), ub2 = flat(ubR2), lb1 = flat(lbR1), lb2 = flat(lbR2);
        const hasNext = Boolean(t.nextTournamentId && getTournamentById(t.nextTournamentId));

        const makeQualPill = (matchId, slotNum) => {
            const winUid = graph.matchWinners[matchId];
            const winInfo = winUid ? getResolvedParticipant(winUid, graph.participants) : null;
            const txt = winInfo
                ? `✅ ${formatParticipantLabel(winInfo)}<br><span style="font-weight:400;">Qualifiziert (#${slotNum})</span>`
                : `Qualifikant #${slotNum}<br><span style="font-weight:400; color:#fde68a;">${hasNext ? "→ Zum Folgeturnier" : "Weiter"}</span>`;
            return hasNext
                ? `<button type="button" class="lan-qual-pill ${winInfo ? "qualified" : ""}" data-action="open-tournament" data-tournament-id="${esc(t.nextTournamentId)}">${txt}</button>`
                : `<div class="lan-qual-pill ${winInfo ? "qualified" : ""}" style="cursor:default;">${txt}</div>`;
        };

        const ubPairs = ub2.map((it, idx) => {
            const l = ub1[idx * 2], r = ub1[idx * 2 + 1];
            const feed = [...(graph.matchSlots[l.m.id] || []), ...(graph.matchSlots[r.m.id] || [])].filter(Boolean);
            return `
                <div class="bracket-pair">
                    <div class="bracket-pair-r32">
                        ${renderMatchCard(t.id, l.m, l.d.dateLabel, l.m.format || ubR1.defaultFormat, graph, admin, [], l.d.dateEdited)}
                        ${renderMatchCard(t.id, r.m, r.d.dateLabel, r.m.format || ubR1.defaultFormat, graph, admin, [], r.d.dateEdited)}
                    </div>
                    <div class="bracket-connector"></div>
                    <div class="bracket-pair-r16">${renderMatchCard(t.id, it.m, it.d.dateLabel, it.m.format || ubR2.defaultFormat, graph, admin, feed, it.d.dateEdited)}</div>
                    <div class="bracket-lan-cell">${makeQualPill(it.m.id, idx + 1)}</div>
                </div>
            `;
        }).join("");

        const lbPairs = lb2.map((it, idx) => {
            const l = lb1[idx];
            const feed = [...(graph.matchSlots[l.m.id] || []), ...(graph.matchSlots[ub2[3 - idx].m.id] || [])].filter(Boolean);
            return `
                <div class="bracket-pair">
                    <div class="bracket-pair-r32">${renderMatchCard(t.id, l.m, l.d.dateLabel, l.m.format || lbR1.defaultFormat, graph, admin, [], l.d.dateEdited)}</div>
                    <div class="bracket-lan-cell" style="padding-left:0;"></div>
                    <div class="bracket-pair-r16">${renderMatchCard(t.id, it.m, it.d.dateLabel, it.m.format || lbR2.defaultFormat, graph, admin, feed, it.d.dateEdited)}</div>
                    <div class="bracket-lan-cell">${makeQualPill(it.m.id, idx + 5)}</div>
                </div>
            `;
        }).join("");

        return `
            ${admin ? `<div class="bracket-toolbar"><span class="muted">Admin: 16 Teams in UB Runde 1 setzen &amp; Sieger per 🏆 festlegen.</span><div class="news-form-actions" style="margin-top:0;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten verteilen</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teams in UB R1 setzen</button><button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Zurücksetzen</button></div></div>` : ""}
            <h3 style="margin:10px 0 8px;">⚔️ Upper Bracket</h3>
            <div class="bracket-scroll"><div class="bracket-board">
                <div class="bracket-col-headers">
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="ub-r1">UB Runde 1 (8)</div><div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="ub-r2">UB Quali-Runde (4)</div>
                    <div class="bracket-col-head">Upper Qualifikanten (4)</div>
                </div>${ubPairs}
            </div></div>
            <h3 style="margin:18px 0 8px;">🔥 Lower Bracket</h3>
            <div class="bracket-scroll"><div class="bracket-board">
                <div class="bracket-col-headers">
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="lb-r1">LB Runde 1 (4)</div><div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="lb-r2">LB Quali-Runde (4)</div>
                    <div class="bracket-col-head">Lower Qualifikanten (4)</div>
                </div>${lbPairs}
            </div></div>
        `;
    }

    function renderPlayoffsBracket(t, graph, admin) {
        const rounds = t.rounds || [];
        if (rounds.length === 0) return "";
        const flatRound = (r) => r.days.flatMap(d => d.matches.map(m => ({ m, d, fmt: m.format || r.defaultFormat || t.defaultFormat || "BO3" })));

        const headers = rounds.map((r, i) => {
            const list = flatRound(r);
            const icon = i === rounds.length - 1 ? "🏆" : (i === rounds.length - 2 ? "🔥" : "⚔️");
            const d0 = r.days[0]?.dateLabel || "", d1 = r.days[r.days.length - 1]?.dateLabel || "";
            return `<div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="${esc(r.id)}">${icon} ${esc(r.name)} (${list.length} · ${esc(r.defaultFormat || "BO3")})<small>${esc(d0 === d1 ? d0 : `${d0} – ${d1}`)}</small></div>${i < rounds.length - 1 ? "<div></div>" : ""}`;
        }).join("");

        const cols = rounds.map((r, rIdx) => {
            const flat = flatRound(r);
            const isFirst = rIdx === 0, isFinal = rIdx === rounds.length - 1;
            const cards = flat.map(it => {
                const pref = Array.isArray(it.m.fromMatches) ? [...(graph.matchSlots[it.m.fromMatches[0]] || []), ...(graph.matchSlots[it.m.fromMatches[1]] || [])].filter(Boolean) : [];
                const card = renderMatchCard(t.id, it.m, it.d.dateLabel, it.fmt, graph, admin, pref, it.d.dateEdited);
                return (isFirst && t.playoffSize !== 6) ? card : `<div class="classic-round-slot">${card}</div>`;
            }).join("");
            const conn = isFinal ? "" : `<div class="classic-col-conn">${Array.from({ length: t.playoffSize === 6 && rIdx === 0 ? 2 : Math.max(1, flat.length / 2) }, () => '<div class="bracket-connector"></div>').join("")}</div>`;
            return `<div class="classic-col-round ${isFinal ? "classic-col-final" : ""}">${cards}</div>${conn}`;
        }).join("");

        const finalMId = rounds[rounds.length - 1]?.days?.[0]?.matches?.[0]?.id;
        const champUid = finalMId ? graph.matchWinners[finalMId] : null;
        const champ = champUid ? getResolvedParticipant(champUid, graph.participants) : null;
        const prize1 = t.prizeDistribution?.[0]?.amount;
        const prizeLbl = prize1 ? `${prize1.toLocaleString("de-DE")} $ Preisgeld` : (t.prizePoolTotal ? `${t.prizePoolTotal.toLocaleString("de-DE")} $ Preispool` : "Turniersieger");

        const advAction = (t.hasStage1 || t.hasPlayIn)
            ? `<button type="button" class="btn btn-secondary btn-small" data-action="fill-playoffs-from-groups" data-tournament-id="${esc(t.id)}">⚡ Qualifizierte Teams in Playoffs setzen</button>`
            : (t.qualifiedFrom
                ? `<button type="button" class="btn btn-secondary btn-small" data-action="sync-predecessor-qf" data-tournament-id="${esc(t.id)}">🔄 Qualifizierte Teams übernehmen</button>`
                : `<button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer in Runde 1 setzen</button>`);

        return `
            ${admin ? `<div class="bracket-toolbar"><span class="muted">Admin: Sieger per 🏆 festlegen.</span><div class="news-form-actions" style="margin-top:0;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Standard-Zeiten verteilen</button>${advAction}<button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Zurücksetzen</button></div></div>` : ""}
            <div class="bracket-scroll"><div class="classic-bracket ${rounds.length >= 4 ? "is-16" : ""}">
                <div class="classic-col-headers ${rounds.length >= 4 ? "is-16" : ""}">${headers}<div class="bracket-col-head">🥇 Sieger<small>${esc(t.prizePoolTotal ? `${t.prizePoolTotal.toLocaleString("de-DE")} $ Pool` : t.onlineDates)}</small></div></div>
                <div class="classic-bracket-body ${rounds.length >= 4 ? "is-16" : ""}">${cols}<div class="classic-col-champ"><div class="champion-box"><small>🏆 ${champ ? "Champion · 1. Platz" : "Turniersieger"}</small><strong>${champ ? formatParticipantLabel(champ) : "TBD"}</strong><span>${esc(prizeLbl)}</span></div></div></div>
            </div></div>
        `;
    }

    // ==================== OPEN QUALIFIER (8 - 512 TEILNEHMER + BYE / DEF-WIN) ====================
    function renderOpenQualifierMatchCard(t, match, dayDateLabel, graph, admin) {
        const slots = graph.matchSlots[match.id] || [null, null];
        const winUid = graph.matchWinners[match.id] || null;
        const isDefWin = Boolean(graph.defaultWins?.[match.id]);

        const sched = graph.matchSchedules?.[match.id] || {};
        const matchDateISO = sched.date || match.defaultDateISO || "";
        const matchTime = sched.time || match.time || "";
        const tzKey = getTimezone?.() || "europe";
        const conv = convertFromBaseTimezone(matchDateISO, matchTime, tzKey);
        const timeBadge = conv.timeStr ? `${conv.timeStr}` : dayDateLabel;

        const renderSlot = (slotIdx) => {
            const uid = slots[slotIdx];
            const info = getResolvedParticipant(uid, graph.participants);
            const isWin = Boolean(winUid && uid && winUid === uid);
            const isLoss = Boolean(winUid && uid && uid !== "__BYE__" && winUid !== uid);
            const cls = isWin ? "is-winner" : (isLoss ? "is-loser" : (info?.isBye ? "is-bye" : (info ? "is-assigned" : "")));
            const labelText = info ? (info.isBye ? "— Freilos (BYE) —" : formatParticipantLabel(info)) : "TBD / Frei";

            if (!admin) {
                return `<div class="oq-slot-row"><div class="oq-slot-btn ${cls}" style="cursor:default;">${labelText}</div></div>`;
            }

            const canWin = Boolean(uid && uid !== "__BYE__");
            return `
                <div class="oq-slot-row">
                    <button type="button" class="oq-slot-btn ${cls}" data-action="open-oq-slot-picker" data-tournament-id="${esc(t.id)}" data-match-id="${esc(match.id)}" data-slot="${slotIdx}" title="Team oder Freilos (BYE) wählen">${labelText}</button>
                    <button type="button" class="oq-defwin-btn ${isWin && isDefWin ? "active" : ""}" data-action="toggle-defwin" data-tournament-id="${esc(t.id)}" data-match-id="${esc(match.id)}" data-uid="${esc(uid || "")}" ${!canWin ? "disabled" : ""} title="Default Win (W/O) ohne Gegner / Aufgabe">W/O</button>
                    <button type="button" class="btn-winner-toggle ${isWin && !isDefWin ? "active" : ""}" style="width:24px; height:24px; font-size:.75rem;" data-action="toggle-winner" data-tournament-id="${esc(t.id)}" data-match-id="${esc(match.id)}" data-uid="${esc(uid || "")}" ${!canWin ? "disabled" : ""} title="Regulärer Sieg">🏆</button>
                </div>
            `;
        };

        return `
            <div class="oq-match-card">
                <div class="oq-match-head">
                    <span><strong>${esc(match.label)}</strong> · ${esc(match.format || "BO1")}</span>
                    <span>${isDefWin ? `<span class="oq-defwin-badge">Def-Win</span>` : esc(timeBadge)}</span>
                </div>
                ${renderSlot(0)}
                ${renderSlot(1)}
            </div>
        `;
    }

    function renderOpenQualifierBracket(t, graph, admin) {
        const rounds = t.rounds || [];
        if (rounds.length === 0) return "";
        const size = Number(t.playoffSize) || 64;
        const r0Matches = rounds[0]?.days?.flatMap(d => d.matches) || [];
        const sliceMatchCount = 32; // 32 R1-Matches = 64er Ast
        const numSlices = r0Matches.length > sliceMatchCount ? Math.ceil(r0Matches.length / sliceMatchCount) : 1;

        let sectionTabsHtml = "";
        if (numSlices > 1) {
            const btns = [`<button type="button" class="oq-section-btn ${activeOqSection === "all" ? "active" : ""}" data-action="oq-section" data-section="all">🌳 Gesamter Baum (${size})</button>`];
            for (let s = 0; s < numSlices; s++) {
                btns.push(`<button type="button" class="oq-section-btn ${activeOqSection === `slice-${s}` ? "active" : ""}" data-action="oq-section" data-section="slice-${s}">Ast ${s + 1} (#${s * 64 + 1}–#${(s + 1) * 64})</button>`);
            }
            if (rounds.length > 3) {
                btns.push(`<button type="button" class="oq-section-btn ${activeOqSection === "finals" ? "active" : ""}" data-action="oq-section" data-section="finals">Final-Runden</button>`);
            }
            sectionTabsHtml = `<div class="oq-section-tabs">${btns.join("")}</div>`;
        } else {
            activeOqSection = "all";
        }

        // Welche Runden & Match-Indizes werden im gewählten Ausschnitt angezeigt?
        let visibleRounds = rounds.map((r, rIdx) => ({
            r,
            rIdx,
            items: r.days.flatMap(d => d.matches.map(m => ({ m, d })))
        }));

        if (activeOqSection === "finals" && rounds.length > 3) {
            const startIdx = Math.max(0, rounds.length - 4);
            visibleRounds = visibleRounds.slice(startIdx);
        } else if (activeOqSection.startsWith("slice-")) {
            const sIdx = Number(activeOqSection.split("-")[1]) || 0;
            visibleRounds = visibleRounds.map((vr, idx) => {
                const factor = Math.pow(2, idx);
                const countInSlice = sliceMatchCount / factor;
                if (countInSlice < 1) return null;
                const start = sIdx * countInSlice;
                return { ...vr, items: vr.items.slice(start, start + countInSlice) };
            }).filter(Boolean);
        }

        const firstRoundCount = visibleRounds[0]?.items?.length || 1;
        const bodyHeight = Math.max(380, firstRoundCount * (admin ? 92 : 76));

        const headersHtml = visibleRounds.map((vr, idx) => `
            <div class="oq-head-cell">${esc(vr.r.name)} (${vr.items.length})<small>${esc(vr.r.defaultFormat || "BO1")}</small></div>
            ${idx < visibleRounds.length - 1 ? `<div class="oq-head-spacer"></div>` : ""}
        `).join("");

        const showQualCol = activeOqSection === "all" || activeOqSection === "finals";
        const lastVisibleRound = visibleRounds[visibleRounds.length - 1];
        const hasNext = Boolean(t.nextTournamentId && getTournamentById(t.nextTournamentId));

        const colsHtml = visibleRounds.map((vr, idx) => {
            const isLast = idx === visibleRounds.length - 1;
            const cards = vr.items.map(it => renderOpenQualifierMatchCard(t, it.m, it.d.dateLabel, graph, admin)).join("");
            const connCount = Math.max(1, Math.floor(vr.items.length / 2));
            const connHtml = isLast ? "" : `<div class="oq-col-conn">${Array.from({ length: connCount }, () => '<div class="bracket-connector"></div>').join("")}</div>`;
            return `<div class="oq-col-round">${cards}</div>${connHtml}`;
        }).join("");

        let qualColHtml = "";
        if (showQualCol && lastVisibleRound) {
            const qPills = lastVisibleRound.items.map((it, idx) => {
                const winUid = graph.matchWinners[it.m.id];
                const winInfo = winUid ? getResolvedParticipant(winUid, graph.participants) : null;
                const txt = winInfo
                    ? `✅ ${formatParticipantLabel(winInfo)}`
                    : `Qualifikant #${idx + 1}`;
                const inner = hasNext
                    ? `<button type="button" class="lan-qual-pill ${winInfo ? "qualified" : ""}" data-action="open-tournament" data-tournament-id="${esc(t.nextTournamentId)}">${txt}</button>`
                    : `<div class="lan-qual-pill ${winInfo ? "qualified" : ""}" style="cursor:default;">${txt}</div>`;
                return `<div class="oq-qual-slot">${inner}</div>`;
            }).join("");
            qualColHtml = `<div class="oq-qual-col">${qPills}</div>`;
        }

        return `
            ${admin ? `
                <div class="bracket-toolbar">
                    <span class="muted">Admin: Klicke auf einen Slot für Team/Freilos (BYE) oder nutze <strong>W/O</strong> für Default Win.</span>
                    <div class="news-form-actions" style="margin-top:0;">
                        <button type="button" class="btn btn-secondary btn-small" data-action="oq-seed-r1" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teams &amp; Freilose (BYEs) in R1 setzen</button>
                        <button type="button" class="btn btn-accent btn-small" data-action="oq-autoresolve-byes" data-tournament-id="${esc(t.id)}">⚡ Freilose als Def-Win werten</button>
                        <button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button>
                        <button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Leeren</button>
                    </div>
                </div>
            ` : ""}
            ${sectionTabsHtml}
            <div class="oq-bracket-scroll">
                <div class="oq-bracket-wrap">
                    <div class="oq-headers-row">
                        ${headersHtml}
                        ${showQualCol ? `<div class="oq-head-cell oq-head-qual">🏆 Qualifiziert (${lastVisibleRound?.items?.length || 0})</div>` : ""}
                    </div>
                    <div class="oq-bracket-body" style="min-height:${bodyHeight}px;">
                        ${colsHtml}
                        ${qualColHtml}
                    </div>
                </div>
            </div>
        `;
    }

    function renderSwissTab(t, graph, admin) {
        const makeOutcomeBox = (title, cls, teams, expectedCount) => {
            const slots = Array.from({ length: expectedCount }, (_, i) => {
                const row = teams[i];
                const info = row ? getResolvedParticipant(row.uid, graph.participants) : null;
                return info ? `<div class="swiss-outcome-team">${formatParticipantLabel(info)}</div>` : `<div class="swiss-outcome-team empty">TBD</div>`;
            }).join("");
            return `<div class="swiss-outcome-box ${cls}"><div class="swiss-outcome-title">${esc(title)}</div>${slots}</div>`;
        };

        const renderBucket = (label, hint, cls, matches, r) => `
            <div class="swiss-bucket ${cls}">
                <div class="swiss-bucket-head"><strong>${esc(label)}</strong><span>${esc(hint)}</span></div>
                ${matches.map(m => renderMatchCard(t.id, m, r.dateLabel, m.format, graph, admin, [], r.dateEdited)).join("")}
            </div>
        `;

        return (t.swissGroups || []).map(g => {
            const standings = graph.swissStandings[g.id] || [];
            const byRecord = (w, l) => standings.filter(s => s.wins === w && s.losses === l);
            const r = g.rounds || [];

            const makeHead = (roundObj, rIdx) => `
                <div class="swiss-col-head">
                    <div><strong>${esc(roundObj.name)}</strong><small>${esc(roundObj.dateLabel)}</small></div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-date-label" data-path-type="swiss-round" data-tournament-id="${esc(t.id)}" data-target-id="${esc(g.id)}" data-sub-index="${rIdx}" data-current-val="${esc(roundObj.dateLabel)}" title="Datum bearbeiten">✏️</button>` : ""}
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="pair-swiss-round" data-tournament-id="${esc(t.id)}" data-group-id="${esc(g.id)}" data-round-index="${rIdx}" ${graph.participants.length < 2 ? "disabled" : ""} title="Teams nach Bilanz paaren">⚡</button>` : ""}
                    </div>
                </div>
            `;

            const colsHtml = g.teamCount >= 16 && r.length >= 5
                ? `
                    <div class="swiss-col">${makeHead(r[0], 0)}${renderBucket("0:0", "8 Matches", "", r[0].matches.slice(0, 8), r[0])}</div>
                    <div class="swiss-col">${makeHead(r[1], 1)}${renderBucket("1:0", "↗ Sieger R1", "bucket-win", r[1].matches.slice(0, 4), r[1])}${renderBucket("0:1", "↘ Verlierer R1", "bucket-loss", r[1].matches.slice(4, 8), r[1])}</div>
                    <div class="swiss-col">${makeHead(r[2], 2)}${renderBucket("2:0", "↗ Quali-Matches", "bucket-win", r[2].matches.slice(0, 2), r[2])}${renderBucket("1:1", "Mitte", "", r[2].matches.slice(2, 6), r[2])}${renderBucket("0:2", "↘ K.-o.-Matches", "bucket-loss", r[2].matches.slice(6, 8), r[2])}</div>
                    <div class="swiss-col">${makeHead(r[3], 3)}${makeOutcomeBox("✅ 3:0 Weiter", "qualified", byRecord(3, 0), 2)}${renderBucket("2:1", "↗ Quali-Matches", "bucket-win", r[3].matches.slice(0, 3), r[3])}${renderBucket("1:2", "↘ K.-o.-Matches", "bucket-loss", r[3].matches.slice(3, 6), r[3])}${makeOutcomeBox("❌ 0:3 Raus", "eliminated", byRecord(0, 3), 2)}</div>
                    <div class="swiss-col">${makeHead(r[4], 4)}<div class="swiss-outcome-split">${makeOutcomeBox("✅ 3:1", "qualified", byRecord(3, 1), 3)}${makeOutcomeBox("✅ 3:2", "qualified", byRecord(3, 2), 3)}</div>${renderBucket("2:2", "Entscheidung", "bucket-decider", r[4].matches.slice(0, 3), r[4])}<div class="swiss-outcome-split">${makeOutcomeBox("❌ 1:3", "eliminated", byRecord(1, 3), 3)}${makeOutcomeBox("❌ 2:3", "eliminated", byRecord(2, 3), 3)}</div></div>
                `
                : `
                    <div class="swiss-col">${makeHead(r[0], 0)}${renderBucket("0:0", "4 Matches", "", r[0].matches.slice(0, 4), r[0])}</div>
                    <div class="swiss-col">${makeHead(r[1], 1)}${renderBucket("1:0", "↗ Sieger R1", "bucket-win", r[1].matches.slice(0, 2), r[1])}${renderBucket("0:1", "↘ Verlierer R1", "bucket-loss", r[1].matches.slice(2, 4), r[1])}</div>
                    <div class="swiss-col">${makeHead(r[2], 2)}${makeOutcomeBox("✅ 2:0 Weiter", "qualified", byRecord(2, 0), 2)}${renderBucket("1:1", "Entscheidung", "bucket-decider", r[2].matches.slice(0, 2), r[2])}${makeOutcomeBox("❌ 0:2 Raus", "eliminated", byRecord(0, 2), 2)}</div>
                    <div class="swiss-col"><div class="swiss-col-head"><strong>Endergebnis</strong><small>2:1 / 1:2</small></div>${makeOutcomeBox("✅ 2:1 Weiter", "qualified", byRecord(2, 1), 2)}${makeOutcomeBox("❌ 1:2 Raus", "eliminated", byRecord(1, 2), 2)}</div>
                `;

            const standingRows = standings.map((row, idx) => {
                const info = getResolvedParticipant(row.uid, graph.participants);
                const statusTxt = row.wins >= g.winsToAdvance ? "✅ Weiter" : (row.losses >= g.lossesToEliminate ? "❌ Raus" : "⚔️ Aktiv");
                const cls = row.wins >= g.winsToAdvance ? "row-qualified" : (row.losses >= g.lossesToEliminate ? "row-eliminated" : "");
                return `<tr class="${cls}"><td>${idx + 1}</td><td>${info ? formatParticipantLabel(info) : "–"}</td><td><strong>${row.wins} - ${row.losses}</strong></td><td>${statusTxt}</td></tr>`;
            }).join("");

            return `
                <div class="stage-group-block">
                    <div class="bracket-toolbar">
                        <h3>📊 ${esc(g.name)} (${g.teamCount} Teams · ${g.winsToAdvance} Siege = Weiter, ${g.lossesToEliminate} Niederlagen = Raus)</h3>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten verteilen</button>` : ""}
                    </div>
                    <div class="swiss-tree-scroll"><div class="swiss-tree-grid">${colsHtml}</div></div>
                    <details class="swiss-table-details">
                        <summary>📊 Detaillierte Tabelle anzeigen (${standings.length} Teams)</summary>
                        <div class="ranking-table-wrap" style="margin-top:10px;">
                            <table class="ranking-table stage-table">
                                <thead><tr><th>#</th><th>Team</th><th>Bilanz (S-N)</th><th>Status</th></tr></thead>
                                <tbody>${standingRows || `<tr><td colspan="4" class="muted">Noch keine Teams zugewiesen.</td></tr>`}</tbody>
                            </table>
                        </div>
                    </details>
                </div>
            `;
        }).join("");
    }

    function renderGslTab(t, graph, admin) {
        return (t.deGroups || []).map((g, gIdx) => {
            const m = g.matches || [];
            const isSix = g.size === 4 && (g.advanceCount === 1 || m.length === 6);
            const isFive = g.size === 4 && !isSix && m.length >= 5;

            const dateBtn = (roundName, curDate) => admin
                ? `<button type="button" class="btn btn-secondary btn-small" style="padding:2px 6px; font-size:.72rem;" data-action="edit-date-label" data-path-type="gsl-round" data-tournament-id="${esc(t.id)}" data-target-id="${esc(g.id)}" data-round-name="${esc(roundName)}" data-current-val="${esc(curDate || "")}" title="Datum bearbeiten">✏️</button>`
                : "";
            const pref = (ids) => ids.flatMap(id => graph.matchSlots[id] || []).filter(Boolean);

            let bodyHtml = "";
            if (isSix) {
                const [o1, o2, ub, lb, cf, gf] = m;
                const gfWin = graph.matchWinners[gf.id];
                const gfInfo = gfWin ? getResolvedParticipant(gfWin, graph.participants) : null;
                bodyHtml = `
                    <div class="gsl-tree-scroll"><div class="gsl-tree">
                        <div class="gsl-headers-6">
                            <div class="gsl-col-head"><span>Opening round <small>${esc(o1.dateLabel || "")}</small></span>${dateBtn(o1.round, o1.dateLabel)}</div><div></div>
                            <div class="gsl-col-head"><span>Upper final <small>${esc(ub.dateLabel || "")}</small></span>${dateBtn(ub.round, ub.dateLabel)}</div><div></div>
                            <div class="gsl-col-head"><span>Group final <small>${esc(gf.dateLabel || "")}</small></span>${dateBtn(gf.round, gf.dateLabel)}</div>
                        </div>
                        <div class="gsl-grid-6">
                            <div class="gsl-cell-open">
                                ${renderMatchCard(t.id, o1, o1.dateLabel || "", o1.format, graph, admin, [], o1.dateEdited)}
                                ${renderMatchCard(t.id, o2, o2.dateLabel || "", o2.format, graph, admin, [], o2.dateEdited)}
                            </div>
                            <div class="gsl-conn-r1"><div class="bracket-connector"></div></div>
                            <div class="gsl-cell-ub">${renderMatchCard(t.id, ub, ub.dateLabel || "", ub.format, graph, admin, pref([o1.id, o2.id]), ub.dateEdited)}</div>
                            <div class="gsl-conn-gf"><div class="bracket-connector"></div></div>
                            <div class="gsl-cell-gf">
                                ${renderMatchCard(t.id, gf, gf.dateLabel || "", gf.format, graph, admin, pref([ub.id, cf.id]), gf.dateEdited)}
                                <div class="lan-qual-pill ${gfInfo ? "qualified" : ""}" style="cursor:default;">
                                    ${gfInfo ? `✅ ${formatParticipantLabel(gfInfo)}<br><span style="font-weight:400;">Gruppensieger (Weiter)</span>` : `1 Gruppensieger weiter`}
                                </div>
                            </div>
                            <div class="gsl-cell-lb1">
                                <div class="gsl-lb-subhead"><span><span class="gsl-drop-arrow">↓</span> Lower Bracket · ${esc(lb.dateLabel || "")}</span>${dateBtn(lb.round, lb.dateLabel)}</div>
                                ${renderMatchCard(t.id, lb, lb.dateLabel || "", lb.format, graph, admin, pref([o1.id, o2.id]), lb.dateEdited)}
                            </div>
                            <div class="gsl-conn-line"></div>
                            <div class="gsl-cell-lb2">
                                <div class="gsl-lb-subhead"><span><span class="gsl-drop-arrow">↓</span> Consolidation · ${esc(cf.dateLabel || "")}</span>${dateBtn(cf.round, cf.dateLabel)}</div>
                                ${renderMatchCard(t.id, cf, cf.dateLabel || "", cf.format, graph, admin, pref([ub.id, lb.id]), cf.dateEdited)}
                            </div>
                        </div>
                    </div></div>
                `;
            } else if (isFive) {
                const [o1, o2, w1, l1, d1] = m;
                const q1 = graph.matchWinners[w1.id] ? getResolvedParticipant(graph.matchWinners[w1.id], graph.participants) : null;
                const q2 = graph.matchWinners[d1.id] ? getResolvedParticipant(graph.matchWinners[d1.id], graph.participants) : null;
                bodyHtml = `
                    <div class="gsl-tree-scroll"><div class="gsl-tree">
                        <div class="gsl-headers-5">
                            <div class="gsl-col-head"><span>Opening round <small>${esc(o1.dateLabel || "")}</small></span>${dateBtn(o1.round, o1.dateLabel)}</div><div></div>
                            <div class="gsl-col-head"><span>Winners / Decider</span>${dateBtn(w1.round, w1.dateLabel)}</div>
                            <div class="gsl-col-head"><span>Qualifiziert (Top 2)</span></div>
                        </div>
                        <div class="gsl-grid-5">
                            <div class="gsl-cell-open">
                                ${renderMatchCard(t.id, o1, o1.dateLabel || "", o1.format, graph, admin, [], o1.dateEdited)}
                                ${renderMatchCard(t.id, o2, o2.dateLabel || "", o2.format, graph, admin, [], o2.dateEdited)}
                            </div>
                            <div class="gsl-conn-r1"><div class="bracket-connector"></div></div>
                            <div class="gsl-cell-ub">${renderMatchCard(t.id, w1, w1.dateLabel || "", w1.format, graph, admin, pref([o1.id, o2.id]), w1.dateEdited)}</div>
                            <div class="gsl-qual-row-1"><div class="lan-qual-pill ${q1 ? "qualified" : ""}" style="cursor:default;">${q1 ? `✅ ${formatParticipantLabel(q1)}` : "Qualifikant #1"}</div></div>
                            <div class="gsl-cell-lb1">
                                <div class="gsl-lb-subhead"><span><span class="gsl-drop-arrow">↓</span> Elimination · ${esc(l1.dateLabel || "")}</span>${dateBtn(l1.round, l1.dateLabel)}</div>
                                ${renderMatchCard(t.id, l1, l1.dateLabel || "", l1.format, graph, admin, pref([o1.id, o2.id]), l1.dateEdited)}
                            </div>
                            <div class="gsl-conn-line"></div>
                            <div class="gsl-cell-lb2">
                                <div class="gsl-lb-subhead"><span><span class="gsl-drop-arrow">↓</span> Decider · ${esc(d1.dateLabel || "")}</span>${dateBtn(d1.round, d1.dateLabel)}</div>
                                ${renderMatchCard(t.id, d1, d1.dateLabel || "", d1.format, graph, admin, pref([w1.id, l1.id]), d1.dateEdited)}
                            </div>
                            <div class="gsl-qual-row-2"><div class="lan-qual-pill ${q2 ? "qualified" : ""}" style="cursor:default;">${q2 ? `✅ ${formatParticipantLabel(q2)}` : "Qualifikant #2"}</div></div>
                        </div>
                    </div></div>
                `;
            } else {
                bodyHtml = `<div class="placeholder-box"><span>Für diese Gruppengröße sind keine Matches definiert.</span></div>`;
            }

            return `
                <div class="stage-group-block">
                    <div class="bracket-toolbar">
                        <h3>⚔️ ${esc(g.name)} (${g.size} Teams · Top ${g.advanceCount || 2} weiter)</h3>
                        ${admin ? `<div style="display:flex; gap:6px;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-de-group" data-tournament-id="${esc(t.id)}" data-group-index="${gIdx}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teams setzen</button></div>` : ""}
                    </div>
                    ${bodyHtml}
                </div>
            `;
        }).join("");
    }

    function renderRoundRobinTab(t, graph, admin) {
        return (t.rrGroups || []).map(g => {
            const standingRows = (graph.rrStandings[g.id] || []).map((row, idx) => {
                const info = getResolvedParticipant(row.uid, graph.participants);
                const adv = idx < (g.advanceCount || 2);
                return `<tr class="${adv ? "row-qualified" : ""}"><td>${idx + 1}</td><td>${info ? formatParticipantLabel(info) : "–"}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.losses}</td><td><strong>${row.points}</strong></td><td>${adv ? "✅ Weiter" : "–"}</td></tr>`;
            }).join("");

            const roundsHtml = g.rounds.map((r, rIdx) => `
                <div class="round-day-card">
                    <div class="round-day-header">
                        <strong>${esc(r.name)} (${esc(r.dateLabel)})</strong>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <span>${r.matches.length} Matches</span>
                            ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-date-label" data-path-type="rr-round" data-tournament-id="${esc(t.id)}" data-target-id="${esc(g.id)}" data-sub-index="${rIdx}" data-current-val="${esc(r.dateLabel)}" title="Datum bearbeiten">✏️</button>` : ""}
                        </div>
                    </div>
                    ${r.matches.map(m => renderMatchCard(t.id, m, r.dateLabel, m.format, graph, admin, [], r.dateEdited)).join("")}
                </div>
            `).join("");

            return `
                <div class="stage-group-block">
                    <div class="bracket-toolbar">
                        <h3>📊 ${esc(g.name)} (Top ${g.advanceCount} weiter)</h3>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button>` : ""}
                    </div>
                    <div class="ranking-table-wrap" style="margin:10px 0 14px;">
                        <table class="ranking-table stage-table">
                            <thead><tr><th>#</th><th>Team</th><th>Sp.</th><th>S</th><th>N</th><th>Pkt</th><th>Status</th></tr></thead>
                            <tbody>${standingRows || `<tr><td colspan="7" class="muted">Noch keine Teams zugewiesen.</td></tr>`}</tbody>
                        </table>
                    </div>
                    <div class="round-days-grid">${roundsHtml}</div>
                </div>
            `;
        }).join("");
    }

    function renderPlayInTab(t, graph, admin) {
        const stage = t.playInStage;
        if (!stage) return "";
        const matchesHtml = stage.rounds.map(r => `
            <div class="round-days-grid">
                ${r.days.map((d, dIdx) => `
                    <div class="round-day-card">
                        <div class="round-day-header">
                            <div><strong>${esc(d.dateLabel)}</strong></div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span>${d.matches.length} Matches</span>
                                ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-date-label" data-path-type="playin-day" data-tournament-id="${esc(t.id)}" data-target-id="${esc(r.id)}" data-sub-index="${dIdx}" data-current-val="${esc(d.dateLabel)}" title="Datum bearbeiten">✏️</button>` : ""}
                            </div>
                        </div>
                        ${d.matches.map(m => renderMatchCard(t.id, m, d.dateLabel, m.format, graph, admin, [], d.dateEdited)).join("")}
                    </div>
                `).join("")}
            </div>
        `).join("");

        return `
            <div class="stage-group-block">
                <div class="bracket-toolbar">
                    <div><h3>⚡ Play-In Phase (${stage.matchCount} Matches)</h3><p class="muted">Die ${stage.advanceCount} Gewinner qualifizieren sich für die nächste Stufe.</p></div>
                    ${admin ? `<div style="display:flex; gap:6px;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button><button type="button" class="btn btn-secondary btn-small" data-action="fill-playin-from-stage1" data-tournament-id="${esc(t.id)}">⚡ Teams übernehmen</button></div>` : ""}
                </div>
                ${matchesHtml}
            </div>
        `;
    }

    function renderRoundTab(t, round, graph, admin, rIdx) {
        const fmt = round.defaultFormat || t.defaultFormat || "BO3";
        if (t.playoffType === "open_qualifier" || t.isOpenQualifier) {
            const cardsHtml = round.days.map(d => d.matches.map(m => renderOpenQualifierMatchCard(t, m, d.dateLabel, graph, admin)).join("")).join("");
            return `
                <div class="bracket-toolbar">
                    <div><h3>${esc(round.name)}</h3><p class="muted">${esc(round.subtitle || "")}</p></div>
                </div>
                <div class="participants-grid" style="grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));">${cardsHtml}</div>
            `;
        }
        const daysHtml = round.days.map((d, dIdx) => `
            <div class="round-day-card">
                <div class="round-day-header">
                    <div><strong>${esc(d.dateLabel)}</strong></div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <span>${d.matches.length} Matches</span>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-date-label" data-path-type="round-day" data-tournament-id="${esc(t.id)}" data-target-id="${esc(round.id)}" data-sub-index="${dIdx}" data-current-val="${esc(d.dateLabel)}" title="Datum bearbeiten">✏️</button>` : ""}
                    </div>
                </div>
                ${d.matches.map(m => renderMatchCard(t.id, m, d.dateLabel, m.format || fmt, graph, admin, [], d.dateEdited)).join("")}
            </div>
        `).join("");
        return `<div class="bracket-toolbar"><div><h3>${esc(round.name)}</h3><p class="muted">${esc(round.subtitle || "")}</p></div>${admin && rIdx === 0 && !t.qualifiedFrom ? `<button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer setzen</button>` : ""}</div><div class="round-days-grid">${daysHtml}</div>`;
    }
    function renderPrizePoolBox(t, graph) {
        if (!t.prizePoolTotal || !t.prizeDistribution?.length) return "";
        const rounds = t.rounds || [];
        const finalId = rounds[rounds.length - 1]?.days?.[0]?.matches?.[0]?.id || "final-1";
        const sfIds = rounds[rounds.length - 2]?.days?.flatMap(d => d.matches.map(m => m.id)) || ["sf-1", "sf-2"];
        const qfIds = rounds[rounds.length - 3]?.days?.flatMap(d => d.matches.map(m => m.id)) || ["qf-1", "qf-2", "qf-3", "qf-4"];
        const loser = (mId) => {
            const w = graph.matchWinners[mId], sl = graph.matchSlots[mId] || [null, null];
            return (w && sl[0] && sl[1] && sl[0] !== "__BYE__" && sl[1] !== "__BYE__") ? (w === sl[0] ? sl[1] : sl[0]) : null;
        };
        const resolve = (type) => {
            if (type === "final-winner") return [graph.matchWinners[finalId]].filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            if (type === "final-loser") return [loser(finalId)].filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            if (type === "sf-losers") return sfIds.map(loser).filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            if (type === "qf-losers") return qfIds.map(loser).filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            return [];
        };

        return `
            <div class="prize-pool-box">
                <div class="prize-pool-header"><h3>💰 Preisgeldverteilung</h3><span class="prize-total">Gesamtpreispool: ${Number(t.prizePoolTotal).toLocaleString("de-DE")} $</span></div>
                <div class="prize-grid">${t.prizeDistribution.map(tier => {
                    const teams = resolve(tier.sourceType);
                    return `<div class="prize-tier"><div class="prize-tier-top"><strong>${esc(tier.place)}</strong><span class="prize-tier-amount">${Number(tier.amount).toLocaleString("de-DE")} $${esc(tier.labelSuffix || "")}</span></div><div class="prize-tier-teams">${teams.length ? teams.map(x => formatParticipantLabel(x)).join(" · ") : "Noch offen"}</div></div>`;
                }).join("")}</div>
            </div>
        `;
    }

    function buildVrsSelectOptions(vrsDate, q, existing) {
        const list = getVrsEntriesForDate(vrsDate);
        const low = q.trim().toLowerCase();
        const filtered = low ? list.filter(e => e.name.toLowerCase().includes(low)) : list;
        if (!filtered.length) return `<option value="">Keine passenden VRS-Teams gefunden</option>`;
        return filtered.map(e => `<option value="${esc(e.uid)}" ${existing.has(e.uid) ? "disabled" : ""}>#${e.rank} ${esc(e.name)} (${e.points} Pkt${e.region ? ` · ${esc(e.region)}` : ""})${existing.has(e.uid) ? " ✓" : ""}</option>`).join("");
    }

    function renderParticipantsTab(t, graph, admin, invData = null) {
        const parts = graph.participants;
        const manual = Array.isArray(t.participants) ? t.participants : [];
        const existing = new Set(parts.map(p => p.uid));
        const full = parts.length >= t.maxTeams;
        const hasStage2Direct = Boolean(t.hasStage1 && t.hasPlayoffs && Number(t.directInvites) > 0);
        const data = invData || computeAllCircuitsInviteData();
        const circuit = data.tournamentToCircuit.get(t.id) || null;
        const tTiers = data.tierResultsByTournament.get(t.id) || {};

        let adminBox = "";
        if (admin) {
            const players = getPlayers();
            const pOpts = players.length
                ? players.map(p => `<option value="${esc(p.uid)}" ${existing.has(`player:${p.uid}`) ? "disabled" : ""}>🛡️ ${esc(getTeamName(p))} (${esc(p.username)})${existing.has(`player:${p.uid}`) ? " ✓" : ""}</option>`).join("")
                : `<option value="">Keine Spieler erstellt</option>`;

            const vrsMap = getVrsRankingsMap();
            const dates = Object.keys(vrsMap).sort();
            const activeDate = getSelectedRankingDate();
            if (!selectedVrsDate || !vrsMap[selectedVrsDate]) selectedVrsDate = vrsMap[activeDate] ? activeDate : (dates[0] || "");
            const dOpts = dates.map(d => `<option value="${esc(d)}" ${d === selectedVrsDate ? "selected" : ""}>${esc(d)}</option>`).join("");
            const vOpts = selectedVrsDate ? buildVrsSelectOptions(selectedVrsDate, vrsSearchTerm, existing) : `<option value="">Keine VRS-Daten</option>`;

            const tierSelectHtml = hasStage2Direct
                ? `<div class="vrs-autofill-bar" style="border-color:rgba(59,130,246,.45);"><label for="tournament-tier-target" style="font-size:.82rem; font-weight:700;">Ziel-Bereich für neue Teams:</label><select id="tournament-tier-target"><option value="stage1" ${selectedTierTarget === "stage1" ? "selected" : ""}>Gruppenphase (${(t.groupCount || 1) * (t.groupSize || 16)} Plätze)</option><option value="playoffs_direct" ${selectedTierTarget === "playoffs_direct" ? "selected" : ""}>Playoffs Direkt-Invite (${t.directInvites} Plätze)</option></select></div>`
                : "";

            let inviteMonitorHtml = "";
            if (circuit && t.useAutoInvites !== false) {
                const phaseText = circuit.phase === "before"
                    ? `Startet am ${formatDateDE(circuit.regStart)}`
                    : (circuit.phase === "open"
                        ? `Aktiv bis ${formatDateDE(addDaysISO(circuit.regEnd, -1))}`
                        : `Abgeschlossen am ${formatDateDE(addDaysISO(circuit.regEnd, -1))}`);
                const tierCards = Object.values(tTiers).map(tr => {
                    const invChips = tr.invitedPlayers.map(ip => {
                        const st = ip.response?.status === "accepted" ? "✅ Bestätigt" : "⏳ Eingeladen (wartet)";
                        return `<div class="invite-status-chip"><strong>🛡️ ${esc(ip.name)} (${ip.points} Pkt.)</strong><span>${st} · ${esc(tr.shortLabel)}</span></div>`;
                    }).join("");
                    const dispNames = tr.displacedBase.map(d => `${d.name} (${d.livePoints} Pkt.)`).join(", ");
                    return `
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <small style="color:var(--text-muted);"><strong>${esc(tr.shortLabel)}:</strong> ${tr.invitedPlayers.length} Spielerteam(s) qualifiziert${dispNames ? ` · Verdrängt: ${esc(dispNames)}` : ""}</small>
                            ${invChips ? `<div class="invite-status-grid">${invChips}</div>` : `<small class="muted">Keine Spielerteams für diesen Bereich eingeladen.</small>`}
                        </div>
                    `;
                }).join("");

                inviteMonitorHtml = `
                    <div class="invite-status-panel">
                        <div class="tournament-card-top">
                            <strong>📧 E-Mail-Einladungsphase (${phaseText})</strong>
                            ${circuit.phase === "closed" && !t.invitesBaked ? `<button type="button" class="btn btn-secondary btn-small" data-action="bake-invites" data-tournament-id="${esc(t.id)}">🔄 Bestätigte Teams fest speichern</button>` : ""}
                        </div>
                        ${tierCards}
                    </div>
                `;
            }

            adminBox = `
                <div class="tournament-admin-box">
                    <div class="tournament-card-top">
                        <h3>🛡️ Admin: Teams zuweisen (${parts.length} / ${t.maxTeams})</h3>
                        <button type="button" class="btn btn-danger btn-small" data-action="clear-participants" data-tournament-id="${esc(t.id)}" ${manual.length === 0 ? "disabled" : ""}>Manuelle entfernen</button>
                    </div>
                    ${tierSelectHtml}
                    <div class="vrs-autofill-bar">
                        <strong style="font-size:.82rem;">⚡ VRS Auto-Zuweisung:</strong>
                        <select id="tournament-vrs-fill-mode">
                            <option value="rank" ${vrsFillMode === "rank" ? "selected" : ""}>Ab Platzierung (Start-Rang)</option>
                            <option value="maxPts" ${vrsFillMode === "maxPts" ? "selected" : ""}>Max. Punktzahl (abwärts)</option>
                            <option value="minPts" ${vrsFillMode === "minPts" ? "selected" : ""}>Mind. Punktzahl (aufwärts)</option>
                        </select>
                        <input type="number" id="tournament-vrs-offset-val" min="0" value="${esc(vrsFillValue)}" style="width:95px;" placeholder="Wert...">
                        <button type="button" class="btn btn-secondary btn-small" data-action="fill-top-vrs" data-tournament-id="${esc(t.id)}" ${!selectedVrsDate ? "disabled" : ""}>Freie Plätze mit VRS auffüllen</button>
                    </div>
                    <div class="assign-grid">
                        <div class="assign-card">
                            <label>Spieler-Team auswählen (für Hinzufügen oder 🔄 Ersetzen)</label>
                            <div class="assign-row">
                                <select id="tournament-player-select">${pOpts}</select>
                                <button type="button" class="btn btn-primary btn-small" data-action="add-player-team" data-tournament-id="${esc(t.id)}" ${full || !players.length ? "disabled" : ""}>Hinzufügen</button>
                            </div>
                        </div>
                        <div class="assign-card">
                            <label>VRS-Team einzeln zuweisen</label>
                            <div class="assign-row">
                                <select id="tournament-vrs-date" style="max-width:135px;">${dOpts}</select>
                                <input type="text" id="tournament-vrs-search" placeholder="Team suchen..." value="${esc(vrsSearchTerm)}">
                            </div>
                            <div class="assign-row">
                                <select id="tournament-vrs-select">${vOpts}</select>
                                <button type="button" class="btn btn-accent btn-small" data-action="add-vrs-team" data-tournament-id="${esc(t.id)}" ${full || !selectedVrsDate ? "disabled" : ""}>Hinzufügen</button>
                            </div>
                        </div>
                        <div class="assign-card">
                            <label>Manuelles Team hinzufügen (ohne VRS-Ranking)</label>
                            <div class="assign-row">
                                <input type="text" id="tournament-manual-team-name" placeholder="Teamname eingeben..." maxlength="40" autocomplete="off">
                                <button type="button" class="btn btn-secondary btn-small" data-action="add-manual-team" data-tournament-id="${esc(t.id)}" ${full ? "disabled" : ""}>Hinzufügen</button>
                            </div>
                        </div>
                    </div>
                </div>
                ${inviteMonitorHtml}
            `;
        }

        const cards = parts.length
            ? parts.map((p, i) => {
                const info = getResolvedParticipant(p.uid, parts);
                const tierTag = hasStage2Direct
                    ? (p.slotGroup === "playoffs_direct" ? " · Playoffs Direkt" : " · Gruppenphase")
                    : "";
                const inviteTag = p.invitedViaEmail ? " · E-Mail bestätigt" : "";
                const canModify = admin && !p.autoQualified && !p.invitedViaEmail;
                const actions = canModify
                    ? `<div style="display:flex; gap:4px;"><button type="button" class="btn btn-secondary btn-small" data-action="replace-participant" data-tournament-id="${esc(t.id)}" data-uid="${esc(p.uid)}" title="Durch oben ausgewähltes Spieler-Team ersetzen">🔄</button><button type="button" class="btn btn-danger btn-small" data-action="remove-participant" data-tournament-id="${esc(t.id)}" data-uid="${esc(p.uid)}">×</button></div>`
                    : "";
                return `<div class="participant-item ${p.autoQualified || p.invitedViaEmail ? "auto" : ""}"><div class="participant-info"><strong>#${i + 1} ${formatParticipantLabel(info)}</strong><small>${esc(info.badgeText)}${p.region ? ` · ${esc(p.region)}` : ""}${esc(tierTag)}${esc(inviteTag)}</small></div>${actions}</div>`;
            }).join("")
            : "";

        return `${adminBox}${cards ? `<div class="participants-grid">${cards}</div>` : `<div class="placeholder-box"><span>Noch keine Teams eingetragen (0 / ${t.maxTeams}).</span></div>`}`;
    }

    function renderTournamentDetail(t) {
        const admin = isAdmin();
        const effStatus = getEffectiveStatus(t);
        const badge = formatCategoryBadge(effStatus);
        const invData = computeAllCircuitsInviteData();
        const visInfo = getTournamentVisibilityInfo(t, invData);
        const graph = resolveTournamentGraph(t, new Set(), invData);
        const parts = graph.participants;

        const subTabs = [];
        if (t.hasStage1) {
            subTabs.push({ id: "stage1", label: "📊 Gruppenphase" });
        }
        if (t.hasPlayIn) subTabs.push({ id: "playin", label: "⚡ Play-In" });
        if (t.hasPlayoffs) {
            subTabs.push({ id: "bracket", label: "🌳 Turnierbaum" });
            const isHugeOq = Boolean((t.playoffType === "open_qualifier" || t.isOpenQualifier) && (t.rounds || []).length > 4);
            if (!isHugeOq) {
                (t.rounds || []).forEach(r => subTabs.push({ id: r.id, label: `${r.name} (${r.defaultFormat || "BO3"})` }));
            }
        }
        const partCountLabel = visInfo.canSeeLineupAndBracket ? `(${parts.length}/${t.maxTeams})` : `(max. ${t.maxTeams})`;
        subTabs.push({ id: "participants", label: `👥 Teilnehmer ${partCountLabel}` });

        if (!activeSubTab || !subTabs.some(st => st.id === activeSubTab)) activeSubTab = subTabs[0]?.id || "participants";

        let body = "";
        if (!visInfo.canSeeLineupAndBracket) {
            const c = visInfo.circuit;
            const regEndDisplay = c ? formatDateDE(addDaysISO(c.regEnd, -1)) : "";
            let regBlock = "";
            if (t.useAutoInvites !== false && c) {
                if (c.phase === "before") {
                    regBlock = `<div class="tournament-notice info"><strong>⏳ Anmelde- &amp; Einladungsphase startet am ${esc(formatDateDE(c.regStart))}</strong><span>Die Einladungen der Turnierorganisatoren werden ab dem ${esc(formatDateDE(c.regStart))} per E-Mail unter <strong>Managing → E-Mails</strong> versendet.</span></div>`;
                } else if (c.phase === "open") {
                    regBlock = `<div class="tournament-notice info"><strong>📧 Einladungs- &amp; Anmeldephase aktiv (bis ${esc(regEndDisplay)})</strong><span>Die Anmeldung wird über E-Mail-Anfragen der Turnierorganisatoren unter <strong>Managing → E-Mails</strong> geregelt.</span></div>`;
                }
            }
            const lowRankBlock = visInfo.myLowRankNotice
                ? `<div class="tournament-notice danger"><strong>⚠️ Ranking zu niedrig</strong><span>${esc(visInfo.myLowRankNotice)}</span></div>`
                : "";
            const higherBlock = visInfo.myHigherTierNotice
                ? `<div class="tournament-notice neutral"><strong>ℹ️ Hinweis</strong><span>${esc(visInfo.myHigherTierNotice)}</span></div>`
                : "";
            const invitedBlock = visInfo.myInvitedNotice
                ? `<div class="tournament-notice warning"><strong>📧 Einladung im Postfach</strong><span>${esc(visInfo.myInvitedNotice)}</span></div>`
                : "";

            body = `
                <div class="tournament-notices">
                    <div class="tournament-notice warning">
                        <strong>🔒 Teilnehmer &amp; Paarungen noch verborgen</strong>
                        <span>Welche Teams am Turnier teilnehmen und wie die Paarungen aussehen, wird ab 1 Woche vor Turnierbeginn (${esc(formatDateDE(visInfo.revealDate))}) sichtbar.</span>
                    </div>
                    ${regBlock}
                    ${invitedBlock}
                    ${higherBlock}
                    ${lowRankBlock}
                </div>
            `;
        } else {
            if (activeSubTab === "stage1") {
                body = t.stage1Type === "swiss" ? renderSwissTab(t, graph, admin) : (t.stage1Type === "gsl" ? renderGslTab(t, graph, admin) : renderRoundRobinTab(t, graph, admin));
            } else if (activeSubTab === "playin") {
                body = renderPlayInTab(t, graph, admin);
            } else if (activeSubTab === "bracket") {
                if (t.playoffType === "open_qualifier" || t.isOpenQualifier) body = renderOpenQualifierBracket(t, graph, admin);
                else if (t.isQuali32) body = renderQuali32Bracket(t, graph, admin);
                else if (t.isDoubleElimQuali) body = renderDoubleElimQualiBracket(t, graph, admin);
                else body = renderPlayoffsBracket(t, graph, admin);
            } else if (activeSubTab === "participants") {
                body = renderParticipantsTab(t, graph, admin, invData);
            } else {
                const rIdx = (t.rounds || []).findIndex(r => r.id === activeSubTab);
                body = rIdx >= 0 ? renderRoundTab(t, t.rounds[rIdx], graph, admin, rIdx) : "";
            }
        }

        const selMode = t.statusMode === "manual" ? t.status : "auto";
        const adminHeaderBtns = admin ? `
            <div class="tournament-admin-status">
                <select id="tournament-status-select" data-tournament-id="${esc(t.id)}" title="Status-Modus">
                    <option value="auto" ${selMode === "auto" ? "selected" : ""}>🔄 Auto (${effStatus})</option>
                    <option value="zukuenftig" ${selMode === "zukuenftig" ? "selected" : ""}>🗓️ Manuell: Zukünftig</option>
                    <option value="laufend" ${selMode === "laufend" ? "selected" : ""}>🔴 Manuell: Laufend</option>
                    <option value="vergangen" ${selMode === "vergangen" ? "selected" : ""}>🏁 Manuell: Vergangen</option>
                </select>
                <button type="button" class="btn btn-secondary btn-small" data-action="edit-tournament" data-tournament-id="${esc(t.id)}">✏️ Bearbeiten</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="duplicate-tournament" data-tournament-id="${esc(t.id)}">📋 Duplizieren</button>
                <button type="button" class="btn btn-danger btn-small" data-action="delete-tournament" data-tournament-id="${esc(t.id)}">🗑️</button>
            </div>
        ` : "";

        const noticesHtml = (t.notices || []).map(n => `
            <div class="tournament-notice ${esc(n.type)}">
                <strong>${n.icon} ${esc(n.title)}</strong><span>${esc(n.text)}</span>
                ${n.linkTournamentId ? `<div class="tournament-notice-actions"><button type="button" class="tournament-notice-link" data-action="open-tournament" data-tournament-id="${esc(n.linkTournamentId)}">${esc(n.linkLabel)}</button></div>` : ""}
            </div>
        `).join("");

        return `
            <div class="card">
                <div class="tournament-detail-topbar">
                    <button type="button" class="btn btn-secondary btn-small" data-action="back-to-overview">← Zurück zur Turnierübersicht</button>
                    <div class="row" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
                        ${t.prizePoolTotal ? `<span class="t-badge t-badge-prize">💰 ${Number(t.prizePoolTotal).toLocaleString("de-DE")} $ Pool</span>` : ""}
                        <span class="t-badge ${badge.cls}">${badge.label}</span>
                        ${adminHeaderBtns}
                    </div>
                </div>
                <h2>🏅 ${esc(t.name)}</h2>
                <div class="tournament-info-grid">
                    <div class="stat-box"><span class="stat-label">Zeitraum</span><span class="stat-value">${esc(t.onlineDates)}</span></div>
                    <div class="stat-box"><span class="stat-label">Austragungsort</span><span class="stat-value">${esc(t.onlineRegion)}</span></div>
                    <div class="stat-box"><span class="stat-label">Match-Format</span><span class="stat-value">${esc(t.matchFormatSummary)}</span></div>
                    ${t.prizePoolTotal ? `<div class="stat-box"><span class="stat-label">Gesamtpreispool</span><span class="stat-value" style="color:var(--accent-orange);">${Number(t.prizePoolTotal).toLocaleString("de-DE")} $</span></div>` : (t.travelWindow ? `<div class="stat-box"><span class="stat-label">Anreise bei Weiterkommen</span><span class="stat-value">${esc(t.travelWindow)}</span></div>` : "")}
                    ${t.lanLocation ? `<div class="stat-box"><span class="stat-label">LAN Finals</span><span class="stat-value">${esc(t.lanDates ? `${t.lanDates} · ` : "")}${esc(t.lanLocation)}</span></div>` : ""}
                    <div class="stat-box"><span class="stat-label">Teilnehmer</span><span class="stat-value">${visInfo.canSeeLineupAndBracket ? `${parts.length} / ${t.maxTeams} Teams` : `Max. ${t.maxTeams} Teams (ab ${formatDateDE(visInfo.revealDate)} sichtbar)`}</span></div>
                </div>
                ${visInfo.canSeeLineupAndBracket ? renderPrizePoolBox(t, graph) : ""}
                ${noticesHtml ? `<div class="tournament-notices">${noticesHtml}</div>` : ""}
                ${visInfo.canSeeLineupAndBracket ? `
                    <div class="tournament-subtabs" role="tablist">
                        ${subTabs.map(st => `<button type="button" class="tournament-subtab ${activeSubTab === st.id ? "active" : ""}" data-action="switch-subtab" data-subtab="${esc(st.id)}">${esc(st.label)}</button>`).join("")}
                    </div>
                ` : ""}
                <div>${body}</div>
            </div>
        `;
    }

    function renderTournamentOverview() {
        const admin = isAdmin();
        const list = getTournamentsCache();
        const invData = computeAllCircuitsInviteData();
        const counts = { laufend: 0, zukuenftig: 0, vergangen: 0 };
        const grouped = { laufend: [], zukuenftig: [], vergangen: [] };

        list.forEach(t => {
            const st = getEffectiveStatus(t);
            counts[st]++;
            grouped[st].push(t);
        });

        const activeList = grouped[activeCategory] || [];
        const cardsHtml = activeList.length
            ? `<div class="tournament-list">${activeList.map(t => {
                const badge = formatCategoryBadge(getEffectiveStatus(t));
                const visInfo = getTournamentVisibilityInfo(t, invData);
                const graph = visInfo.canSeeLineupAndBracket ? resolveTournamentGraph(t, new Set(), invData) : null;
                const teamCountTxt = visInfo.canSeeLineupAndBracket ? `${graph.participants.length} / ${t.maxTeams} Teams` : `Max. ${t.maxTeams} Teams`;
                return `
                    <div class="tournament-card">
                        <div class="tournament-card-top">
                            <span class="tournament-card-title" data-action="open-tournament" data-tournament-id="${esc(t.id)}">🏅 ${esc(t.name)}</span>
                            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                                ${t.prizePoolTotal ? `<span class="t-badge t-badge-prize">💰 ${Number(t.prizePoolTotal).toLocaleString("de-DE")} $</span>` : ""}
                                <span class="t-badge ${badge.cls}">${badge.label}</span>
                            </div>
                        </div>
                        <div class="tournament-card-meta">
                            <span>📅 ${esc(t.onlineDates)} (${esc(t.onlineRegion)})</span>
                            ${t.lanLocation ? `<span>✈️ LAN Finals: ${esc(t.lanDates)} (${esc(t.lanLocation)})</span>` : ""}
                            <span>🎮 Format: ${esc(t.matchFormatSummary)}</span>
                            <span>👥 ${esc(teamCountTxt)}</span>
                            <span>🌍 ${esc(t.inviteSummary)}</span>
                        </div>
                        <div class="tournament-card-foot">
                            <span data-action="open-tournament" data-tournament-id="${esc(t.id)}" style="cursor:pointer;">Turnierdetails ansehen →</span>
                            ${admin ? `<div style="display:flex; gap:6px;"><button type="button" class="btn btn-secondary btn-small" data-action="edit-tournament" data-tournament-id="${esc(t.id)}">✏️ Bearbeiten</button><button type="button" class="btn btn-secondary btn-small" data-action="duplicate-tournament" data-tournament-id="${esc(t.id)}">📋 Duplizieren</button><button type="button" class="btn btn-danger btn-small" data-action="delete-tournament" data-tournament-id="${esc(t.id)}">🗑️</button></div>` : `<button type="button" class="btn btn-primary btn-small" data-action="open-tournament" data-tournament-id="${esc(t.id)}">Öffnen →</button>`}
                        </div>
                    </div>
                `;
            }).join("")}</div>`
            : `<div class="placeholder-box"><span>Keine Turniere in dieser Kategorie.</span></div>`;

        const adminActions = admin ? `
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                <button type="button" class="btn btn-accent btn-small" data-action="new-tournament">+ Neues Turnier erstellen</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="export-tournaments">📤 JSON-Backup</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="import-tournaments">📥 JSON-Import</button>
                <input type="file" id="tournaments-import-file" accept=".json" class="hidden">
            </div>
        ` : "";

        return `
            <div class="card">
                <div class="tournament-overview-head">
                    <div><h2>Turnierübersicht</h2><p class="muted-text" style="margin-bottom:0;">Wähle zwischen aktuell laufenden, zukünftigen und vergangenen Turnieren.</p></div>
                    ${adminActions}
                </div>
                <div class="tournament-tabs" role="tablist">
                    <button type="button" class="tournament-tab ${activeCategory === "laufend" ? "active" : ""}" data-tournament-tab="laufend">🔴 Aktuell laufend <span class="tournament-tab-count">${counts.laufend}</span></button>
                    <button type="button" class="tournament-tab ${activeCategory === "zukuenftig" ? "active" : ""}" data-tournament-tab="zukuenftig">🗓️ Zukünftig <span class="tournament-tab-count">${counts.zukuenftig}</span></button>
                    <button type="button" class="tournament-tab ${activeCategory === "vergangen" ? "active" : ""}" data-tournament-tab="vergangen">🏁 Vergangen <span class="tournament-tab-count">${counts.vergangen}</span></button>
                </div>
                ${cardsHtml}
            </div>
        `;
    }

    function render() {
        const root = document.getElementById("tournaments-root");
        if (!root) return;
        if (activeTournamentId) {
            const t = getTournamentById(activeTournamentId);
            if (t) {
                root.innerHTML = renderTournamentDetail(t);
                onTitleChange?.(t.name);
                return;
            }
            activeTournamentId = null;
        }
        root.innerHTML = renderTournamentOverview();
        onTitleChange?.("Turniere");
    }

    function openTournament(tournamentId) {
        const target = getTournamentById(tournamentId);
        if (!target) return;
        activeCategory = getEffectiveStatus(target);
        activeTournamentId = target.id;
        activeSubTab = "";
        activeOqSection = "all";
        render();
        document.querySelector(".content-body")?.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ==================== GETEILTES SLOT-PICKER MODAL (OPEN QUALIFIER) ====================
    function openOqSlotPicker(tournamentId, matchId, slot) {
        const t = getTournamentById(tournamentId);
        if (!t) return;
        const match = (t.rounds || []).flatMap(r => (r.days || []).flatMap(d => d.matches || [])).find(m => m.id === matchId);
        if (!match) return;

        oqPickerContext = { tournamentId, matchId, slot: Number(slot), match };
        const modal = document.getElementById("oq-slot-picker-modal");
        const title = document.getElementById("oq-sp-title");
        const search = document.getElementById("oq-sp-search");
        if (title) title.textContent = `${match.label} · Slot ${Number(slot) + 1} wählen`;
        if (search) search.value = "";
        renderOqSlotPickerList("");
        modal?.classList.remove("hidden");
        search?.focus();
    }

    function renderOqSlotPickerList(queryText) {
        const listEl = document.getElementById("oq-sp-list");
        if (!listEl || !oqPickerContext) return;
        const t = getTournamentById(oqPickerContext.tournamentId);
        if (!t) return;
        const graph = resolveTournamentGraph(t);
        const curUid = (graph.matchSlots[oqPickerContext.matchId] || [null, null])[oqPickerContext.slot] || "";
        const allowed = getAllowedParticipantsForMatch(t, oqPickerContext.match, oqPickerContext.slot, graph, curUid);
        const q = String(queryText || "").trim().toLowerCase();
        const filtered = q
            ? allowed.filter(p => {
                const info = getResolvedParticipant(p.uid, graph.participants);
                return info && info.displayName.toLowerCase().includes(q);
            })
            : allowed;

        if (!filtered.length) {
            listEl.innerHTML = `<div class="empty-team-hint">Keine verfügbaren Teams gefunden (bereits vergebene Teams dieser Runde sind ausgeblendet).</div>`;
            return;
        }
        listEl.innerHTML = filtered.slice(0, 120).map(p => {
            const info = getResolvedParticipant(p.uid, graph.participants);
            return `<button type="button" class="oq-picker-item" data-oq-pick-uid="${esc(p.uid)}"><span>${formatParticipantLabel(info)}</span><small>${esc(info.badgeText)}</small></button>`;
        }).join("");
    }

    function closeOqSlotPicker() {
        oqPickerContext = null;
        document.getElementById("oq-slot-picker-modal")?.classList.add("hidden");
    }

    // ==================== MANAGING -> E-MAIL POSTFACH ====================
    function getPendingInviteCountForCurrentUser() {
        const user = getCurrentUser();
        if (!user || user.role !== "player") return 0;
        const invData = computeAllCircuitsInviteData();
        const emails = invData.emailsByPlayerUid.get(user.uid) || [];
        return emails.filter(m => m.canRespond).length;
    }

    function renderManagingEmails(containerEl) {
        if (!containerEl) return;
        const user = getCurrentUser();
        if (!user) return;
        const invData = computeAllCircuitsInviteData();

        if (user.role === "admin") {
            const circuits = invData.circuits.filter(c => c.tiers.length > 0);
            if (!circuits.length) {
                containerEl.innerHTML = `<div class="placeholder-box"><span>Noch keine Turniere mit aktivierter E-Mail-Einladungsphase vorhanden.</span></div>`;
                return;
            }
            containerEl.innerHTML = circuits.map(c => {
                const phaseText = c.phase === "before"
                    ? `Startet am ${formatDateDE(c.regStart)}`
                    : (c.phase === "open" ? `Läuft bis ${formatDateDE(addDaysISO(c.regEnd, -1))}` : `Beendet (${formatDateDE(addDaysISO(c.regEnd, -1))})`);
                const rows = c.tiers.map(tr => {
                    const list = tr.invitedPlayers.map(ip => {
                        const st = ip.response?.status === "accepted" ? "✅ Bestätigt" : "⏳ Ausstehend";
                        return `<li>🛡️ ${esc(ip.name)} (${ip.points} Pkt.) – <strong>${st}</strong></li>`;
                    }).join("");
                    return `<div style="margin-top:8px;"><strong>${esc(tr.tierLabel)}</strong> (${tr.invitedPlayers.length} eingeladen)<ul style="margin:4px 0 0 18px; font-size:.85rem;">${list || `<li class="muted">Keine Spielerteams</li>`}</ul></div>`;
                }).join("");
                const declined = c.declinedPlayers.map(dp => `🛡️ ${esc(dp.name)} (${dp.points} Pkt.)`).join(", ");
                return `
                    <div class="email-card info-only" style="margin-top:12px;">
                        <div class="email-top">
                            <div><div class="email-subject">📊 Einladungs-Monitor: ${esc(c.rootName)}</div><div class="email-sender">Anmeldephase: ${esc(phaseText)}</div></div>
                            <span class="email-status-pill info">${esc(c.phase.toUpperCase())}</span>
                        </div>
                        <div class="email-body">${rows}${declined ? `<div style="margin-top:8px; color:#fca5a5; font-size:.82rem;">Abgelehnt: ${esc(declined)}</div>` : ""}</div>
                    </div>
                `;
            }).join("");
            return;
        }

        const myPlayer = getPlayers().find(p => p.uid === user.uid);
        const myPts = Number(myPlayer?.points) || 0;
        const emails = [...(invData.emailsByPlayerUid.get(user.uid) || [])]
            .sort((a, b) => (b.canRespond ? 1 : 0) - (a.canRespond ? 1 : 0));

        if (!emails.length) {
            containerEl.innerHTML = `<div class="placeholder-box"><span>Dein Postfach ist aktuell leer. Sobald ein Turnier-Verbund in die Einladungsphase startet und dein VRS-Ranking (${myPts.toLocaleString("de-DE")} Pkt.) ausreicht, erhältst du hier Anfragen der Turnierorganisatoren.</span></div>`;
            return;
        }

        const statusLabels = {
            pending: { cls: "pending", txt: "⏳ Antwort erforderlich" },
            accepted: { cls: "accepted", txt: "✅ Teilnahme bestätigt" },
            declined: { cls: "declined", txt: "❌ Abgelehnt" },
            expired: { cls: "expired", txt: "⌛ Frist abgelaufen" },
            info: { cls: "info", txt: "ℹ️ VRS-Update" }
        };

        containerEl.innerHTML = `<div class="email-list">${emails.map(mail => {
            const st = statusLabels[mail.status] || statusLabels.info;
            const cardCls = mail.canRespond ? "unread" : (mail.status === "accepted" ? "accepted" : (mail.status === "declined" ? "declined" : (mail.status === "expired" ? "expired" : "info-only")));
            return `
                <article class="email-card ${cardCls}">
                    <div class="email-top">
                        <div>
                            <div class="email-subject">${esc(mail.subject)}</div>
                            <div class="email-sender">Von: ${esc(mail.sender)} · Eingegangen am ${esc(mail.dateLabel)}</div>
                        </div>
                        <span class="email-status-pill ${st.cls}">${st.txt}</span>
                    </div>
                    <div class="email-meta-bar">
                        <span>🏅 Bereich: <strong>${esc(mail.tierLabel)}</strong></span>
                        <span>🔗 Verbund: ${esc(mail.chainNames.join(" → "))}</span>
                        <span>⏳ Antwortfrist: ${esc(mail.deadlineLabel)}</span>
                    </div>
                    <p class="email-body">${esc(mail.body)}</p>
                    <div class="email-actions">
                        ${mail.canRespond ? `
                            <button type="button" class="btn btn-primary btn-small" data-email-action="accept" data-chain-key="${esc(mail.chainRootId)}" data-tournament-id="${esc(mail.tournamentId)}" data-tier-key="${esc(mail.tierKey)}" data-tier-label="${esc(mail.tierLabel)}">✅ Teilnahme bestätigen</button>
                            <button type="button" class="btn btn-danger btn-small" data-email-action="decline" data-chain-key="${esc(mail.chainRootId)}" data-tournament-id="${esc(mail.tournamentId)}" data-tier-key="${esc(mail.tierKey)}" data-tier-label="${esc(mail.tierLabel)}">❌ Ablehnen</button>
                        ` : ""}
                        <button type="button" class="btn btn-secondary btn-small" data-email-action="open-tournament" data-tournament-id="${esc(mail.tournamentId)}">🏅 Turnierseite öffnen</button>
                    </div>
                </article>
            `;
        }).join("")}</div>`;
    }

    // ==================== MODULARER TURNIER-EDITOR ====================
    function populateTournamentEditorLinks(excludeId = "") {
        const others = getTournamentsCache().filter(t => t.id !== excludeId);
        const opts = `<option value="">– Keine Verknüpfung –</option>` + others.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
        const predEl = document.getElementById("te-predecessor-id");
        const nextEl = document.getElementById("te-next-id");
        if (predEl) predEl.innerHTML = opts;
        if (nextEl) nextEl.innerHTML = opts;
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val !== undefined && val !== null ? String(val) : ""; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = Boolean(val); };
    const getVal = (id, fallback = "") => document.getElementById(id)?.value ?? fallback;
    const getCheck = (id) => Boolean(document.getElementById(id)?.checked);

    function updateModularEditorVisibility() {
        const hasS1 = getCheck("te-enable-stage1");
        const hasPI = getCheck("te-enable-playin");
        const hasPO = getCheck("te-enable-playoffs");

        document.getElementById("te-stage1-box")?.classList.toggle("hidden", !hasS1);
        document.getElementById("te-playin-box")?.classList.toggle("hidden", !hasPI);
        document.getElementById("te-playoffs-box")?.classList.toggle("hidden", !hasPO);

        const s1Type = getVal("te-stage1-type", "swiss");
        document.getElementById("te-group-advance-wrap")?.classList.toggle("hidden", s1Type === "swiss");

        const poType = getVal("te-playoff-type", "single_elim");
        const isOq = poType === "open_qualifier";
        document.querySelectorAll(".te-oq-size-opt").forEach(opt => opt.classList.toggle("hidden", !isOq));
        const sizeEl = document.getElementById("te-playoff-size");
        if (sizeEl) {
            Array.from(sizeEl.options).forEach(opt => {
                if (opt.value === "4" || opt.value === "6") opt.classList.toggle("hidden", isOq);
            });
            if (isOq && (sizeEl.value === "4" || sizeEl.value === "6")) sizeEl.value = "64";
            if (!isOq && Number(sizeEl.value) > 32) sizeEl.value = "8";
        }
        document.getElementById("te-oq-qualifiers-wrap")?.classList.toggle("hidden", !isOq);
        document.getElementById("te-direct-invites-wrap")?.classList.toggle("hidden", isOq);
    }

    function openTournamentEditor(existing = null, isDuplicate = false) {
        const modal = document.getElementById("tournament-editor-modal");
        if (!modal) return;
        document.getElementById("te-form")?.reset();

        const editId = existing && !isDuplicate ? existing.id : "";
        populateTournamentEditorLinks(editId);
        const titleEl = document.getElementById("te-modal-title");
        if (titleEl) titleEl.textContent = existing ? (isDuplicate ? "Turnier duplizieren" : "Turnier bearbeiten") : "Neues Turnier erstellen (Baukasten)";
        setVal("te-id", editId);

        if (existing) {
            setVal("te-name", isDuplicate ? `${existing.name} (Kopie)` : existing.name);
            setVal("te-status", existing.statusMode === "manual" ? existing.status : "auto");
            setCheck("te-use-auto-invites", existing.useAutoInvites !== false);
            setVal("te-start-date", existing.startDate || "2025-02-01");
            setVal("te-end-date", existing.endDate || "");
            setVal("te-matches-per-day", existing.matchesPerDay || 4);
            setVal("te-online-dates", existing.onlineDates || "");
            setVal("te-online-region", existing.onlineRegion || "");
            setVal("te-default-format", existing.defaultFormat || "BO3");
            setVal("te-decider-format", existing.deciderFormat || "BO3");
            setVal("te-final-format", existing.finalFormat || "BO5");
            setVal("te-invite-summary", existing.inviteSummary || "");
            setVal("te-lan-dates", existing.lanDates || "");
            setVal("te-lan-location", existing.lanLocation || "");
            setVal("te-travel-window", existing.travelWindow || "");
            setVal("te-predecessor-id", existing.qualifiedFrom?.tournamentId || "");
            setVal("te-next-id", existing.nextTournamentId || "");
            setVal("te-prize-total", existing.prizePoolTotal || "");

            setCheck("te-enable-stage1", existing.hasStage1 ?? existing.swissGroups?.length ?? existing.deGroups?.length ?? existing.rrGroups?.length);
            setVal("te-stage1-type", existing.stage1Type || (existing.swissGroups?.length ? "swiss" : (existing.deGroups?.length ? "gsl" : "round_robin")));
            setVal("te-group-count", existing.groupCount || 1);
            setVal("te-group-size", existing.groupSize || 16);
            setVal("te-advance-per-group", existing.advancePerGroup || existing.deGroups?.[0]?.advanceCount || existing.rrGroups?.[0]?.advanceCount || 2);

            setCheck("te-enable-playin", existing.hasPlayIn ?? existing.playInStage);
            setVal("te-playin-matches", existing.playInMatches || 4);

            setCheck("te-enable-playoffs", existing.hasPlayoffs ?? (existing.rounds?.length > 0));
            setVal("te-playoff-type", existing.playoffType || (existing.isOpenQualifier ? "open_qualifier" : (existing.isDoubleElimQuali ? "double_elim_quali" : (existing.isDoubleElimPlayoffs ? "double_elim" : "single_elim"))));
            updateModularEditorVisibility();
            setVal("te-playoff-size", existing.playoffSize || (existing.isQuali32 ? 32 : 8));
            setVal("te-direct-invites", existing.directInvites || 0);
            setVal("te-oq-qualifiers", existing.oqQualifierCount || 4);

            const findAmt = (src) => existing.prizeDistribution?.find(d => d.sourceType === src)?.amount || "";
            setVal("te-prize-1", findAmt("final-winner"));
            setVal("te-prize-2", findAmt("final-loser"));
            setVal("te-prize-34", findAmt("sf-losers"));
            setVal("te-prize-58", findAmt("qf-losers"));
            setVal("te-location-notice", existing.notices?.find(n => n.type === "info")?.text || "");
            setVal("te-travel-notice", existing.notices?.find(n => n.type === "warning")?.text || "");
        } else {
            setVal("te-start-date", "2025-02-01");
            setCheck("te-enable-playoffs", true);
            setCheck("te-use-auto-invites", true);
        }

        updateModularEditorVisibility();
        modal.classList.remove("hidden");
    }

    function closeEditor() {
        document.getElementById("tournament-editor-modal")?.classList.add("hidden");
    }

    function setupEditorEvents() {
        document.getElementById("te-close")?.addEventListener("click", closeEditor);
        document.getElementById("te-cancel")?.addEventListener("click", closeEditor);
        ["te-enable-stage1", "te-enable-playin", "te-enable-playoffs", "te-stage1-type", "te-playoff-type"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", updateModularEditorVisibility);
        });

        document.getElementById("te-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!isAdmin()) return;

            const existingId = getVal("te-id");
            const prev = existingId ? getTournamentById(existingId) : null;
            const poType = getVal("te-playoff-type", "single_elim");
            const poSize = getVal("te-playoff-size", "8");

            const tObj = buildTournamentFromModularConfig({
                id: existingId || undefined,
                name: getVal("te-name"),
                status: getVal("te-status", "auto"),
                useAutoInvites: getCheck("te-use-auto-invites"),
                startDate: getVal("te-start-date", "2025-02-01"),
                endDate: getVal("te-end-date"),
                matchesPerDay: getVal("te-matches-per-day", "4"),
                onlineDates: getVal("te-online-dates"),
                onlineRegion: getVal("te-online-region"),
                defaultFormat: getVal("te-default-format", "BO3"),
                deciderFormat: getVal("te-decider-format", "BO3"),
                finalFormat: getVal("te-final-format", "BO5"),
                inviteSummary: getVal("te-invite-summary"),
                lanDates: getVal("te-lan-dates"),
                lanLocation: getVal("te-lan-location"),
                travelWindow: getVal("te-travel-window"),
                predecessorId: getVal("te-predecessor-id"),
                nextTournamentId: getVal("te-next-id"),
                prizePoolTotal: getVal("te-prize-total"),
                prize1: getVal("te-prize-1"),
                prize2: getVal("te-prize-2"),
                prize34: getVal("te-prize-34"),
                prize58: getVal("te-prize-58"),
                locationNotice: getVal("te-location-notice"),
                travelNotice: getVal("te-travel-notice"),
                hasStage1: getCheck("te-enable-stage1"),
                stage1Type: getVal("te-stage1-type", "swiss"),
                groupCount: getVal("te-group-count", "1"),
                groupSize: getVal("te-group-size", "16"),
                advancePerGroup: getVal("te-advance-per-group", "2"),
                hasPlayIn: getCheck("te-enable-playin"),
                playInMatches: getVal("te-playin-matches", "4"),
                hasPlayoffs: getCheck("te-enable-playoffs"),
                playoffType: poType,
                playoffSize: poSize,
                directInvites: getVal("te-direct-invites", "0"),
                oqQualifierCount: getVal("te-oq-qualifiers", "4"),
                isQuali32: poType !== "open_qualifier" && poSize === "32",
                existingParticipants: prev?.participants || [],
                existingMatches: prev?.matches || {},
                existingMatchSchedules: prev?.matchSchedules || {},
                existingWinners: prev?.winners || {},
                existingDefaultWins: prev?.defaultWins || {},
                invitesBaked: prev?.invitesBaked || false,
                sortOrder: prev?.sortOrder ?? Date.now(),
                createdAt: prev?.createdAt ?? Date.now()
            });

            await saveTournamentDoc(tObj);
            activeCategory = getEffectiveStatus(tObj);
            closeEditor();
            render();
        });
    }

    // ==================== INTERAKTIONEN (ADMIN, E-MAILS & SLOT-PICKER) ====================
    function setupEvents() {
        // Managing E-Mail Postfach Aktionen
        document.getElementById("managing-emails-root")?.addEventListener("click", async (e) => {
            const btn = e.target.closest("[data-email-action]");
            if (!btn) return;
            const action = btn.dataset.emailAction;

            if (action === "open-tournament") {
                onOpenTournament?.(btn.dataset.tournamentId);
                return;
            }

            const user = getCurrentUser();
            if (!user || user.role !== "player" || typeof savePlayerResponse !== "function") return;

            const { chainKey, tournamentId, tierKey, tierLabel } = btn.dataset;
            if (action === "accept") {
                btn.disabled = true;
                await savePlayerResponse(user.uid, chainKey, {
                    status: "accepted",
                    tierTournamentId: tournamentId,
                    tierKey,
                    tierLabel,
                    gameDate: currentGameDate(),
                    respondedAt: Date.now()
                });
            } else if (action === "decline") {
                if (!confirm(`Einladung für „${tierLabel}“ wirklich ablehnen? Das nächste berechtigte Team rückt dann automatisch nach.`)) return;
                btn.disabled = true;
                await savePlayerResponse(user.uid, chainKey, {
                    status: "declined",
                    tierTournamentId: tournamentId,
                    tierKey,
                    tierLabel,
                    gameDate: currentGameDate(),
                    respondedAt: Date.now()
                });
            }
        });

        // Geteiltes Open-Qualifier Slot-Picker Modal
        const oqModal = document.getElementById("oq-slot-picker-modal");
        document.getElementById("oq-sp-close")?.addEventListener("click", closeOqSlotPicker);
        oqModal?.addEventListener("click", (e) => { if (e.target === oqModal) closeOqSlotPicker(); });
        document.getElementById("oq-sp-search")?.addEventListener("input", (e) => renderOqSlotPickerList(e.target.value));

        const applyOqSlotValue = async (val) => {
            if (!oqPickerContext || !isAdmin()) return;
            const t = getTournamentById(oqPickerContext.tournamentId);
            if (!t) return closeOqSlotPicker();

            const prevUid = resolveTournamentGraph(t).matchSlots[oqPickerContext.matchId]?.[oqPickerContext.slot] || null;
            const clone = structuredClone(t);
            clone.matches = clone.matches || {};
            clone.winners = clone.winners || {};
            clone.defaultWins = clone.defaultWins || {};
            if (!Array.isArray(clone.matches[oqPickerContext.matchId])) clone.matches[oqPickerContext.matchId] = [null, null];
            clone.matches[oqPickerContext.matchId][oqPickerContext.slot] = val;
            if (prevUid && clone.winners[oqPickerContext.matchId] === prevUid && val !== prevUid) {
                delete clone.winners[oqPickerContext.matchId];
                delete clone.defaultWins[oqPickerContext.matchId];
            }
            closeOqSlotPicker();
            await saveTournamentDoc(clone);
        };

        document.getElementById("oq-sp-clear-btn")?.addEventListener("click", () => applyOqSlotValue(""));
        document.getElementById("oq-sp-bye-btn")?.addEventListener("click", () => applyOqSlotValue("__BYE__"));
        document.getElementById("oq-sp-list")?.addEventListener("click", (e) => {
            const item = e.target.closest("[data-oq-pick-uid]");
            if (item) applyOqSlotValue(item.dataset.oqPickUid);
        });

        const root = document.getElementById("tournaments-root");
        if (!root) return;

        root.addEventListener("click", async (e) => {
            const catTab = e.target.closest("[data-tournament-tab]");
            if (catTab) { activeCategory = catTab.dataset.tournamentTab; render(); return; }

            const el = e.target.closest("[data-action]");
            if (!el) return;
            const action = el.dataset.action;

            if (action === "open-tournament") { openTournament(el.dataset.tournamentId); return; }
            if (action === "back-to-overview") { activeTournamentId = null; render(); return; }
            if (action === "switch-subtab") { activeSubTab = el.dataset.subtab; render(); return; }
            if (action === "oq-section") { activeOqSection = el.dataset.section || "all"; render(); return; }

            if (!isAdmin()) return;

            if (action === "new-tournament") { openTournamentEditor(null, false); return; }
            if (action === "export-tournaments") {
                const blob = new Blob([JSON.stringify(getTournamentsCache(), null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `hltv_turniere_backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                return;
            }
            if (action === "import-tournaments") { document.getElementById("tournaments-import-file")?.click(); return; }

            const tId = el.dataset.tournamentId;
            const t = getTournamentById(tId);
            if (!t) return;

            if (action === "open-oq-slot-picker") {
                openOqSlotPicker(tId, el.dataset.matchId, el.dataset.slot);
                return;
            }
            if (action === "edit-tournament") { openTournamentEditor(t, false); return; }
            if (action === "duplicate-tournament") { openTournamentEditor(t, true); return; }
            if (action === "delete-tournament") {
                if (!confirm(`Turnier „${t.name}“ wirklich endgültig löschen?`)) return;
                await deleteTournamentDoc(tId);
                if (activeTournamentId === tId) activeTournamentId = null;
                render();
                return;
            }

            const clone = structuredClone(t);
            clone.participants = Array.isArray(clone.participants) ? clone.participants : [];
            clone.matches = clone.matches || {};
            clone.matchSchedules = clone.matchSchedules || {};
            clone.winners = clone.winners || {};
            clone.defaultWins = clone.defaultWins || {};

            const hasStage2Direct = Boolean(t.hasStage1 && t.hasPlayoffs && Number(t.directInvites) > 0);
            const curSlotGroup = hasStage2Direct ? selectedTierTarget : undefined;

            if (action === "bake-invites") {
                const graph = resolveTournamentGraph(t);
                clone.participants = graph.participants.filter(p => !p.autoQualified);
                clone.invitesBaked = true;
                await saveTournamentDoc(clone);
                return;
            }

            if (action === "replace-participant") {
                const uidToReplace = el.dataset.uid;
                const pUid = document.getElementById("tournament-player-select")?.value;
                const player = getPlayers().find(p => p.uid === pUid);
                if (!player) { alert("Bitte wähle oben im Dropdown zuerst ein Spieler-Team aus!"); return; }
                const newUid = `player:${player.uid}`;
                if (clone.participants.some(p => p.uid === newUid)) { alert("Dieses Spieler-Team ist bereits im Turnier!"); return; }

                const pIdx = clone.participants.findIndex(p => p.uid === uidToReplace);
                if (pIdx !== -1) {
                    const prevGroup = clone.participants[pIdx].slotGroup;
                    clone.participants[pIdx] = {
                        uid: newUid, type: "player", playerUid: player.uid,
                        username: player.username, name: getTeamName(player),
                        ...(prevGroup ? { slotGroup: prevGroup } : {})
                    };
                }
                for (const mId of Object.keys(clone.matches)) {
                    clone.matches[mId] = (clone.matches[mId] || []).map(s => (s === uidToReplace ? newUid : s));
                }
                for (const mId of Object.keys(clone.winners)) {
                    if (clone.winners[mId] === uidToReplace) clone.winners[mId] = newUid;
                }
                await saveTournamentDoc(clone);
                return;
            }

            if (action === "edit-date-label") {
                const { pathType, targetId, roundName, subIndex, currentVal } = el.dataset;
                const newVal = prompt("Neues Datum für diesen Spieltag (z. B. 30. Januar 2025 oder 30.01.2025):", currentVal || "");
                if (!newVal || !newVal.trim()) return;
                const text = newVal.trim();
                const parsedIso = tryParseGermanOrIsoDate(text);
                const applyToObj = (obj) => {
                    obj.dateLabel = text;
                    obj.dateEdited = true;
                    if (parsedIso) {
                        obj.dateISO = parsedIso;
                        (obj.matches || []).forEach(m => { m.defaultDateISO = parsedIso; });
                    }
                };
                if (pathType === "round-day") {
                    const rnd = (clone.rounds || []).find(x => x.id === targetId);
                    if (rnd?.days?.[Number(subIndex)]) applyToObj(rnd.days[Number(subIndex)]);
                } else if (pathType === "swiss-round") {
                    const grp = (clone.swissGroups || []).find(x => x.id === targetId);
                    if (grp?.rounds?.[Number(subIndex)]) applyToObj(grp.rounds[Number(subIndex)]);
                } else if (pathType === "rr-round") {
                    const grp = (clone.rrGroups || []).find(x => x.id === targetId);
                    if (grp?.rounds?.[Number(subIndex)]) applyToObj(grp.rounds[Number(subIndex)]);
                } else if (pathType === "playin-day") {
                    const piRound = clone.playInStage?.rounds?.find(x => x.id === targetId);
                    if (piRound?.days?.[Number(subIndex)]) applyToObj(piRound.days[Number(subIndex)]);
                } else if (pathType === "gsl-round") {
                    const grp = (clone.deGroups || []).find(x => x.id === targetId);
                    if (grp) {
                        (grp.matches || []).forEach(m => {
                            if (m.round === roundName) {
                                m.dateLabel = text;
                                m.dateEdited = true;
                                if (parsedIso) m.defaultDateISO = parsedIso;
                            }
                        });
                    }
                }
                await saveTournamentDoc(clone);
                return;
            }

            if (action === "toggle-winner") {
                const mId = el.dataset.matchId, uid = el.dataset.uid;
                if (!uid || uid === "__BYE__") return;
                if (clone.winners[mId] === uid && !clone.defaultWins[mId]) delete clone.winners[mId];
                else {
                    clone.winners[mId] = uid;
                    delete clone.defaultWins[mId];
                }
            } else if (action === "toggle-defwin") {
                const mId = el.dataset.matchId, uid = el.dataset.uid;
                if (!uid || uid === "__BYE__") return;
                if (clone.winners[mId] === uid && clone.defaultWins[mId]) {
                    delete clone.winners[mId];
                    delete clone.defaultWins[mId];
                } else {
                    clone.winners[mId] = uid;
                    clone.defaultWins[mId] = true;
                }
            } else if (action === "add-player-team") {
                const graph = resolveTournamentGraph(t);
                if (graph.participants.length >= t.maxTeams) return;
                const pUid = document.getElementById("tournament-player-select")?.value;
                const player = getPlayers().find(p => p.uid === pUid);
                if (!player) return;
                const uid = `player:${player.uid}`;
                if (graph.participants.some(p => p.uid === uid)) return;
                clone.participants.push({
                    uid, type: "player", playerUid: player.uid, username: player.username, name: getTeamName(player),
                    ...(curSlotGroup ? { slotGroup: curSlotGroup } : {})
                });
            } else if (action === "add-vrs-team") {
                const graph = resolveTournamentGraph(t);
                if (graph.participants.length >= t.maxTeams) return;
                const uid = document.getElementById("tournament-vrs-select")?.value;
                if (!uid || !selectedVrsDate || graph.participants.some(p => p.uid === uid)) return;
                const entry = getVrsEntriesForDate(selectedVrsDate).find(x => x.uid === uid);
                if (!entry) return;
                clone.participants.push({
                    uid: entry.uid, type: "vrs", name: entry.name, points: entry.points, rank: entry.rank, region: entry.region,
                    ...(curSlotGroup ? { slotGroup: curSlotGroup } : {})
                });
            } else if (action === "add-manual-team") {
                const graph = resolveTournamentGraph(t);
                if (graph.participants.length >= t.maxTeams) return;
                const input = document.getElementById("tournament-manual-team-name");
                const teamName = input?.value.trim();
                if (!teamName) return;
                const uid = `manual:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                clone.participants.push({
                    uid, type: "manual", name: teamName, points: 0,
                    ...(curSlotGroup ? { slotGroup: curSlotGroup } : {})
                });
                if (input) input.value = "";
            } else if (action === "fill-top-vrs") {
                const graph = resolveTournamentGraph(t);
                const existing = new Set(graph.participants.map(p => p.uid));
                let entries = getVrsEntriesForDate(selectedVrsDate);
                const val = Number(vrsFillValue) || 0;

                if (vrsFillMode === "rank") {
                    const startRank = Math.max(1, val);
                    entries = entries.filter(e => e.rank >= startRank);
                } else if (vrsFillMode === "maxPts") {
                    entries = entries.filter(e => e.points <= val);
                } else if (vrsFillMode === "minPts") {
                    entries = entries.filter(e => e.points >= val).reverse();
                }

                let cap = t.maxTeams - graph.participants.length;
                if (hasStage2Direct) {
                    const split = splitBaseParticipantsByTier(t);
                    const predSlots = t.qualifiedFrom?.slots?.length || 0;
                    if (selectedTierTarget === "playoffs_direct") {
                        cap = Math.max(0, (Number(t.directInvites) || 0) - split.playoffsDirectBase.length);
                    } else {
                        cap = Math.max(0, ((t.groupCount || 1) * (t.groupSize || 16)) - predSlots - split.stage1Base.length);
                    }
                }

                let added = 0;
                for (const entry of entries) {
                    if (added >= cap || (clone.participants.length >= t.maxTeams)) break;
                    if (existing.has(entry.uid)) continue;
                    clone.participants.push({
                        uid: entry.uid, type: "vrs", name: entry.name, points: entry.points, rank: entry.rank, region: entry.region,
                        ...(curSlotGroup ? { slotGroup: curSlotGroup } : {})
                    });
                    existing.add(entry.uid);
                    added++;
                }
            } else if (action === "remove-participant") {
                const uid = el.dataset.uid;
                clone.participants = clone.participants.filter(p => p.uid !== uid);
                for (const mId of Object.keys(clone.matches)) {
                    clone.matches[mId] = clone.matches[mId].map(s => (s === uid ? null : s));
                    if (clone.winners[mId] === uid) {
                        delete clone.winners[mId];
                        delete clone.defaultWins[mId];
                    }
                }
            } else if (action === "clear-participants") {
                if (!confirm("Alle manuell zugewiesenen Teams entfernen?")) return;
                clone.participants = []; clone.matches = {}; clone.winners = {}; clone.defaultWins = {};
            } else if (action === "auto-schedule-times") {
                const slots = ["12:00", "15:30", "18:30", "21:30", "10:00", "13:30", "17:00", "20:30"];
                const assign = (list) => list.forEach((m, i) => {
                    clone.matchSchedules[m.id] = clone.matchSchedules[m.id] || {};
                    clone.matchSchedules[m.id].time = slots[i % slots.length];
                });
                (clone.rounds || []).forEach(r => (r.days || []).forEach(d => assign(d.matches)));
                (clone.swissGroups || []).forEach(g => (g.rounds || []).forEach(r => assign(r.matches)));
                (clone.deGroups || []).forEach(g => assign(g.matches));
                (clone.rrGroups || []).forEach(g => (g.rounds || []).forEach(r => assign(r.matches)));
                if (clone.playInStage) (clone.playInStage.rounds || []).forEach(r => (r.days || []).forEach(d => assign(d.matches)));
            } else if (action === "autofill-first-round") {
                const list = resolveTournamentGraph(t).participants;
                const firstRound = t.rounds?.[0];
                if (!firstRound) return;
                let idx = 0;
                firstRound.days.forEach(d => d.matches.forEach(m => {
                    clone.matches[m.id] = [list[idx]?.uid || null, list[idx + 1]?.uid || null];
                    idx += 2;
                }));
                clone.winners = {}; clone.defaultWins = {};
            } else if (action === "autofill-r16-from-r32") {
                const winList = resolveTournamentGraph(t).r32Winners || [];
                const r16 = t.rounds?.find(r => r.id === "r16");
                if (!r16) return;
                let idx = 0;
                r16.days.forEach(d => d.matches.forEach(m => {
                    clone.matches[m.id] = [winList[idx] || null, winList[idx + 1] || null];
                    delete clone.winners[m.id];
                    delete clone.defaultWins[m.id];
                    idx += 2;
                }));
            } else if (action === "oq-seed-r1") {
                const size = Number(t.playoffSize) || 64;
                const list = resolveTournamentGraph(t).participants;
                const seeds = generateBracketSeeds(size);
                const r0 = t.rounds?.[0];
                if (!r0) return;
                let sIdx = 0;
                r0.days.forEach(d => d.matches.forEach(m => {
                    const seedA = seeds[sIdx], seedB = seeds[sIdx + 1];
                    clone.matches[m.id] = [
                        list[seedA - 1]?.uid || "__BYE__",
                        list[seedB - 1]?.uid || "__BYE__"
                    ];
                    sIdx += 2;
                }));
                clone.winners = {}; clone.defaultWins = {};
            } else if (action === "oq-autoresolve-byes") {
                const r0 = t.rounds?.[0];
                if (!r0) return;
                r0.days.forEach(d => d.matches.forEach(m => {
                    const sl = clone.matches[m.id] || [null, null];
                    const has0 = Boolean(sl[0] && sl[0] !== "__BYE__");
                    const has1 = Boolean(sl[1] && sl[1] !== "__BYE__");
                    if (has0 && !has1) {
                        clone.matches[m.id] = [sl[0], "__BYE__"];
                        clone.winners[m.id] = sl[0];
                        clone.defaultWins[m.id] = true;
                    } else if (has1 && !has0) {
                        clone.matches[m.id] = ["__BYE__", sl[1]];
                        clone.winners[m.id] = sl[1];
                        clone.defaultWins[m.id] = true;
                    }
                }));
            } else if (action === "autofill-de-group") {
                const gIdx = Number(el.dataset.groupIndex);
                const g = t.deGroups?.[gIdx];
                if (!g) return;
                const list = resolveTournamentGraph(t).participants.slice(gIdx * g.size, (gIdx + 1) * g.size);
                g.matches.slice(0, g.size / 2).forEach((m, i) => { clone.matches[m.id] = [list[i * 2]?.uid || null, list[i * 2 + 1]?.uid || null]; });
            } else if (action === "pair-swiss-round") {
                const gId = el.dataset.groupId, rIdx = Number(el.dataset.roundIndex);
                const gIdx = (t.swissGroups || []).findIndex(g => g.id === gId);
                const g = t.swissGroups?.[gIdx];
                if (!g) return;
                const graph = resolveTournamentGraph(t);
                const gTeams = getStage1ParticipantsRaw(t, graph.participants).slice(gIdx * g.teamCount, (gIdx + 1) * g.teamCount);
                const active = rIdx === 0 ? gTeams.map(p => ({ uid: p.uid, wins: 0, losses: 0, opponents: new Set() })) : (graph.swissStandings[gId] || []).filter(s => s.wins < g.winsToAdvance && s.losses < g.lossesToEliminate);
                const buckets = {};
                active.forEach(s => { const k = `${s.wins}-${s.losses}`; if (!buckets[k]) buckets[k] = []; buckets[k].push(s); });
                const pairs = [];
                Object.keys(buckets).sort((a, b) => Number(b.split("-")[0]) - Number(a.split("-")[0])).forEach(k => {
                    const pool = [...buckets[k]];
                    while (pool.length >= 2) {
                        const a = pool.shift();
                        let oppIdx = pool.findIndex(b => !a.opponents?.has(b.uid));
                        if (oppIdx === -1) oppIdx = 0;
                        const [b] = pool.splice(oppIdx, 1);
                        pairs.push([a.uid, b.uid]);
                    }
                });
                g.rounds[rIdx].matches.forEach((m, idx) => { clone.matches[m.id] = pairs[idx] || [null, null]; });
            } else if (action === "fill-playin-from-stage1") {
                const adv = resolveTournamentGraph(t).stageAdvancers;
                const pi = t.playInStage;
                if (!pi) return;
                let idx = 0;
                pi.rounds.forEach(r => r.days.forEach(d => d.matches.forEach(m => {
                    clone.matches[m.id] = [adv[idx] || null, adv[idx + 1] || null];
                    idx += 2;
                })));
            } else if (action === "fill-playoffs-from-groups") {
                const graph = resolveTournamentGraph(t);
                const adv = graph.stageAdvancers;
                const firstRound = t.rounds?.[0];
                if (!firstRound) return;
                if (t.playoffSize === 16 && t.directInvites === 8) {
                    const directTeams = getPlayoffDirectParticipantsRaw(t, graph.participants);
                    firstRound.days.flatMap(d => d.matches).forEach((m, i) => {
                        clone.matches[m.id] = [directTeams[i]?.uid || null, adv[7 - i] || adv[i] || null];
                    });
                } else if (t.playoffSize === 6) {
                    clone.matches[firstRound.days[0].matches[0].id] = [adv[2] || null, adv[5] || null];
                    clone.matches[firstRound.days[0].matches[1].id] = [adv[3] || null, adv[4] || null];
                    const sf = t.rounds[1]?.days?.[0]?.matches || [];
                    if (sf[0]) clone.matches[sf[0].id] = [adv[0] || null, null];
                    if (sf[1]) clone.matches[sf[1].id] = [adv[1] || null, null];
                } else {
                    let idx = 0;
                    firstRound.days.forEach(d => d.matches.forEach(m => {
                        clone.matches[m.id] = [adv[idx] || null, adv[idx + 1] || null];
                        idx += 2;
                    }));
                }
            } else if (action === "sync-predecessor-qf" || action === "clear-matches") {
                clone.matches = {}; clone.winners = {}; clone.defaultWins = {};
            } else {
                return;
            }
            await saveTournamentDoc(clone);
        });

        root.addEventListener("change", async (e) => {
            if (e.target.id === "tournament-tier-target") { selectedTierTarget = e.target.value; return; }
            if (e.target.id === "tournament-vrs-fill-mode") { vrsFillMode = e.target.value; return; }
            if (e.target.id === "tournament-vrs-offset-val") { vrsFillValue = e.target.value; return; }

            if (!isAdmin()) return;

            if (e.target.id === "tournaments-import-file") {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    const arr = JSON.parse(await file.text());
                    if (!Array.isArray(arr)) throw new Error("Ungültige JSON-Datei");
                    for (const item of arr) if (item?.id && item?.name) await saveTournamentDoc(item);
                    alert(`${arr.length} Turnier(e) importiert!`);
                } catch (err) { alert("Import fehlgeschlagen: " + err.message); }
                e.target.value = "";
                return;
            }
            if (e.target.id === "tournament-vrs-date") { selectedVrsDate = e.target.value; render(); return; }
            if (e.target.id === "tournament-status-select") {
                const t = getTournamentById(e.target.dataset.tournamentId);
                if (!t) return;
                const clone = structuredClone(t);
                const val = e.target.value;
                if (val === "auto") {
                    clone.statusMode = "auto";
                    clone.status = getEffectiveStatus(clone);
                } else {
                    clone.statusMode = "manual";
                    clone.status = val;
                }
                activeCategory = getEffectiveStatus(clone);
                await saveTournamentDoc(clone);
                return;
            }
            if (e.target.dataset.action === "set-match-slot") {
                const { tournamentId: tId, matchId: mId, slot: slotStr } = e.target.dataset;
                const slot = Number(slotStr), t = getTournamentById(tId);
                if (!t) return;
                const prevUid = resolveTournamentGraph(t).matchSlots[mId]?.[slot] || null;
                const val = e.target.value || "";
                const clone = structuredClone(t);
                clone.matches = clone.matches || {};
                clone.winners = clone.winners || {};
                clone.defaultWins = clone.defaultWins || {};
                if (!Array.isArray(clone.matches[mId])) clone.matches[mId] = [null, null];
                clone.matches[mId][slot] = val;
                if (prevUid && clone.winners[mId] === prevUid && val !== prevUid) {
                    delete clone.winners[mId];
                    delete clone.defaultWins[mId];
                }
                await saveTournamentDoc(clone);
                return;
            }
            if (e.target.dataset.action === "set-match-date" || e.target.dataset.action === "set-match-time") {
                const isDate = e.target.dataset.action === "set-match-date";
                const { tournamentId: tId, matchId: mId } = e.target.dataset;
                const val = e.target.value || "";
                const t = getTournamentById(tId);
                if (!t) return;
                const clone = structuredClone(t);
                clone.matchSchedules = clone.matchSchedules || {};
                clone.matchSchedules[mId] = clone.matchSchedules[mId] || {};
                if (val) clone.matchSchedules[mId][isDate ? "date" : "time"] = val;
                else {
                    delete clone.matchSchedules[mId][isDate ? "date" : "time"];
                    if (!clone.matchSchedules[mId].date && !clone.matchSchedules[mId].time) delete clone.matchSchedules[mId];
                }
                await saveTournamentDoc(clone);
            }
        });

        root.addEventListener("input", (e) => {
            if (e.target.id === "tournament-vrs-offset-val") {
                vrsFillValue = e.target.value;
                return;
            }
            if (e.target.id !== "tournament-vrs-search") return;
            vrsSearchTerm = e.target.value;
            const select = document.getElementById("tournament-vrs-select");
            const t = getTournamentById(activeTournamentId);
            if (!select || !t || !selectedVrsDate) return;
            const existing = new Set(resolveTournamentGraph(t).participants.map(p => p.uid));
            select.innerHTML = buildVrsSelectOptions(selectedVrsDate, vrsSearchTerm, existing);
        });
    }

    return {
        render,
        openTournament,
        renderManagingEmails,
        getPendingInviteCountForCurrentUser,
        getInitialSeedTournaments,
        closeEditor,
        resetActiveTournament: () => { activeTournamentId = null; },
        setup: () => { setupEvents(); setupEditorEvents(); }
    };
}
