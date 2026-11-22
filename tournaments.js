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
            const ubR1 = Array.from({ length: 8 }, (_, i) => ({
                id: `de-ub-r1-${i + 1}`,
                label: `UB Achtelfinale ${i + 1}`,
                format: defaultFormat,
                slotHints: [`Seed #${i * 2 + 1}`, `Seed #${i * 2 + 2}`]
            }));
            const d1 = chunkIntoDays(ubR1, startDate, offset, 4, "Play-In Tag");
            offset = d1.nextOffset;

            const lbR1 = Array.from({ length: 4 }, (_, i) => ({
                id: `de-lb-r1-${i + 1}`,
                label: `LB Runde 1 #${i + 1}`,
                format: defaultFormat,
                fromLosers: [`de-ub-r1-${i * 2 + 1}`, `de-ub-r1-${i * 2 + 2}`],
                slotHints: [`Verlierer UB R1 #${i * 2 + 1}`, `Verlierer UB R1 #${i * 2 + 2}`]
            }));
            const d3 = chunkIntoDays(lbR1, startDate, offset, 4, "Play-In Tag");

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

    function buildSwissStage(groupId, name, teamCount, winsToAdvance, lossesToEliminate, startDate, dayOffset, defaultFormat, deciderFormat) {
        const roundCounts = teamCount >= 16 ? [8, 8, 8, 6, 3] : [4, 4, 2];
        const rounds = roundCounts.map((count, rIdx) => {
            const isoDate = addDaysISO(startDate, dayOffset + rIdx);
            return {
                id: `sw-${groupId}-r${rIdx + 1}`,
                name: `Runde ${rIdx + 1}`,
                dateISO: isoDate,
                dateLabel: formatDateDE(isoDate),
                matches: Array.from({ length: count }, (_, i) => ({
                    id: `sw-${groupId}-r${rIdx + 1}-${i + 1}`,
                    label: `${name} R${rIdx + 1} #${i + 1}`,
                    defaultDateISO: isoDate,
                    format: (rIdx >= roundCounts.length - 1 || (teamCount >= 16 && rIdx >= 2)) ? deciderFormat : defaultFormat
                }))
            };
        });
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

    function buildGslGroup(groupId, size, startDate, dayOffset, defaultFormat) {
        const p = `gsl-${groupId}`;
        const offset = dayOffset;
        const iso = addDaysISO(startDate, offset);
        if (size === 4) {
            return {
                id: groupId,
                name: `Gruppe ${groupId}`,
                size: 4,
                advanceCount: 2,
                matches: [
                    { id: `${p}-o1`, round: "Opening", label: `Grp ${groupId} Opening 1`, defaultDateISO: iso, format: defaultFormat, slotHints: ["Seed 1", "Seed 4"] },
                    { id: `${p}-o2`, round: "Opening", label: `Grp ${groupId} Opening 2`, defaultDateISO: iso, format: defaultFormat, slotHints: ["Seed 2", "Seed 3"] },
                    { id: `${p}-w1`, round: "Winners", label: `Grp ${groupId} Winners (Quali #1)`, defaultDateISO: addDaysISO(startDate, offset + 1), format: defaultFormat, fromMatches: [`${p}-o1`, `${p}-o2`], slotHints: ["Sieger Opening 1", "Sieger Opening 2"] },
                    { id: `${p}-l1`, round: "Elimination", label: `Grp ${groupId} Elimination`, defaultDateISO: addDaysISO(startDate, offset + 1), format: defaultFormat, fromLosers: [`${p}-o1`, `${p}-o2`], slotHints: ["Verlierer Opening 1", "Verlierer Opening 2"] },
                    { id: `${p}-d1`, round: "Decider", label: `Grp ${groupId} Decider (Quali #2)`, defaultDateISO: addDaysISO(startDate, offset + 2), format: defaultFormat, fromMixed: [{ type: "loser", id: `${p}-w1` }, { type: "winner", id: `${p}-l1` }], slotHints: ["Verlierer Winners", "Sieger Elimination"] }
                ],
                qualifierMatchIds: [`${p}-w1`, `${p}-d1`],
                nextOffset: offset + 3
            };
        }
        return { id: groupId, name: `Gruppe ${groupId}`, size, advanceCount: 3, matches: [], qualifierMatchIds: [], nextOffset: offset + 2 };
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
                    matches.push({
                        id: `rr-${groupId}-r${r + 1}-${matches.length + 1}`,
                        label: `Grp ${groupId} · Tag ${r + 1} #${matches.length + 1}`,
                        defaultDateISO: iso,
                        format: defaultFormat,
                        initialSlotIndices: [a, b]
                    });
                }
            }
            rounds.push({ id: `rr-${groupId}-r${r + 1}`, name: `Spieltag ${r + 1}`, dateISO: iso, dateLabel: formatDateDE(iso), matches });
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
