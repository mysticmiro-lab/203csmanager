// ==================== CS2 MODULARES TURNIER-SYSTEM ====================
export function createTournamentsModule(deps) {
    const {
        getCurrentUser,
        getPlayers,
        getTeamName,
        getVrsRankingsMap,
        getSelectedRankingDate,
        getTournamentsCache,
        saveTournamentDoc,
        deleteTournamentDoc,
        onTitleChange
    } = deps;

    let activeCategory = "laufend";
    let activeTournamentId = null;
    let activeSubTab = "";
    let selectedVrsDate = "";
    let vrsSearchTerm = "";

    const esc = (str) => {
        const div = document.createElement("div");
        div.textContent = String(str ?? "");
        return div.innerHTML;
    };

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

    const getTournamentById = (id) => getTournamentsCache().find(t => t.id === id) || null;
    const isAdmin = () => getCurrentUser()?.role === "admin";

    function formatCategoryBadge(status) {
        if (status === "laufend") return { label: "🔴 Aktuell laufend", cls: "t-badge-laufend" };
        if (status === "zukuenftig") return { label: "🗓️ Zukünftig", cls: "t-badge-zukuenftig" };
        return { label: "🏁 Vergangen", cls: "t-badge-vergangen" };
    }

    // ==================== GENERATOREN FÜR ALLE STUFEN ====================
    function chunkIntoDays(matches, startDate, dayOffset, matchesPerDay, labelPrefix = "Tag") {
        const perDay = Math.max(1, Number(matchesPerDay) || 4);
        const days = [];
        for (let i = 0; i < matches.length; i += perDay) {
            const dIdx = Math.floor(i / perDay);
            const isoDate = addDaysISO(startDate, dayOffset + dIdx);
            days.push({
                dayLabel: `${labelPrefix} ${dayOffset + dIdx + 1}`,
                dateISO: isoDate,
                dateLabel: formatDateDE(isoDate),
                matches: matches.slice(i, i + perDay).map(m => ({ ...m, defaultDateISO: isoDate }))
            });
        }
        return { days, nextOffset: dayOffset + days.length };
    }

    // Double Elimination Play-In / Quali (16 Teams -> 20 Matches -> 8 Qualifikanten)
    function buildDoubleElimPlayoffs(size, startDate, dayOffset, defaultFormat, finalFormat, isQualifierMode = false) {
        let offset = dayOffset;

        if (size === 16 && isQualifierMode) {
            // Upper Bracket R1: 8 Matches
            const ubR1 = Array.from({ length: 8 }, (_, i) => ({
                id: `de-ub-r1-${i + 1}`,
                label: `UB Achtelfinale ${i + 1}`,
                format: defaultFormat,
                slotHints: [`Seed #${i * 2 + 1}`, `Seed #${i * 2 + 2}`]
            }));
            const d1 = chunkIntoDays(ubR1, startDate, offset, 4, "Play-In Tag");
            offset = d1.nextOffset;

            // Lower Bracket R1: 4 Matches (Verlierer von UB R1)
            const lbR1 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-lb-r1-${i + 1}`,
                label: `LB Runde 1 #${i + 1}`,
                format: defaultFormat,
                fromLosers: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`],
                slotHints: [`Verlierer UB R1 #${i * 2 + 1}`, `Verlierer UB R1 #${i * 2 + 2}`]
            }));
            const d3 = chunkIntoDays(lbR1, startDate, offset, 4, "Play-In Tag");

            // Upper Bracket R2 (Qualifying): 4 Matches (Sieger von UB R1)
            const ubR2 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-ub-r2-${i + 1}`,
                label: `UB Quali-Runde ${i + 1}`,
                format: defaultFormat,
                fromMatches: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`],
                slotHints: [`Sieger UB R1 #${i * 2 + 1}`, `Sieger UB R1 #${i * 2 + 2}`],
                isQualifyingMatch: true
            }));
            const d2 = chunkIntoDays(ubR2, startDate, offset, 4, "Play-In Tag");
            offset = Math.max(d2.nextOffset, d3.nextOffset);

            // Lower Bracket R2 (Qualifying): 4 Matches (Sieger LB R1 vs Absteiger UB R2)
            const lbR2 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-lb-r2-${i + 1}`,
                label: `LB Quali-Runde ${i + 1}`,
                format: defaultFormat,
                fromMixed: [
                    { type: "winner", id: `de-lb-r1-${i + 1}` },
                    { type: "loser", id: `de-ub-r2-${4 - i}` }
                ],
                slotHints: [`Sieger LB R1 #${i + 1}`, `Absteiger UB Quali #${5 - (i + 1)}`],
                isQualifyingMatch: true
            }));
            const d4 = chunkIntoDays(lbR2, startDate, offset, 4, "Play-In Tag");

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
                    { id: "ub-r1", name: "UB Runde 1", defaultFormat, subtitle: "8 Matches (BO3) · Sieger in UB R2, Verlierer in LB R1", days: d1.days },
                    { id: "lb-r1", name: "LB Runde 1", defaultFormat, subtitle: "4 Matches (BO3) · Sieger in LB R2, Verlierer raus", days: d3.days },
                    { id: "ub-r2", name: "UB Quali-Runde", defaultFormat, subtitle: "4 Matches (BO3) · 4 Sieger direkt qualifiziert!", days: d2.days },
                    { id: "lb-r2", name: "LB Quali-Runde", defaultFormat, subtitle: "4 Matches (BO3) · 4 Sieger qualifiziert!", days: d4.days }
                ]
            };
        }

        // Vollständiges 16er / 8er Double Elimination (bis Grand Final)
        if (size === 16) {
            const ubR1 = Array.from({ length: 8 }, (_, i) => ({ id: `de-ub-r1-${i + 1}`, label: `UB Achtelfinale ${i + 1}`, format: defaultFormat }));
            const d1 = chunkIntoDays(ubR1, startDate, offset, 4, "Playoff Tag");
            offset = d1.nextOffset;

            const ubQf = Array.from({ length: 4 }, (_, i) => ({ id: `de-ub-qf-${i + 1}`, label: `UB Viertelfinale ${i + 1}`, format: defaultFormat, fromMatches: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`] }));
            const d2 = chunkIntoDays(ubQf, startDate, offset, 4, "Playoff Tag");
            offset = d2.nextOffset;

            const ubSf = Array.from({ length: 2 }, (_, i) => ({ id: `de-ub-sf-${i + 1}`, label: `UB Halbfinale ${i + 1}`, format: defaultFormat, fromMatches: [`de-ub-qf-${i * 2 + 1}`, `de-ub-qf-${i * 2 + 2}`] }));
            const d3 = chunkIntoDays(ubSf, startDate, offset, 2, "Playoff Tag");
            offset = d3.nextOffset;

            const ubF = [{ id: "de-ub-f-1", label: "Upper Bracket Finale", format: defaultFormat, fromMatches: ["de-ub-sf-1", "de-ub-sf-2"] }];
            const d4 = chunkIntoDays(ubF, startDate, offset, 1, "Playoff Tag");
            offset = d4.nextOffset;

            const lbR1 = Array.from({ length: 4 }, (_, i) => ({ id: `de-lb-r1-${i + 1}`, label: `LB Runde 1 #${i + 1}`, format: defaultFormat, fromLosers: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`] }));
            const lbR2 = Array.from({ length: 4 }, (_, i) => ({ id: `de-lb-r2-${i + 1}`, label: `LB Runde 2 #${i + 1}`, format: defaultFormat, fromMixed: [{ type: "winner", id: `de-lb-r1-${i + 1}` }, { type: "loser", id: `de-ub-qf-${4 - i}` }] }));
            const lbR3 = Array.from({ length: 2 }, (_, i) => ({ id: `de-lb-r3-${i + 1}`, label: `LB Runde 3 #${i + 1}`, format: defaultFormat, fromMatches: [`de-lb-r2-${i * 2 + 1}`, `de-lb-r2-${i * 2 + 2}`] }));
            const lbR4 = Array.from({ length: 2 }, (_, i) => ({ id: `de-lb-r4-${i + 1}`, label: `LB Runde 4 #${i + 1}`, format: defaultFormat, fromMixed: [{ type: "winner", id: `de-lb-r3-${i + 1}` }, { type: "loser", id: `de-ub-sf-${2 - i}` }] }));
            const lbSf = [{ id: "de-lb-sf-1", label: "Lower Bracket Halbfinale", format: defaultFormat, fromMatches: ["de-lb-r4-1", "de-lb-r4-2"] }];
            const lbF = [{ id: "de-lb-f-1", label: "Lower Bracket Finale", format: defaultFormat, fromMixed: [{ type: "loser", id: "de-ub-f-1" }, { type: "winner", id: "de-lb-sf-1" }] }];
            const gf = [{ id: "de-gf-1", label: "Grand Final", format: finalFormat, fromMatches: ["de-ub-f-1", "de-lb-f-1"] }];

            return {
                isDoubleElim: true,
                isQualifierOnly: false,
                size: 16,
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
        const lbF = [{ id: "de8-lb-f-1", label: "LB Finale", format: defaultFormat, fromMixed: [{ type: "loser", id: "de8-ub-f-1" }, { type: "winner", id: `de8-lb-r2-1` }] }];
        const gf = [{ id: "de8-gf-1", label: "Grand Final", format: finalFormat, fromMatches: ["de8-ub-f-1", "de8-lb-f-1"] }];

        return {
            isDoubleElim: true,
            isQualifierOnly: false,
            size: 8,
            rounds: [
                { id: "ub-qf", name: "UB Viertelfinale", defaultFormat, days: chunkIntoDays(ubQf, startDate, offset, 4).days },
                { id: "ub-sf", name: "UB Halbfinale", defaultFormat, days: chunkIntoDays(ubSf, startDate, offset + 1, 2).days },
                { id: "ub-final", name: "UB Finale", defaultFormat, days: chunkIntoDays(ubF, startDate, offset + 2, 1).days },
                { id: "lb-r1", name: "LB Runde 1", defaultFormat, days: chunkIntoDays(lbR1, startDate, offset + 1, 2).days },
                { id: "lb-r2", name: "LB Runde 2", defaultFormat, days: chunkIntoDays(lbR2, startDate, offset + 2, 2).days },
                { id: "lb-final", name: "LB Finale", defaultFormat, days: chunkIntoDays(lbF, startDate, offset + 3, 1).days },
                { id: "grand-final", name: "Grand Final", defaultFormat: finalFormat, days: chunkIntoDays(gf, startDate, offset + 4, 1).days }
            ]
        };
    }

    // Single Elimination Playoffs (4, 6, 8, 16, 32)
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

        const stages = size === 32 && isQuali32
            ? [
                { id: "r32", name: "Round of 32", label: "R32 Match", count: 16, fmt: defaultFormat },
                { id: "r16", name: "Round of 16", label: "R16 Match", count: 8, fmt: defaultFormat }
            ]
            : size === 16
                ? [
                    { id: "r16", name: "Achtelfinale", label: "Achtelfinale", count: 8, fmt: defaultFormat },
                    { id: "qf", name: "Viertelfinale", label: "Viertelfinale", count: 4, fmt: defaultFormat },
                    { id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat },
                    { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }
                ]
                : size === 8
                    ? [
                        { id: "qf", name: "Viertelfinale", label: "Viertelfinale", count: 4, fmt: defaultFormat },
                        { id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat },
                        { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }
                    ]
                    : [
                        { id: "sf", name: "Halbfinale", label: "Halbfinale", count: 2, fmt: defaultFormat },
                        { id: "final", name: "Finale", label: "Grand Final", count: 1, fmt: finalFormat }
                    ];

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

    // Play-In Phase
    function buildPlayInStage(matchCount, startDate, dayOffset, format) {
        const matches = Array.from({ length: matchCount }, (_, i) => ({
            id: `pi-m-${i + 1}`,
            label: `Play-In Match ${i + 1}`,
            format,
            slotHints: [`Play-In Team ${i * 2 + 1}`, `Play-In Team ${i * 2 + 2}`]
        }));
        const chunked = chunkIntoDays(matches, startDate, dayOffset, Math.min(4, matchCount), "Play-In Tag");
        return {
            matchCount,
            advanceCount: matchCount,
            rounds: [{ id: "play-in-r1", name: "Play-In Phase", defaultFormat: format, subtitle: `${matchCount} Entscheidungs-Matches (${format}) → ${matchCount} Sieger qualifizieren sich`, days: chunked.days }],
            qualifierMatchIds: matches.map(m => m.id),
            nextOffset: chunked.nextOffset
        };
    }

    // Swiss Stage
    function buildSwissStage(groupId, name, teamCount, winsToAdvance, lossesToEliminate, startDate, dayOffset, defaultFormat, deciderFormat) {
        const roundCounts = teamCount >= 16 ? [8, 8, 8, 6, 3] : [4, 4, 2];
        const rounds = roundCounts.map((count, rIdx) => ({
            id: `sw-${groupId}-r${rIdx + 1}`,
            name: `Runde ${rIdx + 1}`,
            dateLabel: formatDateDE(addDaysISO(startDate, dayOffset + rIdx)),
            matches: Array.from({ length: count }, (_, i) => ({
                id: `sw-${groupId}-r${rIdx + 1}-${i + 1}`,
                label: `${name} R${rIdx + 1} #${i + 1}`,
                dateLabel: formatDateDE(addDaysISO(startDate, dayOffset + rIdx)),
                format: (rIdx >= roundCounts.length - 1 || (teamCount >= 16 && rIdx >= 2)) ? deciderFormat : defaultFormat
            }))
        }));
        return {
            id: groupId,
            name,
            teamCount,
            winsToAdvance,
            lossesToEliminate,
            rounds,
            nextOffset: dayOffset + roundCounts.length
        };
    }

    // GSL Gruppe
    function buildGslGroup(groupId, size, startDate, dayOffset, defaultFormat) {
        const p = `gsl-${groupId}`;
        const offset = dayOffset;
        if (size === 4) {
            return {
                id: groupId,
                name: `Gruppe ${groupId}`,
                size: 4,
                advanceCount: 2,
                matches: [
                    { id: `${p}-o1`, round: "Opening", label: `Grp ${groupId} Opening 1`, dateLabel: formatDateDE(addDaysISO(startDate, offset)), format: defaultFormat, slotHints: ["Seed 1", "Seed 4"] },
                    { id: `${p}-o2`, round: "Opening", label: `Grp ${groupId} Opening 2`, dateLabel: formatDateDE(addDaysISO(startDate, offset)), format: defaultFormat, slotHints: ["Seed 2", "Seed 3"] },
                    { id: `${p}-w1`, round: "Winners", label: `Grp ${groupId} Winners (Quali #1)`, dateLabel: formatDateDE(addDaysISO(startDate, offset + 1)), format: defaultFormat, fromMatches: [`${p}-o1`, `${p}-o2`], slotHints: ["Sieger Opening 1", "Sieger Opening 2"] },
                    { id: `${p}-l1`, round: "Elimination", label: `Grp ${groupId} Elimination`, dateLabel: formatDateDE(addDaysISO(startDate, offset + 1)), format: defaultFormat, fromLosers: [`${p}-o1`, `${p}-o2`], slotHints: ["Verlierer Opening 1", "Verlierer Opening 2"] },
                    { id: `${p}-d1`, round: "Decider", label: `Grp ${groupId} Decider (Quali #2)`, dateLabel: formatDateDE(addDaysISO(startDate, offset + 2)), format: defaultFormat, fromMixed: [{ type: "loser", id: `${p}-w1` }, { type: "winner", id: `${p}-l1` }], slotHints: ["Verlierer Winners", "Sieger Elimination"] }
                ],
                qualifierMatchIds: [`${p}-w1`, `${p}-d1`],
                nextOffset: offset + 3
            };
        }
        return {
            id: groupId,
            name: `Gruppe ${groupId}`,
            size: 8,
            advanceCount: 3,
            matches: [],
            qualifierMatchIds: [],
            nextOffset: offset + 2
        };
    }

    // Round Robin
    function buildRoundRobinGroup(groupId, size, advanceCount, startDate, dayOffset, defaultFormat) {
        const n = size % 2 === 0 ? size : size + 1;
        const arr = Array.from({ length: n }, (_, i) => i);
        const rounds = [];
        for (let r = 0; r < n - 1; r++) {
            const matches = [];
            for (let i = 0; i < n / 2; i++) {
                const a = arr[i], b = arr[n - 1 - i];
                if (a < size && b < size) {
                    matches.push({
                        id: `rr-${groupId}-r${r + 1}-${matches.length + 1}`,
                        label: `Grp ${groupId} · Tag ${r + 1} #${matches.length + 1}`,
                        dateLabel: formatDateDE(addDaysISO(startDate, dayOffset + r)),
                        format: defaultFormat,
                        initialSlotIndices: [a, b]
                    });
                }
            }
            rounds.push({ id: `rr-${groupId}-r${r + 1}`, name: `Spieltag ${r + 1}`, dateLabel: formatDateDE(addDaysISO(startDate, dayOffset + r)), matches });
            arr.splice(1, 0, arr.pop());
        }
        return {
            id: groupId,
            name: `Gruppe ${groupId}`,
            size,
            advanceCount,
            rounds,
            nextOffset: dayOffset + (n - 1)
        };
    }

    // ==================== HAUPT-BAUKASTEN ====================
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

        const hasPlayIn = Boolean(cfg.hasPlayIn);
        const playInMatches = Math.max(1, Math.min(8, Number(cfg.playInMatches) || 4));

        const hasPlayoffs = Boolean(cfg.hasPlayoffs);
        const playoffType = cfg.playoffType || "single_elim";
        const isDoubleElimQuali = playoffType === "double_elim_quali";
        const playoffSize = isDoubleElimQuali ? 16 : (Number(cfg.playoffSize) || 8);
        const directInvites = Math.max(0, Number(cfg.directInvites) || 0);
        const isQuali32 = Boolean(cfg.isQuali32 || cfg.bracketType === "quali32");

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
                    buildSwissStage(g, groupCount > 1 ? `Gruppe ${g} (Swiss)` : "Swiss Stage", groupSize, wins, wins, startDate, currentDayOffset, defaultFormat, deciderFormat)
                );
                currentDayOffset = Math.max(...swissGroups.map(g => g.nextOffset));
            } else if (stage1Type === "gsl") {
                deGroups = letters.slice(0, groupCount).map(g =>
                    buildGslGroup(g, groupSize, startDate, currentDayOffset, defaultFormat)
                );
                currentDayOffset = Math.max(...deGroups.map(g => g.nextOffset));
            } else if (stage1Type === "round_robin") {
                const adv = Number(cfg.advancePerGroup) || 2;
                rrGroups = letters.slice(0, groupCount).map(g =>
                    buildRoundRobinGroup(g, groupSize, adv, startDate, currentDayOffset, defaultFormat)
                );
                currentDayOffset = Math.max(...rrGroups.map(g => g.nextOffset));
            }
        }

        if (hasPlayIn) {
            playInStage = buildPlayInStage(playInMatches, startDate, currentDayOffset, defaultFormat);
            currentDayOffset = playInStage.nextOffset;
        }

        if (hasPlayoffs) {
            if (isDoubleElimQuali || playoffType === "double_elim") {
                isDoubleElimPlayoffs = true;
                const de = buildDoubleElimPlayoffs(
                    playoffSize >= 16 ? 16 : 8,
                    startDate,
                    currentDayOffset,
                    defaultFormat,
                    finalFormat,
                    isDoubleElimQuali
                );
                playoffRounds = de.rounds;
                if (de.isQualifierOnly) deQualiMeta = de;
            } else {
                playoffRounds = buildSingleElimPlayoffs(playoffSize, {
                    startDate,
                    dayOffset: currentDayOffset,
                    matchesPerDay,
                    defaultFormat,
                    finalFormat,
                    directInvites,
                    isQuali32
                });
            }
        }

        let totalTeams = 0;
        if (hasStage1) totalTeams += groupCount * groupSize;
        if (hasPlayoffs && directInvites > 0) totalTeams += directInvites;
        if (!hasStage1 && hasPlayoffs) totalTeams = isQuali32 ? 32 : playoffSize;
        if (!hasStage1 && !hasPlayoffs && hasPlayIn) totalTeams = playInMatches * 2;
        if (totalTeams === 0) totalTeams = 16;

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
                type: "warning",
                icon: "✈️",
                title: "Reise- & Folge-Turnier-Hinweis",
                text: cfg.travelNotice?.trim() || "Die Gewinner qualifizieren sich für das verknüpfte Folge-Turnier.",
                linkTournamentId: nextT ? nextT.id : "",
                linkLabel: nextT ? `→ Zu ${nextT.name}` : ""
            });
        }
        if (cfg.predecessorId) {
            const predT = getTournamentById(cfg.predecessorId);
            if (predT) {
                notices.push({
                    type: "neutral",
                    icon: "🏆",
                    title: "Automatische Qualifikation",
                    text: `Qualifizierte Teams aus „${predT.name}“ werden automatisch übernommen.`,
                    linkTournamentId: predT.id,
                    linkLabel: `← Zum Vorgängerturnier: ${predT.name}`
                });
            }
        }

        let qualifiedFrom = null;
        if (cfg.predecessorId) {
            const predT = getTournamentById(cfg.predecessorId);
            const count = (predT?.stageAdvancers?.length) || 8;
            qualifiedFrom = {
                tournamentId: cfg.predecessorId,
                slots: Array.from({ length: count }, (_, i) => ({ matchId: `q-${i + 1}`, label: `Qualifikant #${i + 1}` }))
            };
        }

        const stageParts = [];
        if (hasStage1) {
            if (stage1Type === "swiss") stageParts.push(`${groupCount > 1 ? `${groupCount}× ` : ""}${groupSize}er Swiss`);
            else if (stage1Type === "gsl") stageParts.push(`${groupCount}× ${groupSize}er GSL-Gruppen`);
            else stageParts.push(`${groupCount}× ${groupSize}er Round-Robin`);
        }
        if (hasPlayIn) stageParts.push(`Play-In (${playInMatches} Matches)`);
        if (hasPlayoffs) {
            if (isDoubleElimQuali) {
                stageParts.push(`Double-Elim Play-In / Quali (16 Teams → 8 weiter, 20 Matches)`);
            } else {
                stageParts.push(`${isDoubleElimPlayoffs ? "Double-Elim" : "Single-Elim"} ${playoffSize}er Playoffs${directInvites > 0 ? ` (${directInvites} Direkt-Einladungen)` : ""}`);
            }
        }

        const matchFormatSummary = defaultFormat === finalFormat ? `Best of ${defaultFormat.slice(2)} (${defaultFormat})` : `${defaultFormat} (Finale: ${finalFormat})`;

        return {
            id: cfg.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cfg.name.trim(),
            status: cfg.status || "zukuenftig",
            startDate,
            matchesPerDay,
            maxTeams: totalTeams,
            hasStage1,
            stage1Type,
            groupCount,
            groupSize,
            hasPlayIn,
            playInMatches,
            hasPlayoffs,
            playoffType,
            isDoubleElimQuali,
            deQualiMeta,
            playoffSize,
            directInvites,
            isQuali32,
            isDoubleElimPlayoffs,
            onlineDates: cfg.onlineDates.trim(),
            onlineRegion: cfg.onlineRegion.trim(),
            lanDates: (cfg.lanDates || "").trim(),
            lanLocation: (cfg.lanLocation || "").trim(),
            travelWindow: (cfg.travelWindow || "").trim(),
            defaultFormat,
            deciderFormat,
            finalFormat,
            matchFormatSummary,
            formatSummary: `${stageParts.join(" → ") || "Turnier"} (${matchFormatSummary})`,
            inviteSummary: (cfg.inviteSummary || `Top ${totalTeams} Teams`).trim(),
            nextTournamentId: cfg.nextTournamentId || "",
            qualifiedFrom,
            prizePoolTotal: prizeTotal,
            prizeDistribution,
            notices,
            swissGroups,
            deGroups,
            rrGroups,
            playInStage,
            rounds: playoffRounds,
            participants: cfg.existingParticipants || [],
            matches: cfg.existingMatches || {},
            matchSchedules: cfg.existingMatchSchedules || {},
            winners: cfg.existingWinners || {},
            sortOrder: cfg.sortOrder ?? Date.now(),
            createdAt: cfg.createdAt ?? Date.now()
        };
    }

    function getInitialSeedTournaments() {
        return [];
    }

    // ==================== TURNIER-GRAPH AUFLÖSEN ====================
    function resolveTournamentGraph(tournament, visited = new Set()) {
        if (!tournament || visited.has(tournament.id)) {
            return { participants: [], autoSlots: [], matchSlots: {}, matchWinners: {}, matchSchedules: {}, swissStandings: {}, rrStandings: {}, stageAdvancers: [] };
        }
        visited.add(tournament.id);

        const manual = Array.isArray(tournament.participants) ? tournament.participants : [];
        const matchesMap = tournament.matches || {};
        const winnersMap = tournament.winners || {};
        const matchSchedules = tournament.matchSchedules || {};

        let predGraph = null;
        if (tournament.qualifiedFrom?.tournamentId) {
            const predT = getTournamentById(tournament.qualifiedFrom.tournamentId);
            if (predT) predGraph = resolveTournamentGraph(predT, new Set(visited));
        }

        const autoSlots = [];
        const participants = [];
        const seen = new Set();

        if (tournament.qualifiedFrom && predGraph) {
            const predAdv = predGraph.stageAdvancers || [];
            (tournament.qualifiedFrom.slots || []).forEach((slot, idx) => {
                let winUid = predGraph.matchWinners[slot.matchId] || null;
                if (!winUid && predAdv[idx]) winUid = predAdv[idx];
                const pObj = winUid ? predGraph.participants.find(p => p.uid === winUid) : null;
                autoSlots.push({ matchId: slot.matchId, label: slot.label, participant: pObj ? { ...pObj, autoQualified: true } : null });
                if (pObj && !seen.has(pObj.uid)) {
                    seen.add(pObj.uid);
                    participants.push({ ...pObj, autoQualified: true });
                }
            });
        }

        manual.forEach(p => {
            if (!seen.has(p.uid)) {
                seen.add(p.uid);
                participants.push(p);
            }
        });

        const matchSlots = {};
        const matchWinners = {};

        const resolveMatch = (m, groupSlice = []) => {
            const stored = matchesMap[m.id];
            const row = [null, null];
            for (let s = 0; s < 2; s++) {
                if (Array.isArray(stored) && stored[s] !== undefined && stored[s] !== null) {
                    row[s] = stored[s];
                } else if (Array.isArray(m.initialSlotIndices) && groupSlice[m.initialSlotIndices[s]]) {
                    row[s] = groupSlice[m.initialSlotIndices[s]].uid;
                } else if (Array.isArray(m.fromMatches) && m.fromMatches[s]) {
                    row[s] = matchWinners[m.fromMatches[s]] || null;
                } else if (Array.isArray(m.fromLosers) && m.fromLosers[s]) {
                    const srcId = m.fromLosers[s];
                    const w = matchWinners[srcId], sl = matchSlots[srcId] || [null, null];
                    row[s] = (w && sl[0] && sl[1]) ? (w === sl[0] ? sl[1] : sl[0]) : null;
                } else if (Array.isArray(m.fromMixed) && m.fromMixed[s]) {
                    const cfg = m.fromMixed[s];
                    const w = matchWinners[cfg.id], sl = matchSlots[cfg.id] || [null, null];
                    row[s] = cfg.type === "winner" ? (w || null) : ((w && sl[0] && sl[1]) ? (w === sl[0] ? sl[1] : sl[0]) : null);
                } else if (Array.isArray(m.fromPredecessor) && m.fromPredecessor[s] && predGraph) {
                    row[s] = predGraph.matchWinners[m.fromPredecessor[s]] || null;
                }
                if (row[s] && !seen.has(row[s])) row[s] = null;
            }
            matchSlots[m.id] = row;
            const rawW = winnersMap[m.id] || null;
            matchWinners[m.id] = (rawW && (rawW === row[0] || rawW === row[1])) ? rawW : null;
        };

        const swissStandings = {};
        const rrStandings = {};
        const stageAdvancers = [];

        // 1. Swiss
        (tournament.swissGroups || []).forEach((g, gIdx) => {
            const gTeams = participants.slice(gIdx * g.teamCount, (gIdx + 1) * g.teamCount);
            const table = {};
            gTeams.forEach((p, idx) => { table[p.uid] = { uid: p.uid, seed: idx + 1, wins: 0, losses: 0, opponents: new Set() }; });
            g.rounds.forEach(r => r.matches.forEach(m => {
                resolveMatch(m);
                const sl = matchSlots[m.id], w = matchWinners[m.id];
                if (sl[0] && sl[1]) {
                    if (table[sl[0]]) table[sl[0]].opponents.add(sl[1]);
                    if (table[sl[1]]) table[sl[1]].opponents.add(sl[0]);
                }
                if (w && sl[0] && sl[1]) {
                    const l = w === sl[0] ? sl[1] : sl[0];
                    if (table[w]) table[w].wins++;
                    if (table[l]) table[l].losses++;
                }
            }));
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
            const gTeams = participants.slice(gIdx * g.size, (gIdx + 1) * g.size);
            const table = {};
            gTeams.forEach((p, idx) => { table[p.uid] = { uid: p.uid, seed: idx + 1, played: 0, wins: 0, losses: 0, points: 0 }; });
            g.rounds.forEach(r => r.matches.forEach(m => {
                resolveMatch(m, gTeams);
                const sl = matchSlots[m.id], w = matchWinners[m.id];
                if (w && sl[0] && sl[1]) {
                    const l = w === sl[0] ? sl[1] : sl[0];
                    if (table[w]) { table[w].played++; table[w].wins++; table[w].points += 3; }
                    if (table[l]) { table[l].played++; table[l].losses++; }
                }
            }));
            const sorted = Object.values(table).sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.seed - b.seed);
            rrStandings[g.id] = sorted;
            sorted.slice(0, g.advanceCount || 2).forEach(row => { if (row.played > 0) stageAdvancers.push(row.uid); });
        });

        // 4. Play-In
        if (tournament.playInStage) {
            tournament.playInStage.rounds.forEach(r => r.days.forEach(d => d.matches.forEach(m => resolveMatch(m))));
            (tournament.playInStage.qualifierMatchIds || []).forEach(qId => {
                if (matchWinners[qId]) stageAdvancers.push(matchWinners[qId]);
            });
        }

        // 5. Playoffs
        (tournament.rounds || []).forEach(r => r.days.forEach(d => d.matches.forEach(m => resolveMatch(m))));

        // 6. Double Elim Qualifier / Play-In Qualifikanten einsammeln (4 Upper + 4 Lower = 8 Weiter)
        if (tournament.isDoubleElimQuali && tournament.deQualiMeta?.qualifierMatchIds) {
            tournament.deQualiMeta.qualifierMatchIds.forEach(qId => {
                if (matchWinners[qId]) stageAdvancers.push(matchWinners[qId]);
            });
        } else if (tournament.isQuali32) {
            (tournament.rounds?.[1]?.days || []).flatMap(d => d.matches).forEach(m => {
                if (matchWinners[m.id]) stageAdvancers.push(matchWinners[m.id]);
            });
        }

        return { participants, autoSlots, matchSlots, matchWinners, matchSchedules, swissStandings, rrStandings, stageAdvancers };
    }

    function buildMatchSlotMarkup(tId, match, slotIdx, assignedUid, winnerUid, participants, admin, preferredUids = []) {
        const resolved = getResolvedParticipant(assignedUid, participants);
        const isWin = Boolean(winnerUid && assignedUid && winnerUid === assignedUid);
        const isLoss = Boolean(winnerUid && assignedUid && winnerUid !== assignedUid);

        if (!admin) {
            if (!resolved) {
                const hint = match.slotHints?.[slotIdx] ? `TBD (${match.slotHints[slotIdx]})` : "TBD";
                return `<div class="match-team-row tbd"><span>${esc(hint)}</span><span>–</span></div>`;
            }
            return `<div class="match-team-row ${isWin ? "winner" : (isLoss ? "loser" : "")}"><span>${resolved.icon} ${esc(resolved.displayName)}</span><span style="font-size:.72rem;">${isWin ? "🏆 Sieger" : (resolved.type === "player" ? "Spieler" : "VRS")}</span></div>`;
        }

        const prefSet = new Set(preferredUids.filter(Boolean));
        const sorted = [...participants].sort((a, b) => (prefSet.has(a.uid) ? 0 : 1) - (prefSet.has(b.uid) ? 0 : 1));
        const options = sorted.map(p => {
            const info = getResolvedParticipant(p.uid, participants);
            return `<option value="${esc(p.uid)}" ${p.uid === assignedUid ? "selected" : ""}>${prefSet.has(p.uid) ? "★ " : ""}${info.icon} ${esc(info.displayName)}</option>`;
        }).join("");
        const tbd = match.slotHints?.[slotIdx] ? `-- TBD (${match.slotHints[slotIdx]}) --` : "-- TBD (Offen) --";

        return `
            <div class="match-admin-slot">
                <select class="match-team-select ${isWin ? "is-winner" : ""}" data-action="set-match-slot" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" data-slot="${slotIdx}">
                    <option value="">${esc(tbd)}</option>${options}
                </select>
                <button type="button" class="btn-winner-toggle ${isWin ? "active" : ""}" data-action="toggle-winner" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" data-uid="${esc(assignedUid || "")}" ${!assignedUid ? "disabled" : ""} title="Als Sieger festlegen">🏆</button>
            </div>
        `;
    }
    
    // ==================== RENDERING & MATCH-KARTEN ====================
    function renderMatchCard(tId, match, defaultDateLabel, dayLabel, matchFormat, graph, admin, preferred = []) {
        const slots = graph.matchSlots[match.id] || [null, null];
        const winUid = graph.matchWinners[match.id] || null;
        const fmt = String(matchFormat || match.format || "BO3").toUpperCase();
        const fmtCls = fmt === "BO5" ? "bo5" : "bo3";

        const sched = graph.matchSchedules?.[match.id] || {};
        const matchDateISO = sched.date || match.defaultDateISO || "";
        const matchTime = sched.time || match.time || "";
        const displayDateLabel = matchDateISO ? formatDateDE(matchDateISO) : defaultDateLabel;

        const scheduleMarkup = admin
            ? `<div class="match-admin-schedule">
                   <input type="date" class="match-date-input" data-action="set-match-date" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" value="${esc(matchDateISO)}" title="Spieldatum ändern">
                   <input type="time" class="match-time-input" data-action="set-match-time" data-tournament-id="${esc(tId)}" data-match-id="${esc(match.id)}" value="${esc(matchTime)}" title="Spielzeit ändern">
               </div>`
            : `<span class="match-date-pill">${esc(dayLabel ? `${dayLabel} · ` : "")}${esc(displayDateLabel)}${matchTime ? ` · ${esc(matchTime)} Uhr` : ""}</span>`;

        return `
            <div class="match-card">
                <div class="match-card-header">
                    <div class="match-card-title">
                        <strong>${esc(match.label)}</strong>
                        <span class="match-format-pill ${fmtCls}">${esc(fmt)}</span>
                    </div>
                    <div class="match-schedule-info">${scheduleMarkup}</div>
                </div>
                ${buildMatchSlotMarkup(tId, match, 0, slots[0], winUid, graph.participants, admin, preferred)}
                ${buildMatchSlotMarkup(tId, match, 1, slots[1], winUid, graph.participants, admin, preferred)}
            </div>
        `;
    }

    function renderQuali32Bracket(t, graph, admin) {
        const r32 = t.rounds.find(r => r.id === "r32");
        const r16 = t.rounds.find(r => r.id === "r16");
        if (!r32 || !r16) return "";
        const r32Map = {};
        r32.days.forEach(d => d.matches.forEach(m => { r32Map[m.id] = { m, d }; }));
        const r16List = r16.days.flatMap(d => d.matches.map(m => ({ m, d })));

        const pairs = r16List.map((item, idx) => {
            const [lId, rId] = item.m.fromMatches || [];
            const l = r32Map[lId], r = r32Map[rId];
            if (!l || !r) return "";
            const feed = [...(graph.matchSlots[lId] || []), ...(graph.matchSlots[rId] || [])].filter(Boolean);
            const winUid = graph.matchWinners[item.m.id];
            const winInfo = winUid ? getResolvedParticipant(winUid, graph.participants) : null;
            const hasNext = Boolean(t.nextTournamentId && getTournamentById(t.nextTournamentId));
            const pillTxt = winInfo
                ? `✅ ${winInfo.icon} ${esc(winInfo.displayName)}<br><span style="font-weight:400;">Qualifiziert (Top 8)</span>`
                : `🏆 Top 8 Platz #${idx + 1}<br><span style="font-weight:400; color:#fde68a;">→ LAN Finals</span>`;
            const pill = hasNext
                ? `<button type="button" class="lan-qual-pill ${winInfo ? "qualified" : ""}" data-action="open-tournament" data-tournament-id="${esc(t.nextTournamentId)}">${pillTxt}</button>`
                : `<div class="lan-qual-pill ${winInfo ? "qualified" : ""}" style="cursor:default;">${pillTxt}</div>`;

            return `
                <div class="bracket-pair">
                    <div class="bracket-pair-r32">
                        ${renderMatchCard(t.id, l.m, l.d.dateLabel, l.d.dayLabel, l.m.format || r32.defaultFormat, graph, admin)}
                        ${renderMatchCard(t.id, r.m, r.d.dateLabel, r.d.dayLabel, r.m.format || r32.defaultFormat, graph, admin)}
                    </div>
                    <div class="bracket-connector"></div>
                    <div class="bracket-pair-r16">${renderMatchCard(t.id, item.m, item.d.dateLabel, item.d.dayLabel, item.m.format || r16.defaultFormat, graph, admin, feed)}</div>
                    <div class="bracket-lan-cell">${pill}</div>
                </div>
            `;
        }).join("");

        return `
            ${admin ? `<div class="bracket-toolbar"><span class="muted">Admin: Teams wählen und per 🏆 Sieger weiterleiten.</span><div class="news-form-actions" style="margin-top:0;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Standard-Zeiten verteilen</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 R32 setzen</button><button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Leeren</button></div></div>` : ""}
            <div class="bracket-scroll"><div class="bracket-board">
                <div class="bracket-col-headers">
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="r32">⚔️ Round of 32 (16 · ${esc(r32.defaultFormat || "BO3")})<small>${esc(t.onlineDates)} · Tage 1–4</small></div>
                    <div></div>
                    <div class="bracket-col-head clickable" data-action="switch-subtab" data-subtab="r16">🔥 Round of 16 (8 · ${esc(r16.defaultFormat || "BO3")})<small>4 Matches pro Tag</small></div>
                    <div class="bracket-col-head ${t.nextTournamentId ? "clickable" : ""}" ${t.nextTournamentId ? `data-action="open-tournament" data-tournament-id="${esc(t.nextTournamentId)}"` : ""}>✈️ Top 8 Quali<small>${esc(t.lanDates || "LAN Finals")}</small></div>
                </div>${pairs}
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
            const isFirst = rIdx === 0;
            const isFinal = rIdx === rounds.length - 1;
            const cards = flat.map(it => {
                const pref = Array.isArray(it.m.fromMatches) ? [...(graph.matchSlots[it.m.fromMatches[0]] || []), ...(graph.matchSlots[it.m.fromMatches[1]] || [])].filter(Boolean) : [];
                const card = renderMatchCard(t.id, it.m, it.d.dateLabel, it.d.dayLabel, it.fmt, graph, admin, pref);
                return (isFirst && t.playoffSize !== 6) ? card : `<div class="classic-round-slot">${card}</div>`;
            }).join("");

            let conn = "";
            if (!isFinal) {
                const connCount = t.playoffSize === 6 && rIdx === 0 ? 2 : flat.length / 2;
                conn = `<div class="classic-col-conn">${Array.from({ length: connCount }, () => '<div class="bracket-connector"></div>').join("")}</div>`;
            }
            return `<div class="classic-col-round ${isFinal ? "classic-col-final" : ""}">${cards}</div>${conn}`;
        }).join("");

        const finalMId = rounds[rounds.length - 1]?.days?.[0]?.matches?.[0]?.id;
        const champUid = finalMId ? graph.matchWinners[finalMId] : null;
        const champ = champUid ? getResolvedParticipant(champUid, graph.participants) : null;
        const prize1 = t.prizeDistribution?.[0]?.amount;
        const prizeLbl = prize1 ? `${prize1.toLocaleString("de-DE")} $ Preisgeld` : (t.prizePoolTotal ? `${t.prizePoolTotal.toLocaleString("de-DE")} $ Preispool` : "Turniersieger");

        const advAction = (t.hasStage1 || t.hasPlayIn || t.isDoubleElimQuali)
            ? `<button type="button" class="btn btn-secondary btn-small" data-action="fill-playoffs-from-groups" data-tournament-id="${esc(t.id)}">⚡ Qualifizierte Teams in Playoffs setzen</button>`
            : (t.qualifiedFrom
                ? `<button type="button" class="btn btn-secondary btn-small" data-action="sync-predecessor-qf" data-tournament-id="${esc(t.id)}">🔄 Qualifizierte Teams übernehmen</button>`
                : `<button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer in Runde 1 setzen</button>`);

        const qualiInfoBox = t.isDoubleElimQuali ? `<div class="tournament-notice info" style="margin-bottom:14px;"><strong>ℹ️ Play-In / Quali-Modus (20 Matches)</strong><span>Nach Runde 2 im Upper & Lower Bracket stehen die 8 Weiterkommenden (4 Upper + 4 Lower) fest. Über den Button „Qualifizierte Teams in nächste Stufe setzen“ kannst du sie an ein Folge-Turnier übergeben.</span></div>` : "";

        return `
            ${admin ? `<div class="bracket-toolbar"><span class="muted">Admin: Sieger per 🏆 festlegen.</span><div class="news-form-actions" style="margin-top:0;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Standard-Zeiten verteilen</button>${advAction}<button type="button" class="btn btn-danger btn-small" data-action="clear-matches" data-tournament-id="${esc(t.id)}">🧹 Zurücksetzen</button></div></div>` : ""}
            ${qualiInfoBox}
            <div class="bracket-scroll"><div class="classic-bracket ${rounds.length >= 4 ? "is-16" : ""}">
                <div class="classic-col-headers ${rounds.length >= 4 ? "is-16" : ""}">${headers}<div class="bracket-col-head">🥇 Sieger<small>${esc(t.prizePoolTotal ? `${t.prizePoolTotal.toLocaleString("de-DE")} $ Pool` : t.onlineDates)}</small></div></div>
                <div class="classic-bracket-body ${rounds.length >= 4 ? "is-16" : ""}">${cols}<div class="classic-col-champ"><div class="champion-box"><small>🏆 ${champ ? "Champion · 1. Platz" : "Turniersieger"}</small><strong>${champ ? `${champ.icon} ${esc(champ.displayName)}` : "TBD"}</strong><span>${esc(prizeLbl)}</span></div></div></div>
            </div></div>
        `;
    }

    function renderSwissTab(t, graph, admin) {
        return (t.swissGroups || []).map(g => {
            const standingRows = (graph.swissStandings[g.id] || []).map((row, idx) => {
                const info = getResolvedParticipant(row.uid, graph.participants);
                const statusTxt = row.wins >= g.winsToAdvance ? "✅ Weiter" : (row.losses >= g.lossesToEliminate ? "❌ Raus" : "⚔️ Aktiv");
                const cls = row.wins >= g.winsToAdvance ? "row-qualified" : (row.losses >= g.lossesToEliminate ? "row-eliminated" : "");
                return `<tr class="${cls}"><td>${idx + 1}</td><td>${info ? `${info.icon} ${esc(info.displayName)}` : "–"}</td><td><strong>${row.wins} - ${row.losses}</strong></td><td>${statusTxt}</td></tr>`;
            }).join("");

            const roundsHtml = g.rounds.map((r, rIdx) => `
                <div class="round-day-card">
                    <div class="round-day-header">
                        <strong>${esc(r.name)} (${esc(r.dateLabel)})</strong>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="pair-swiss-round" data-tournament-id="${esc(t.id)}" data-group-id="${esc(g.id)}" data-round-index="${rIdx}" ${graph.participants.length < 2 ? "disabled" : ""}>⚡ Paaren</button>` : `<span>${r.matches.length} Matches</span>`}
                    </div>
                    ${r.matches.map(m => renderMatchCard(t.id, m, r.dateLabel, r.name, m.format, graph, admin)).join("")}
                </div>
            `).join("");

            return `
                <div class="stage-group-block">
                    <div class="bracket-toolbar">
                        <h3>🇨🇭 ${esc(g.name)} (${g.teamCount} Teams · ${g.winsToAdvance} Siege = Weiter, ${g.lossesToEliminate} Niederlagen = Raus)</h3>
                        ${admin ? `<button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten verteilen</button>` : ""}
                    </div>
                    <div class="ranking-table-wrap" style="margin-bottom:14px;">
                        <table class="ranking-table stage-table">
                            <thead><tr><th>#</th><th>Team</th><th>Bilanz (S-N)</th><th>Status</th></tr></thead>
                            <tbody>${standingRows || `<tr><td colspan="4" class="muted">Noch keine Teams zugewiesen.</td></tr>`}</tbody>
                        </table>
                    </div>
                    <div class="round-days-grid">${roundsHtml}</div>
                </div>
            `;
        }).join("");
    }

    function renderGslTab(t, graph, admin) {
        return (t.deGroups || []).map((g, gIdx) => {
            const byRound = {};
            g.matches.forEach(m => {
                if (!byRound[m.round]) byRound[m.round] = [];
                byRound[m.round].push(m);
            });
            const roundsHtml = Object.entries(byRound).map(([rName, list]) => `
                <div class="round-day-card">
                    <div class="round-day-header"><strong>${esc(rName)}</strong><span>${list.length} Matches</span></div>
                    ${list.map(m => renderMatchCard(t.id, m, m.dateLabel, "", m.format, graph, admin)).join("")}
                </div>
            `).join("");

            return `
                <div class="stage-group-block">
                    <div class="bracket-toolbar">
                        <h3>⚔️ ${esc(g.name)} (GSL / Double-Elim · ${g.size} Teams)</h3>
                        ${admin ? `<div style="display:flex; gap:6px;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button><button type="button" class="btn btn-secondary btn-small" data-action="autofill-de-group" data-tournament-id="${esc(t.id)}" data-group-index="${gIdx}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teams setzen</button></div>` : ""}
                    </div>
                    <div class="round-days-grid">${roundsHtml}</div>
                </div>
            `;
        }).join("");
    }

    function renderRoundRobinTab(t, graph, admin) {
        return (t.rrGroups || []).map(g => {
            const standingRows = (graph.rrStandings[g.id] || []).map((row, idx) => {
                const info = getResolvedParticipant(row.uid, graph.participants);
                const adv = idx < (g.advanceCount || 2);
                return `<tr class="${adv ? "row-qualified" : ""}"><td>${idx + 1}</td><td>${info ? `${info.icon} ${esc(info.displayName)}` : "–"}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.losses}</td><td><strong>${row.points}</strong></td><td>${adv ? "✅ Weiter" : "–"}</td></tr>`;
            }).join("");

            const roundsHtml = g.rounds.map(r => `
                <div class="round-day-card">
                    <div class="round-day-header"><strong>${esc(r.name)}</strong><span>${esc(r.dateLabel)}</span></div>
                    ${r.matches.map(m => renderMatchCard(t.id, m, r.dateLabel, r.name, m.format, graph, admin)).join("")}
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
                ${r.days.map(d => `
                    <div class="round-day-card">
                        <div class="round-day-header"><strong>${esc(d.dayLabel)} · ${esc(d.dateLabel)}</strong><span>${d.matches.length} Matches</span></div>
                        ${d.matches.map(m => renderMatchCard(t.id, m, d.dateLabel, d.dayLabel, m.format, graph, admin)).join("")}
                    </div>
                `).join("")}
            </div>
        `).join("");

        return `
            <div class="stage-group-block">
                <div class="bracket-toolbar">
                    <div>
                        <h3>⚡ Play-In Phase (${stage.matchCount} Entscheidungs-Matches)</h3>
                        <p class="muted">Die ${stage.advanceCount} Gewinner qualifizieren sich direkt für die nächste Stufe.</p>
                    </div>
                    ${admin ? `<div style="display:flex; gap:6px;"><button type="button" class="btn btn-secondary btn-small" data-action="auto-schedule-times" data-tournament-id="${esc(t.id)}">⏰ Zeiten</button><button type="button" class="btn btn-secondary btn-small" data-action="fill-playin-from-stage1" data-tournament-id="${esc(t.id)}">⚡ Teams übernehmen</button></div>` : ""}
                </div>
                ${matchesHtml}
            </div>
        `;
    }

    function renderRoundTab(t, round, graph, admin, rIdx) {
        const fmt = round.defaultFormat || t.defaultFormat || "BO3";
        const daysHtml = round.days.map(d => `
            <div class="round-day-card">
                <div class="round-day-header"><strong>${esc(d.dayLabel)} · ${esc(d.dateLabel)}</strong><span>${d.matches.length} Matches</span></div>
                ${d.matches.map(m => renderMatchCard(t.id, m, d.dateLabel, d.dayLabel, m.format || fmt, graph, admin)).join("")}
            </div>
        `).join("");
        return `<div class="bracket-toolbar"><div><h3>${esc(round.name)}</h3><p class="muted">${esc(round.subtitle || "")}</p></div>${admin && rIdx === 0 && !t.qualifiedFrom ? `<button type="button" class="btn btn-secondary btn-small" data-action="autofill-first-round" data-tournament-id="${esc(t.id)}" ${graph.participants.length === 0 ? "disabled" : ""}>🎲 Teilnehmer setzen</button>` : ""}</div><div class="round-days-grid">${daysHtml}</div>`;
    }

    function renderPrizePoolBox(t, graph) {
        if (!t.prizePoolTotal || !t.prizeDistribution?.length) return "";
        const rounds = t.rounds || [];
        const finalId = rounds[rounds.length - 1]?.days?.[0]?.matches?.[0]?.id || "final-1";
        const loser = (mId) => {
            const w = graph.matchWinners[mId], sl = graph.matchSlots[mId] || [null, null];
            return (w && sl[0] && sl[1]) ? (w === sl[0] ? sl[1] : sl[0]) : null;
        };
        const resolve = (type) => {
            if (type === "final-winner") return [graph.matchWinners[finalId]].filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            if (type === "final-loser") return [loser(finalId)].filter(Boolean).map(u => getResolvedParticipant(u, graph.participants)).filter(Boolean);
            return [];
        };

        return `
            <div class="prize-pool-box">
                <div class="prize-pool-header"><h3>💰 Preisgeldverteilung</h3><span class="prize-total">Gesamtpreispool: ${Number(t.prizePoolTotal).toLocaleString("de-DE")} $</span></div>
                <div class="prize-grid">${t.prizeDistribution.map(tier => {
                    const teams = resolve(tier.sourceType);
                    return `<div class="prize-tier"><div class="prize-tier-top"><strong>${esc(tier.place)}</strong><span class="prize-tier-amount">${Number(tier.amount).toLocaleString("de-DE")} $${esc(tier.labelSuffix || "")}</span></div><div class="prize-tier-teams">${teams.length ? teams.map(x => `${x.icon} ${esc(x.displayName)}`).join(" · ") : "Noch offen"}</div></div>`;
                }).join("")}</div>
            </div>
        `;
    }

    function getResolvedParticipant(uid, participants) {
        if (!uid) return null;
        const found = participants.find(p => p.uid === uid);
        if (!found) return null;
        if (found.type === "player") {
            const live = getPlayers().find(p => p.uid === found.playerUid || p.username === found.username);
            return { ...found, displayName: live ? getTeamName(live) : found.name, icon: "🛡️", badgeText: `Spieler (${found.username})` };
        }
        return { ...found, displayName: found.name, icon: "🏆", badgeText: found.rank ? `VRS #${found.rank} (${found.points} Pkt)` : "VRS-Team" };
    }
    
    function getVrsEntriesForDate(date) {
        const list = getVrsRankingsMap()[date] || [];
        const counts = {};
        return list.map((item, idx) => {
            const name = String(item[0]);
            counts[name] = (counts[name] || 0) + 1;
            return {
                uid: `vrs:${name}#${counts[name]}`,
                rank: idx + 1,
                name,
                points: Number(item[1]) || 0,
                region: item[2] ? String(item[2]) : ""
            };
        });
    }
    
    function buildVrsSelectOptions(vrsDate, q, existing) {
        const list = getVrsEntriesForDate(vrsDate);
        const low = q.trim().toLowerCase();
        const filtered = low ? list.filter(e => e.name.toLowerCase().includes(low)) : list;
        if (!filtered.length) return `<option value="">Keine passenden VRS-Teams gefunden</option>`;
        return filtered.map(e => `<option value="${esc(e.uid)}" ${existing.has(e.uid) ? "disabled" : ""}>#${e.rank} ${esc(e.name)} (${e.points} Pkt${e.region ? ` · ${esc(e.region)}` : ""})${existing.has(e.uid) ? " ✓" : ""}</option>`).join("");
    }

    function renderParticipantsTab(t, graph, admin) {
        const parts = graph.participants;
        const manual = Array.isArray(t.participants) ? t.participants : [];
        const existing = new Set(parts.map(p => p.uid));
        const full = parts.length >= t.maxTeams;

        let adminBox = "";
        if (admin) {
            const players = getPlayers();
            const pOpts = players.length
                ? players.map(p => {
                    const uid = `player:${p.uid}`;
                    return `<option value="${esc(p.uid)}" ${existing.has(uid) ? "disabled" : ""}>🛡️ ${esc(getTeamName(p))} (${esc(p.username)})${existing.has(uid) ? " ✓" : ""}</option>`;
                }).join("")
                : `<option value="">Keine Spieler erstellt</option>`;

            const vrsMap = getVrsRankingsMap();
            const dates = Object.keys(vrsMap).sort();
            const activeDate = getSelectedRankingDate();
            if (!selectedVrsDate || !vrsMap[selectedVrsDate]) selectedVrsDate = vrsMap[activeDate] ? activeDate : (dates[0] || "");
            const dOpts = dates.map(d => `<option value="${esc(d)}" ${d === selectedVrsDate ? "selected" : ""}>${esc(d)}</option>`).join("");
            const vOpts = selectedVrsDate ? buildVrsSelectOptions(selectedVrsDate, vrsSearchTerm, existing) : `<option value="">Keine VRS-Daten</option>`;

            adminBox = `
                <div class="tournament-admin-box">
                    <div class="tournament-card-top">
                        <h3>🛡️ Admin: Teams zuweisen (${parts.length} / ${t.maxTeams})</h3>
                        <div class="news-form-actions" style="margin-top:0;">
                            <button type="button" class="btn btn-secondary btn-small" data-action="fill-top-vrs" data-tournament-id="${esc(t.id)}" ${full || !selectedVrsDate ? "disabled" : ""}>⚡ Freie Plätze mit VRS-Top-Teams auffüllen</button>
                            <button type="button" class="btn btn-danger btn-small" data-action="clear-participants" data-tournament-id="${esc(t.id)}" ${manual.length === 0 ? "disabled" : ""}>Manuelle entfernen</button>
                        </div>
                    </div>
                    <div class="assign-grid">
                        <div class="assign-card"><label>Spieler-Team zuweisen</label><div class="assign-row"><select id="tournament-player-select">${pOpts}</select><button type="button" class="btn btn-primary btn-small" data-action="add-player-team" data-tournament-id="${esc(t.id)}" ${full || !players.length ? "disabled" : ""}>Hinzufügen</button></div></div>
                        <div class="assign-card"><label>VRS-Team zuweisen</label><div class="assign-row"><select id="tournament-vrs-date" style="max-width:135px;">${dOpts}</select><input type="text" id="tournament-vrs-search" placeholder="Team suchen..." value="${esc(vrsSearchTerm)}"></div><div class="assign-row"><select id="tournament-vrs-select">${vOpts}</select><button type="button" class="btn btn-accent btn-small" data-action="add-vrs-team" data-tournament-id="${esc(t.id)}" ${full || !selectedVrsDate ? "disabled" : ""}>Hinzufügen</button></div></div>
                    </div>
                </div>
            `;
        }

        const cards = parts.length
            ? parts.map((p, i) => {
                const info = getResolvedParticipant(p.uid, parts);
                return `<div class="participant-item ${p.autoQualified ? "auto" : ""}"><div class="participant-info"><strong>#${i + 1} ${info.icon} ${esc(info.displayName)}</strong><small>${esc(info.badgeText)}${p.region ? ` · ${esc(p.region)}` : ""}</small></div>${admin && !p.autoQualified ? `<button type="button" class="btn btn-danger btn-small" data-action="remove-participant" data-tournament-id="${esc(t.id)}" data-uid="${esc(p.uid)}">×</button>` : ""}</div>`;
            }).join("")
            : "";

        return `${adminBox}${cards ? `<div class="participants-grid">${cards}</div>` : `<div class="placeholder-box"><span>Noch keine Teams eingetragen (0 / ${t.maxTeams}).</span></div>`}`;
    }

    function renderTournamentDetail(t) {
        const admin = isAdmin();
        const badge = formatCategoryBadge(t.status);
        const graph = resolveTournamentGraph(t);
        const parts = graph.participants;

        const subTabs = [];
        if (t.hasStage1) {
            const gLbl = t.stage1Type === "swiss" ? "🇨🇭 Swiss Stage" : (t.stage1Type === "gsl" ? "⚔️ GSL-Gruppen" : "📊 Gruppenphase");
            subTabs.push({ id: "stage1", label: gLbl });
        }
        if (t.hasPlayIn) {
            subTabs.push({ id: "playin", label: "⚡ Play-In Phase" });
        }
        if (t.hasPlayoffs) {
            subTabs.push({ id: "bracket", label: t.isDoubleElimQuali ? "🏆 Play-In Quali-Bracket" : "🌳 Playoffs-Turnierbaum" });
            (t.rounds || []).forEach(r => {
                subTabs.push({ id: r.id, label: `${r.name} (${r.defaultFormat || "BO3"})` });
            });
        }
        subTabs.push({ id: "participants", label: `👥 Teilnehmer (${parts.length}/${t.maxTeams})` });

        if (!activeSubTab || !subTabs.some(st => st.id === activeSubTab)) {
            activeSubTab = subTabs[0]?.id || "participants";
        }

        let body = "";
        if (activeSubTab === "stage1") {
            body = t.stage1Type === "swiss" ? renderSwissTab(t, graph, admin) : (t.stage1Type === "gsl" ? renderGslTab(t, graph, admin) : renderRoundRobinTab(t, graph, admin));
        } else if (activeSubTab === "playin") {
            body = renderPlayInTab(t, graph, admin);
        } else if (activeSubTab === "bracket") {
            body = t.isQuali32 ? renderQuali32Bracket(t, graph, admin) : renderPlayoffsBracket(t, graph, admin);
        } else if (activeSubTab === "participants") {
            body = renderParticipantsTab(t, graph, admin);
        } else {
            const rIdx = (t.rounds || []).findIndex(r => r.id === activeSubTab);
            body = rIdx >= 0 ? renderRoundTab(t, t.rounds[rIdx], graph, admin, rIdx) : "";
        }

        const adminHeaderBtns = admin ? `
            <div class="tournament-admin-status">
                <select id="tournament-status-select" data-tournament-id="${esc(t.id)}" title="Status">
                    <option value="zukuenftig" ${t.status === "zukuenftig" ? "selected" : ""}>🗓️ Zukünftig</option>
                    <option value="laufend" ${t.status === "laufend" ? "selected" : ""}>🔴 Aktuell laufend</option>
                    <option value="vergangen" ${t.status === "vergangen" ? "selected" : ""}>🏁 Vergangen</option>
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
                <p class="muted-text">${esc(t.formatSummary)}</p>
                <div class="tournament-info-grid">
                    <div class="stat-box"><span class="stat-label">Zeitraum</span><span class="stat-value">${esc(t.onlineDates)}</span></div>
                    <div class="stat-box"><span class="stat-label">Austragungsort</span><span class="stat-value">${esc(t.onlineRegion)}</span></div>
                    <div class="stat-box"><span class="stat-label">Match-Format</span><span class="stat-value">${esc(t.matchFormatSummary)}</span></div>
                    ${t.prizePoolTotal ? `<div class="stat-box"><span class="stat-label">Gesamtpreispool</span><span class="stat-value" style="color:var(--accent-orange);">${Number(t.prizePoolTotal).toLocaleString("de-DE")} $</span></div>` : (t.travelWindow ? `<div class="stat-box"><span class="stat-label">Anreise bei Weiterkommen</span><span class="stat-value">${esc(t.travelWindow)}</span></div>` : "")}
                    ${t.lanLocation ? `<div class="stat-box"><span class="stat-label">LAN Finals</span><span class="stat-value">${esc(t.lanDates ? `${t.lanDates} · ` : "")}${esc(t.lanLocation)}</span></div>` : ""}
                    <div class="stat-box"><span class="stat-label">Teilnehmer</span><span class="stat-value">${parts.length} / ${t.maxTeams} Teams</span></div>
                </div>
                ${renderPrizePoolBox(t, graph)}
                ${noticesHtml ? `<div class="tournament-notices">${noticesHtml}</div>` : ""}
                <div class="tournament-subtabs" role="tablist">
                    ${subTabs.map(st => `<button type="button" class="tournament-subtab ${activeSubTab === st.id ? "active" : ""}" data-action="switch-subtab" data-subtab="${esc(st.id)}">${esc(st.label)}</button>`).join("")}
                </div>
                <div>${body}</div>
            </div>
        `;
    }

    function renderTournamentOverview() {
        const admin = isAdmin();
        const list = getTournamentsCache();
        const counts = { laufend: 0, zukuenftig: 0, vergangen: 0 };
        const grouped = { laufend: [], zukuenftig: [], vergangen: [] };

        list.forEach(t => {
            const st = counts[t.status] !== undefined ? t.status : "zukuenftig";
            counts[st]++;
            grouped[st].push(t);
        });

        const activeList = grouped[activeCategory] || [];
        const cardsHtml = activeList.length
            ? `<div class="tournament-list">${activeList.map(t => {
                const badge = formatCategoryBadge(t.status);
                const graph = resolveTournamentGraph(t);
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
                            <span>👥 ${graph.participants.length} / ${t.maxTeams} Teams</span>
                            <span>🌍 ${esc(t.inviteSummary)}</span>
                        </div>
                        <div class="tournament-card-foot">
                            <span data-action="open-tournament" data-tournament-id="${esc(t.id)}" style="cursor:pointer;">${esc(t.formatSummary)} →</span>
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

    // ==================== MODULARER TURNIER-EDITOR ====================
    function populateTournamentEditorLinks(excludeId = "") {
        const others = getTournamentsCache().filter(t => t.id !== excludeId);
        const opts = `<option value="">– Keine Verknüpfung –</option>` + others.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
        const predEl = document.getElementById("te-predecessor-id");
        const nextEl = document.getElementById("te-next-id");
        if (predEl) predEl.innerHTML = opts;
        if (nextEl) nextEl.innerHTML = opts;
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? String(val) : "";
    };
    const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(val);
    };
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
    }

    function openTournamentEditor(existing = null, isDuplicate = false) {
        const modal = document.getElementById("tournament-editor-modal");
        if (!modal) return;
        const form = document.getElementById("te-form");
        form?.reset();

        const editId = existing && !isDuplicate ? existing.id : "";
        populateTournamentEditorLinks(editId);
        const titleEl = document.getElementById("te-modal-title");
        if (titleEl) titleEl.textContent = existing ? (isDuplicate ? "Turnier duplizieren" : "Turnier bearbeiten") : "Neues Turnier erstellen (Baukasten)";
        setVal("te-id", editId);

        if (existing) {
            setVal("te-name", isDuplicate ? `${existing.name} (Kopie)` : existing.name);
            setVal("te-status", existing.status || "zukuenftig");
            setVal("te-start-date", existing.startDate || "2025-02-01");
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
            setVal("te-advance-per-group", existing.advancePerGroup || 2);

            setCheck("te-enable-playin", existing.hasPlayIn ?? existing.playInStage);
            setVal("te-playin-matches", existing.playInMatches || 4);

            setCheck("te-enable-playoffs", existing.hasPlayoffs ?? (existing.rounds?.length > 0));
            setVal("te-playoff-type", existing.playoffType || (existing.isDoubleElimPlayoffs ? "double_elim" : "single_elim"));
            setVal("te-playoff-size", existing.playoffSize || (existing.isQuali32 ? 32 : (existing.rounds?.length ? (existing.rounds[0].days.flatMap(d => d.matches).length * 2) : 8)));
            setVal("te-direct-invites", existing.directInvites || 0);

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

        ["te-enable-stage1", "te-enable-playin", "te-enable-playoffs", "te-stage1-type"].forEach(id => {
            document.getElementById(id)?.addEventListener("change", updateModularEditorVisibility);
        });

        document.getElementById("te-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!isAdmin()) return;

            const existingId = document.getElementById("te-id").value;
            const prev = existingId ? getTournamentById(existingId) : null;

            const tObj = buildTournamentFromModularConfig({
                id: existingId || undefined,
                name: document.getElementById("te-name").value,
                status: document.getElementById("te-status").value,
                startDate: document.getElementById("te-start-date").value,
                matchesPerDay: document.getElementById("te-matches-per-day").value,
                onlineDates: document.getElementById("te-online-dates").value,
                onlineRegion: document.getElementById("te-online-region").value,
                defaultFormat: document.getElementById("te-default-format").value,
                deciderFormat: document.getElementById("te-decider-format").value,
                finalFormat: document.getElementById("te-final-format").value,
                inviteSummary: document.getElementById("te-invite-summary").value,
                lanDates: document.getElementById("te-lan-dates").value,
                lanLocation: document.getElementById("te-lan-location").value,
                travelWindow: document.getElementById("te-travel-window").value,
                predecessorId: document.getElementById("te-predecessor-id").value,
                nextTournamentId: document.getElementById("te-next-id").value,
                prizePoolTotal: document.getElementById("te-prize-total").value,
                prize1: document.getElementById("te-prize-1").value,
                prize2: document.getElementById("te-prize-2").value,
                prize34: document.getElementById("te-prize-34").value,
                prize58: document.getElementById("te-prize-58").value,
                locationNotice: document.getElementById("te-location-notice").value,
                travelNotice: document.getElementById("te-travel-notice").value,
                hasStage1: document.getElementById("te-enable-stage1").checked,
                stage1Type: document.getElementById("te-stage1-type").value,
                groupCount: document.getElementById("te-group-count").value,
                groupSize: document.getElementById("te-group-size").value,
                advancePerGroup: document.getElementById("te-advance-per-group").value,
                hasPlayIn: document.getElementById("te-enable-playin").checked,
                playInMatches: document.getElementById("te-playin-matches").value,
                hasPlayoffs: document.getElementById("te-enable-playoffs").checked,
                playoffType: document.getElementById("te-playoff-type").value,
                playoffSize: document.getElementById("te-playoff-size").value,
                directInvites: document.getElementById("te-direct-invites").value,
                isQuali32: document.getElementById("te-playoff-size").value === "32",
                existingParticipants: prev?.participants || [],
                existingMatches: prev?.matches || {},
                existingMatchTimes: prev?.matchTimes || {},
                existingWinners: prev?.winners || {},
                sortOrder: prev?.sortOrder ?? Date.now(),
                createdAt: prev?.createdAt ?? Date.now()
            });

            await saveTournamentDoc(tObj);
            activeCategory = tObj.status;
            closeEditor();
            render();
        });
    }

    // ==================== INTERAKTIONEN (ADMIN-AKTIONEN & SIEGER) ====================
    function setupEvents() {
        const root = document.getElementById("tournaments-root");
        if (!root) return;

        root.addEventListener("click", async (e) => {
            const catTab = e.target.closest("[data-tournament-tab]");
            if (catTab) {
                activeCategory = catTab.dataset.tournamentTab;
                render();
                return;
            }

            const el = e.target.closest("[data-action]");
            if (!el) return;
            const action = el.dataset.action;

            if (action === "open-tournament") {
                const target = getTournamentById(el.dataset.tournamentId);
                if (target) activeCategory = target.status || "zukuenftig";
                activeTournamentId = el.dataset.tournamentId;
                activeSubTab = "";
                render();
                document.querySelector(".content-body")?.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            if (action === "back-to-overview") {
                activeTournamentId = null;
                render();
                return;
            }
            if (action === "switch-subtab") {
                activeSubTab = el.dataset.subtab;
                render();
                return;
            }

            if (!isAdmin()) return;

            if (action === "new-tournament") {
                openTournamentEditor(null, false);
                return;
            }
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
            if (action === "import-tournaments") {
                document.getElementById("tournaments-import-file")?.click();
                return;
            }

            const tId = el.dataset.tournamentId;
            const t = getTournamentById(tId);
            if (!t) return;

            if (action === "edit-tournament") {
                openTournamentEditor(t, false);
                return;
            }
            if (action === "duplicate-tournament") {
                openTournamentEditor(t, true);
                return;
            }
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
            clone.matchTimes = clone.matchTimes || {};
            clone.winners = clone.winners || {};

            if (action === "toggle-winner") {
                const mId = el.dataset.matchId, uid = el.dataset.uid;
                if (!uid) return;
                if (clone.winners[mId] === uid) delete clone.winners[mId];
                else clone.winners[mId] = uid;
            } else if (action === "add-player-team") {
                const graph = resolveTournamentGraph(t);
                if (graph.participants.length >= t.maxTeams) return;
                const pUid = document.getElementById("tournament-player-select")?.value;
                const player = getPlayers().find(p => p.uid === pUid);
                if (!player) return;
                const uid = `player:${player.uid}`;
                if (graph.participants.some(p => p.uid === uid)) return;
                clone.participants.push({ uid, type: "player", playerUid: player.uid, username: player.username, name: getTeamName(player) });
            } else if (action === "add-vrs-team") {
                const graph = resolveTournamentGraph(t);
                if (graph.participants.length >= t.maxTeams) return;
                const uid = document.getElementById("tournament-vrs-select")?.value;
                if (!uid || !selectedVrsDate || graph.participants.some(p => p.uid === uid)) return;
                const entry = getVrsEntriesForDate(selectedVrsDate).find(x => x.uid === uid);
                if (!entry) return;
                clone.participants.push({ uid: entry.uid, type: "vrs", name: entry.name, points: entry.points, rank: entry.rank, region: entry.region });
            } else if (action === "fill-top-vrs") {
                const graph = resolveTournamentGraph(t);
                let count = graph.participants.length;
                const existing = new Set(graph.participants.map(p => p.uid));
                for (const entry of getVrsEntriesForDate(selectedVrsDate)) {
                    if (count >= t.maxTeams) break;
                    if (existing.has(entry.uid)) continue;
                    clone.participants.push({ uid: entry.uid, type: "vrs", name: entry.name, points: entry.points, rank: entry.rank, region: entry.region });
                    existing.add(entry.uid);
                    count++;
                }
            } else if (action === "remove-participant") {
                const uid = el.dataset.uid;
                clone.participants = clone.participants.filter(p => p.uid !== uid);
                for (const mId of Object.keys(clone.matches)) {
                    clone.matches[mId] = clone.matches[mId].map(s => (s === uid ? null : s));
                    if (clone.winners[mId] === uid) delete clone.winners[mId];
                }
            } else if (action === "clear-participants") {
                if (!confirm("Alle manuell zugewiesenen Teams entfernen?")) return;
                clone.participants = [];
                clone.matches = {};
                clone.winners = {};
            } else if (action === "auto-schedule-times") {
                const defaultSlots = ["12:00", "15:30", "18:30", "21:30", "10:00", "13:30", "17:00", "20:30"];
                clone.matchTimes = clone.matchTimes || {};
                const assignTimes = (matchList) => {
                    matchList.forEach((m, idx) => { clone.matchTimes[m.id] = defaultSlots[idx % defaultSlots.length]; });
                };
                (clone.rounds || []).forEach(r => (r.days || []).forEach(d => assignTimes(d.matches)));
                (clone.swissGroups || []).forEach(g => (g.rounds || []).forEach(r => assignTimes(r.matches)));
                (clone.deGroups || []).forEach(g => assignTimes(g.matches));
                (clone.rrGroups || []).forEach(g => (g.rounds || []).forEach(r => assignTimes(r.matches)));
                if (clone.playInStage) {
                    (clone.playInStage.rounds || []).forEach(r => (r.days || []).forEach(d => assignTimes(d.matches)));
                }
            } else if (action === "autofill-first-round") {
                const list = resolveTournamentGraph(t).participants;
                const firstRound = t.rounds?.[0];
                if (!firstRound) return;
                let idx = 0;
                firstRound.days.forEach(d => d.matches.forEach(m => {
                    clone.matches[m.id] = [list[idx]?.uid || null, list[idx + 1]?.uid || null];
                    idx += 2;
                }));
                clone.winners = {};
            } else if (action === "autofill-de-group") {
                const gIdx = Number(el.dataset.groupIndex);
                const g = t.deGroups?.[gIdx];
                if (!g) return;
                const list = resolveTournamentGraph(t).participants.slice(gIdx * g.size, (gIdx + 1) * g.size);
                const opening = g.matches.slice(0, g.size / 2);
                opening.forEach((m, i) => { clone.matches[m.id] = [list[i * 2]?.uid || null, list[i * 2 + 1]?.uid || null]; });
            } else if (action === "pair-swiss-round") {
                const gId = el.dataset.groupId, rIdx = Number(el.dataset.roundIndex);
                const gIdx = (t.swissGroups || []).findIndex(g => g.id === gId);
                const g = t.swissGroups?.[gIdx];
                if (!g) return;
                const graph = resolveTournamentGraph(t);
                const round = g.rounds[rIdx];
                const gTeams = graph.participants.slice(gIdx * g.teamCount, (gIdx + 1) * g.teamCount);
                const standings = graph.swissStandings[gId] || [];
                const active = (rIdx === 0 ? gTeams.map(p => ({ uid: p.uid, wins: 0, losses: 0, opponents: new Set() })) : standings.filter(s => s.wins < g.winsToAdvance && s.losses < g.lossesToEliminate));
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
                round.matches.forEach((m, idx) => { clone.matches[m.id] = pairs[idx] || [null, null]; });
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
                    const directTeams = graph.participants.slice(t.hasStage1 ? (t.groupCount * t.groupSize) : 0);
                    firstRound.days.flatMap(d => d.matches).forEach((m, i) => {
                        clone.matches[m.id] = [directTeams[i]?.uid || null, adv[7 - i] || adv[i] || null];
                    });
                } else if (t.isDoubleElimQuali) {
                    // Double Elim Quali (8 Teams aus Upper R2 und Lower R2)
                    const ubAdv = ["de-ub-r2-1", "de-ub-r2-2", "de-ub-r2-3", "de-ub-r2-4"].map(id => graph.matchWinners[id]).filter(Boolean);
                    const lbAdv = ["de-lb-r2-1", "de-lb-r2-2", "de-lb-r2-3", "de-lb-r2-4"].map(id => graph.matchWinners[id]).filter(Boolean);
                    const allQualis = [...ubAdv, ...lbAdv];
                    let idx = 0;
                    firstRound.days.forEach(d => d.matches.forEach(m => {
                        clone.matches[m.id] = [allQualis[idx] || null, allQualis[idx + 1] || null];
                        idx += 2;
                    }));
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
                clone.matches = {};
                clone.winners = {};
            } else {
                return;
            }

            await saveTournamentDoc(clone);
        });

        root.addEventListener("change", async (e) => {
            if (!isAdmin()) return;

            if (e.target.id === "tournaments-import-file") {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    const arr = JSON.parse(await file.text());
                    if (!Array.isArray(arr)) throw new Error("Ungültige JSON-Datei");
                    for (const item of arr) {
                        if (item?.id && item?.name) await saveTournamentDoc(item);
                    }
                    alert(`${arr.length} Turnier(e) erfolgreich importiert!`);
                } catch (err) {
                    alert("Import fehlgeschlagen: " + err.message);
                }
                e.target.value = "";
                return;
            }

            if (e.target.id === "tournament-vrs-date") {
                selectedVrsDate = e.target.value;
                render();
                return;
            }

            if (e.target.id === "tournament-status-select") {
                const t = getTournamentById(e.target.dataset.tournamentId);
                if (!t) return;
                const clone = structuredClone(t);
                clone.status = e.target.value;
                activeCategory = clone.status;
                await saveTournamentDoc(clone);
                return;
            }

            if (e.target.dataset.action === "set-match-slot") {
                const tId = e.target.dataset.tournamentId, mId = e.target.dataset.matchId, slot = Number(e.target.dataset.slot);
                const t = getTournamentById(tId);
                if (!t) return;
                const prevUid = resolveTournamentGraph(t).matchSlots[mId]?.[slot] || null;
                const val = e.target.value || "";
                const clone = structuredClone(t);
                clone.matches = clone.matches || {};
                clone.winners = clone.winners || {};
                if (!Array.isArray(clone.matches[mId])) clone.matches[mId] = [null, null];
                clone.matches[mId][slot] = val;
                if (prevUid && clone.winners[mId] === prevUid && val !== prevUid) delete clone.winners[mId];
                await saveTournamentDoc(clone);
                return;
            }

            if (e.target.dataset.action === "set-match-date") {
                const tId = e.target.dataset.tournamentId;
                const mId = e.target.dataset.matchId;
                const val = e.target.value || "";
                const t = getTournamentById(tId);
                if (!t) return;
                const clone = structuredClone(t);
                clone.matchSchedules = clone.matchSchedules || {};
                clone.matchSchedules[mId] = clone.matchSchedules[mId] || {};
                if (val) {
                    clone.matchSchedules[mId].date = val;
                } else {
                    delete clone.matchSchedules[mId].date;
                    if (!clone.matchSchedules[mId].time) delete clone.matchSchedules[mId];
                }
                await saveTournamentDoc(clone);
                return;
            }

            if (e.target.dataset.action === "set-match-time") {
                const tId = e.target.dataset.tournamentId;
                const mId = e.target.dataset.matchId;
                const val = e.target.value || "";
                const t = getTournamentById(tId);
                if (!t) return;
                const clone = structuredClone(t);
                clone.matchSchedules = clone.matchSchedules || {};
                clone.matchSchedules[mId] = clone.matchSchedules[mId] || {};
                if (val) {
                    clone.matchSchedules[mId].time = val;
                } else {
                    delete clone.matchSchedules[mId].time;
                    if (!clone.matchSchedules[mId].date) delete clone.matchSchedules[mId];
                }
                await saveTournamentDoc(clone);
                return;
            }
        });

        root.addEventListener("input", (e) => {
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
        getInitialSeedTournaments,
        closeEditor,
        resetActiveTournament: () => { activeTournamentId = null; },
        setup: () => {
            setupEvents();
            setupEditorEvents();
        }
    };
}
