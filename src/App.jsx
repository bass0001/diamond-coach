import React, { useState, useMemo } from "react";
import Lineups from "./Lineups.jsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line } from "recharts";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  navy:   "#183054",
  gold:   "#F5A622",
  dark:   "#0d1828",
  mid:    "#111e35",
  panel:  "#162540",
  border: "rgba(245,166,34,0.2)",
  muted:  "#6b82a0",
  white:  "#f0f6ff",
  red:    "#e05555",
  green:  "#4caf82",
  teal:   "#38b2ac",
  yellow: "#F5A622",
};

const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF","EH","DH"];
const POS_COLORS = {
  P:"#e05555", C:"#F5A622", "1B":"#4caf82", "2B":"#38b2ac",
  "3B":"#9b6fe0", SS:"#e07855", LF:"#4a90d9", CF:"#d4e04a", RF:"#e04a90", EH:"#aaa", DH:"#888"
};

const STATUS = { ACTIVE: "active", IL: "il", AWAY: "away", AP: "ap" };
const ST = {
  active: { label: "Active", dot: "#4caf82", badge: "🟢", bg: "rgba(76,175,130,0.1)",  border: "rgba(76,175,130,0.35)"  },
  il:     { label: "IL",     dot: "#e05555", badge: "🔴", bg: "rgba(224,85,85,0.1)",   border: "rgba(224,85,85,0.35)"   },
  away:   { label: "Away",   dot: "#F5A622", badge: "🟡", bg: "rgba(245,166,34,0.1)",  border: "rgba(245,166,34,0.35)"  },
  ap:     { label: "AP",     dot: "#38b2ac", badge: "🔵", bg: "rgba(56,178,172,0.1)",  border: "rgba(56,178,172,0.35)"  },
};

// ── APP SCREENS ───────────────────────────────────────────────────────────────
// "setup"   — first run, enter roster
// "main"    — dashboard with tabs
// "import"  — step-by-step import wizard

// ── HELPERS ───────────────────────────────────────────────────────────────────
const ipReal = ip => { const w = Math.floor(ip); return w + Math.round((ip - w) * 10) / 3; };
const fmtIp  = r  => { const w = Math.floor(r);  const f = Math.round((r - w) * 3); return `${w}.${f}`; };
const battingAvg = (h, ab) => {
  if (ab === 0) return ".000";
  const val = Math.min(h / ab, 1); // cap at 1.000
  return "." + String(Math.round(val * 1000)).padStart(3, "0").slice(0, 3);
};
const calcEra    = (er, ip) => ip === 0 ? "—" : (er / ip * 9).toFixed(2);
const shortN = n => { const p = n.trim().split(" "); return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(" ")}` : p[0]; };

function aggregateStats(games) {
  const bat = {}, pit = {}, def = {};
  games.forEach(g => {
    g.batting.forEach(p => {
      if (!bat[p.name]) bat[p.name] = { name: p.name, num: p.num, gp: 0, ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, doubles: 0, triples: 0, hr: 0, sb: 0 };
      bat[p.name].gp++; bat[p.name].ab += p.ab; bat[p.name].r += p.r;
      bat[p.name].h += p.h; bat[p.name].rbi += p.rbi; bat[p.name].bb += p.bb; bat[p.name].so += p.so;
      bat[p.name].doubles += (p.doubles || 0); bat[p.name].triples += (p.triples || 0);
      bat[p.name].hr += (p.hr || 0); bat[p.name].sb += (p.sb || 0);
    });
    g.pitching.forEach(p => {
      if (!pit[p.name]) pit[p.name] = { name: p.name, num: p.num, gp: 0, ipR: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, pitches: 0, strikes: 0, bf: 0 };
      pit[p.name].gp++; pit[p.name].ipR += ipReal(p.ip); pit[p.name].h += p.h;
      pit[p.name].r += p.r; pit[p.name].er += p.er; pit[p.name].bb += p.bb;
      pit[p.name].so += p.so; pit[p.name].pitches += p.pitches; pit[p.name].strikes += p.strikes; pit[p.name].bf += p.bf;
    });
    (g.defensive || []).forEach(d => {
      if (!def[d.name]) def[d.name] = { name: d.name, total: 0, byPos: {} };
      def[d.name].total += d.innings;
      def[d.name].byPos[d.pos] = (def[d.name].byPos[d.pos] || 0) + d.innings;
    });
  });
  return {
    batting:   Object.values(bat).sort((a,b) => b.ab - a.ab),
    pitching:  Object.values(pit).sort((a,b) => b.ipR - a.ipR),
    defensive: Object.values(def).sort((a,b) => b.total - a.total),
  };
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.navy, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
      <div style={{ color: C.gold, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: C.white }}>{p.name}: <b style={{ color: C.gold }}>{p.value}</b></div>)}
    </div>
  );
};
const SH = ({ children, sub }) => (
  <div style={{ marginBottom: sub ? 10 : 14, paddingBottom: 6, borderBottom: sub ? "none" : `1px solid ${C.border}` }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.gold }}>{children}</div>
  </div>
);
const Btn = ({ children, onClick, variant = "gold", disabled, style: sx }) => {
  const styles = {
    gold:    { background: C.gold,  color: C.navy,  border: "none" },
    ghost:   { background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid rgba(255,255,255,0.15)` },
    danger:  { background: "rgba(224,85,85,0.12)", color: C.red,   border: `1px solid rgba(224,85,85,0.3)` },
    teal:    { background: "rgba(56,178,172,0.12)", color: C.teal,  border: `1px solid rgba(56,178,172,0.3)` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", ...styles[variant], ...sx }}>
      {children}
    </button>
  );
};
const Input = ({ value, onChange, placeholder, style: sx }) => (
  <input value={value} onChange={onChange} placeholder={placeholder}
    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 12, padding: "8px 12px", outline: "none", ...sx }} />
);
const StatBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${active ? C.gold : "rgba(255,255,255,0.15)"}`, background: active ? C.gold : "transparent", color: active ? C.navy : C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{label}</button>
);
const Table = ({ cols, rows, highlight, expandable }) => {
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("desc");
  const [expandedIdx, setExpandedIdx] = React.useState(null);

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const sorted = sortKey ? [...rows].sort((a, b) => {
    const av = parseFloat(String(a[sortKey]).replace(/[^0-9.-]/g, "")) || 0;
    const bv = parseFloat(String(b[sortKey]).replace(/[^0-9.-]/g, "")) || 0;
    return sortDir === "desc" ? bv - av : av - bv;
  }) : rows;

  const expandedRow = expandedIdx !== null ? sorted[expandedIdx] : null;

  return (
    <div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed", minWidth: "100%" }}>
          <thead>
            <tr>{cols.map(c => (
              <th key={c.k} onClick={() => !c.left && handleSort(c.k)}
                style={{ padding: "7px 5px", color: c.k === highlight || c.k === sortKey ? C.gold : C.muted, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", textAlign: c.left ? "left" : "center", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`, cursor: c.left ? "default" : "pointer", userSelect: "none", width: c.left ? 80 : c.k === "avg" ? 42 : 32 }}>
                {c.label}{sortKey === c.k ? (sortDir === "desc" ? "▼" : "▲") : ""}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} onClick={() => expandable && !row._totals && setExpandedIdx(expandedIdx === i ? null : i)}
                style={{ background: row._totals ? "rgba(245,166,34,0.06)" : expandedIdx === i ? "rgba(245,166,34,0.08)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", cursor: expandable && !row._totals ? "pointer" : "default", borderTop: row._totals ? `1px solid ${C.gold}44` : "none" }}>
                {cols.map(c => <td key={c.k} style={{ padding: "7px 5px", textAlign: c.left ? "left" : "center", color: row._totals ? C.gold : c.k === highlight || c.k === sortKey ? C.gold : (row[c.k] === 0 || row[c.k] === ".000" ? C.muted : C.white), fontWeight: row._totals || c.k === highlight || c.k === sortKey ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: c.left ? "ellipsis" : "clip", maxWidth: c.left ? 80 : "none", fontSize: row._totals ? 10 : 11 }}>{row[c.k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded player card */}
      {expandable && expandedRow && (
        <div style={{ boxSizing: "border-box", width: "100%", background: C.panel, borderTop: `2px solid ${C.gold}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 8px 6px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{expandedRow.name}</div>
            <button onClick={() => setExpandedIdx(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ padding: "0 10px 10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 0" }}>
            {[
              { label: "AVG", value: expandedRow.avg },
              { label: "AB",  value: expandedRow.ab },
              { label: "H",   value: expandedRow.h },
              { label: "R",   value: expandedRow.r },
              { label: "RBI", value: expandedRow.rbi },
              { label: "BB",  value: expandedRow.bb },
              { label: "2B",  value: expandedRow.doubles },
              { label: "3B",  value: expandedRow.triples },
              { label: "HR",  value: expandedRow.hr },
              { label: "SB",  value: expandedRow.sb },
              { label: "K",   value: expandedRow.so },
              { label: "GP",  value: expandedRow.gp },
            ].map(s => (
              <div key={s.label} style={{ padding: "6px 4px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 1 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.white, fontFamily: "'Oswald', sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── SCREEN 1: ROSTER SETUP ────────────────────────────────────────────────────
function SetupScreen({ onComplete }) {
  const [players, setPlayers] = useState([
    { id: 1, name: "", num: "", pos: "" },
    { id: 2, name: "", num: "", pos: "" },
    { id: 3, name: "", num: "", pos: "" },
  ]);
  const [teamName, setTeamName] = useState("16U Guelph Royals AA");
  const [season,   setSeason]   = useState("2026");

  const addPlayer = () => setPlayers(p => [...p, { id: Date.now(), name: "", num: "", pos: "" }]);
  const removePlayer = id => setPlayers(p => p.filter(x => x.id !== id));
  const updatePlayer = (id, field, val) => setPlayers(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));

  const valid = players.filter(p => p.name.trim()).length >= 2;

  const handleComplete = () => {
    const roster = players
      .filter(p => p.name.trim())
      .map(p => ({ name: p.name.trim(), num: parseInt(p.num) || 0, pos: p.pos, status: STATUS.ACTIVE }));
    onComplete({ teamName, season, roster });
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.dark} 0%, ${C.mid} 100%)`, fontFamily: "'Barlow', sans-serif", color: C.white, padding: "0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: "20px 20px 16px" }}>
        <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3.5, textTransform: "uppercase", marginBottom: 4 }}>Step 1 of 1 · Season Setup</div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>Build Your <span style={{ color: C.gold }}>Roster</span></div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Enter your players once. Import games all season.</div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {/* Team info */}
        <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <SH>Team Info</SH>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Team Name</div>
              <Input value={teamName} onChange={e => setTeamName(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Season</div>
              <Input value={season} onChange={e => setSeason(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        {/* Roster entry */}
        <div style={{ background: C.panel, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
          <SH>Players</SH>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <span style={{ flex: 2, fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Full Name</span>
            <span style={{ width: 52, fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>#</span>
            <span style={{ width: 80, fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Primary Pos</span>
            <span style={{ width: 24 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p, i) => (
              <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input value={p.name} onChange={e => updatePlayer(p.id, "name", e.target.value)} placeholder={`Player ${i + 1}`} style={{ flex: 2 }} />
                <Input value={p.num} onChange={e => updatePlayer(p.id, "num", e.target.value)} placeholder="00" style={{ width: 52, textAlign: "center" }} />
                <select value={p.pos} onChange={e => updatePlayer(p.id, "pos", e.target.value)}
                  style={{ width: 80, background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: p.pos ? (POS_COLORS[p.pos] || C.white) : C.muted, fontSize: 12, padding: "8px 6px", fontWeight: 700 }}>
                  <option value="">—</option>
                  {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
                <button onClick={() => removePlayer(p.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addPlayer} style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            + Add Player
          </button>
        </div>

        <div style={{ marginTop: 20, padding: "0 0 20px" }}>
          <Btn onClick={handleComplete} disabled={!valid} style={{ width: "100%", padding: "13px 0", fontSize: 14 }}>
            Start Season →
          </Btn>
          {!valid && <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8 }}>Add at least 2 players to continue</div>}
        </div>
      </div>
    </div>
  );
}

// ── IMPORT WIZARD ─────────────────────────────────────────────────────────────
// Step 1: Paste box score
// Step 2: Who played / status
// Step 3: Defensive innings (pre-filled from box score positions)
// Step 4: Confirm

async function parseBoxScoreAI(input, roster) {
  const rosterList = roster.map(p => `#${p.num} ${p.name}`).join(", ");

  const instructions = `You are a baseball scorekeeper. Parse this GameChanger box score and extract stats for the team whose players match this roster:

${rosterList}

IMPORTANT MATCHING RULES — follow these in order:
1. PRIMARY: Match by jersey number. The box score always shows #number next to the player name (e.g. "C Doern #11 (LF)"). Match #11 to whoever has #11 on the roster above. Use the EXACT roster name in your output.
2. FALLBACK: If no #number is visible, match by name as best you can.
3. If a player has a number not on the roster at all, include them with their box score name as-is.

Return ONLY valid JSON, no markdown, no explanation:
{
  "date": "May 8, 2025",
  "opponent": "Other team name",
  "result": "W or L",
  "score": "10-0",
  "totalInnings": 5,
  "batting": [
    {"name": "exact roster name matched by number", "num": 11, "pos": "LF", "ab": 0, "r": 0, "h": 0, "rbi": 0, "bb": 0, "so": 0, "doubles": 0, "triples": 0, "hr": 0, "sb": 0}
  ],
  "pitching": [
    {"name": "exact roster name matched by number", "num": 11, "ip": 0.0, "h": 0, "r": 0, "er": 0, "bb": 0, "so": 0, "pitches": 0, "strikes": 0, "bf": 0}
  ]
}

Additional rules:
- "pos" is the position in brackets e.g. (LF) next to the player name in the batting section.
- For pitching "ip": use GameChanger format e.g. 2.0 or 1.2 (.1=1 out, .2=2 outs).
- Extract doubles (2B), triples (3B), home runs (HR), and stolen bases (SB) from the notes line below the batting totals. A name with no number = 1 of that stat. A number after the name = that many. e.g. "SB: L Doyle, A Cantin 2, J Mailloux 3" means Doyle=1 SB, Cantin=2 SB, Mailloux=3 SB. Same rule applies to 2B, 3B, HR. Match names to roster by jersey number. Default to 0 if not mentioned.
- totalInnings = total innings the game lasted.`;

  // Check if input is an image (screenshot)
  let contentBlocks;
  if (input.startsWith("__IMAGE__")) {
    const parts = input.split("__");
    // format: __IMAGE__mediaType__base64data
    const mediaType = parts[2];
    const base64 = parts.slice(3).join("__");
    contentBlocks = [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: instructions }
    ];
  } else {
    contentBlocks = [
      { type: "text", text: `${instructions}\n\nBox score text:\n${input}` }
    ];
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: contentBlocks }]
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function ImportWizard({ roster, onComplete, onCancel }) {
  const [step, setStep]             = useState(1);
  const [boxText, setBoxText]       = useState("");
  const [parsing, setParsing]       = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [parseErr, setParseErr]     = useState("");
  const [parsed, setParsed]         = useState(null);

  // Step 1.5: name mapping for unrecognized players
  // { parsedName, resolution: "map"|"ap"|"skip", mappedTo: rosterName|null }
  const [unknowns, setUnknowns]     = useState([]);

  // Step 2: player statuses for this game
  const [playerStatuses, setPlayerStatuses] = useState([]);

  // Step 3: defensive innings rows
  const [totalInnings, setTotalInnings] = useState(7);
  const [defRows, setDefRows]           = useState([]);
  const [expandedDefPlayer, setExpandedDefPlayer] = useState(null);

  // ── Image upload handler ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setParseErr("Please upload an image file (PNG or JPG screenshot from GameChanger).");
      return;
    }
    setPdfLoading(true);
    setParseErr("");
    setBoxText("");
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res(reader.result.split(",")[1]);
        reader.onerror = () => rej(new Error("Read failed"));
        reader.readAsDataURL(file);
      });

      // Send image directly to Claude vision — no intermediate text extraction needed
      // Store as a special marker so handleParse knows to send as image
      setBoxText(`__IMAGE__${file.type}__${base64}`);
    } catch (err) {
      setParseErr("Couldn't read that image. Try again.");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  };

  // ── Step 1: parse ──
  const handleParse = async () => {
    if (!boxText.trim()) return;
    setParsing(true); setParseErr("");
    try {
      let result;
      const trimmed = boxText.trim();
      if (trimmed.startsWith("{")) {
        result = JSON.parse(trimmed);
        // For JSON imports, manually build steps since buildSteps2and3 needs resolvedUnknowns
        setParsed(result);
        const innings = result.totalInnings || 7;
        setTotalInnings(innings);

        // Build player statuses
        const appearedNames = new Set(result.batting.map(p => p.name));
        const rosterNames = new Set(roster.map(p => p.name));
        setPlayerStatuses(roster.map(p => ({
          name: p.name, num: p.num, currentStatus: p.status,
          appearedInBoxScore: appearedNames.has(p.name),
          gameStatus: appearedNames.has(p.name) ? "played" : "sat",
          isAP: false,
        })));

        // Pre-fill defensive rows from batting positions
        const seen = new Set();
        const rows = [];
        result.batting.forEach(p => {
          if (p.pos && p.pos !== "EH" && p.pos !== "DH" && !seen.has(p.name)) {
            seen.add(p.name);
            rows.push({ name: p.name, pos: p.pos, innings });
          }
        });
        result.pitching?.forEach(p => {
          if (!seen.has(p.name)) {
            seen.add(p.name);
            rows.push({ name: p.name, pos: "P", innings });
          }
        });
        setDefRows(rows);
        setStep(2);
        return;
      } else {
        result = await parseBoxScoreAI(boxText, roster);
      }

      setParsed(result);
      setTotalInnings(result.totalInnings || 7);

      const rosterNames2 = new Set(roster.map(p => p.name));
      const allParsedNames = new Set([
        ...result.batting.map(p => p.name),
        ...result.pitching.map(p => p.name),
      ]);
      const unknown = [...allParsedNames].filter(n => !rosterNames2.has(n));

      if (unknown.length > 0) {
        setUnknowns(unknown.map(n => ({ parsedName: n, resolution: "ap", mappedTo: null })));
        setStep(1.5);
      } else {
        buildSteps2and3(result, result.totalInnings || 7, []);
        setStep(2);
      }
    } catch (e) {
      setParseErr("Couldn't read that box score. Make sure you paste or upload the full GameChanger screenshot.");
    } finally { setParsing(false); }
  };

  // ── Apply name mappings then build steps 2 & 3 ──
  const buildSteps2and3 = (result, innings, resolvedUnknowns) => {
    // Build a lookup: parsedName → final name/player
    const nameMap = {};
    resolvedUnknowns.forEach(u => {
      if (u.resolution === "map" && u.mappedTo) nameMap[u.parsedName] = u.mappedTo;
      // "ap" keeps parsedName as-is; "skip" means drop them
    });

    const apNames = new Set(resolvedUnknowns.filter(u => u.resolution === "ap").map(u => u.parsedName));
    const skipNames = new Set(resolvedUnknowns.filter(u => u.resolution === "skip").map(u => u.parsedName));

    const resolveName = n => nameMap[n] || n;

    const filteredBatting  = result.batting.filter(p => !skipNames.has(p.name)).map(p => ({ ...p, name: resolveName(p.name) }));
    const filteredPitching = result.pitching.filter(p => !skipNames.has(p.name)).map(p => ({ ...p, name: resolveName(p.name) }));

    // Rebuild parsed with resolved names
    const resolvedParsed = { ...result, batting: filteredBatting, pitching: filteredPitching };
    setParsed(resolvedParsed);

    // Build effective roster = roster + any APs added this game
    const effectiveRoster = [
      ...roster,
      ...[...apNames].filter(n => !nameMap[n]).map(n => ({ name: n, num: "AP", status: STATUS.AP })),
    ];

    const appearedNames = new Set(filteredBatting.map(p => p.name));
    const statuses = effectiveRoster.map(p => ({
      name: p.name,
      num: p.num,
      currentStatus: p.status,
      appearedInBoxScore: appearedNames.has(p.name),
      gameStatus: appearedNames.has(p.name) ? "played" : "sat",
      isAP: p.status === STATUS.AP,
    }));
    setPlayerStatuses(statuses);

    // Pre-fill defensive innings — one row per player, using their batting position
    // Include all players with a valid position, even if 0 AB
    // Deduplicate by name (keep first occurrence)
    const seenDef = new Set();
    const defPrefill = filteredBatting
      .filter(p => p.pos && p.pos !== "EH" && p.pos !== "DH" && !seenDef.has(p.name) && seenDef.add(p.name))
      .map(p => ({ name: p.name, pos: p.pos, innings }));

    // Also add pitchers who appeared in pitching but not in batting defensive rows
    // (rare but possible if pitcher was EH/DH in batting)
    filteredPitching.forEach(p => {
      if (!seenDef.has(p.name)) {
        seenDef.add(p.name);
        defPrefill.push({ name: p.name, pos: "P", innings });
      }
    });

    setDefRows(defPrefill.length > 0 ? defPrefill : roster.map(p => ({ name: p.name, pos: "", innings: 0 })));
  };

  const updateUnknown = (i, field, val) =>
    setUnknowns(prev => prev.map((u, j) => j === i ? { ...u, [field]: val, ...(field === "resolution" && val !== "map" ? { mappedTo: null } : {}) } : u));

  const handleMappingsDone = () => {
    buildSteps2and3(parsed, totalInnings, unknowns);
    setStep(2);
  };

  // ── Step 2 helpers ──
  const setGameStatus = (name, status) => {
    setPlayerStatuses(prev => prev.map(p => p.name === name ? { ...p, gameStatus: status } : p));
  };

  // ── Step 3 helpers ──
  const addDefRow = () => setDefRows(r => [...r, { name: roster[0].name, pos: "", innings: 0 }]);
  const removeDefRow = i => setDefRows(r => r.filter((_, j) => j !== i));
  const updateDefRow = (i, field, val) => setDefRows(r => r.map((row, j) => j === i ? { ...row, [field]: val } : row));

  const defTotals = {};
  defRows.forEach(r => { if (r.name) defTotals[r.name] = (defTotals[r.name] || 0) + Number(r.innings); });

  // ── Step 4: confirm & save ──
  const handleSave = () => {
    const statusUpdates = {};
    const newAPs = [];

    playerStatuses.forEach(p => {
      if (p.isAP) {
        // Add to roster as AP if not already there
        newAPs.push({ name: p.name, num: "AP", pos: "", status: STATUS.AP });
      } else {
        if (p.gameStatus === "il")   statusUpdates[p.name] = STATUS.IL;
        if (p.gameStatus === "away") statusUpdates[p.name] = STATUS.AWAY;
        if (p.gameStatus === "played" || p.gameStatus === "sat") statusUpdates[p.name] = STATUS.ACTIVE;
      }
    });

    const game = {
      id: `g${Date.now()}`,
      date: parsed.date,
      opponent: parsed.opponent,
      result: parsed.result,
      score: parsed.score,
      totalInnings,
      batting:   parsed.batting,
      pitching:  parsed.pitching,
      defensive: defRows.filter(r => r.name && r.pos && r.innings > 0),
      playerGameStatuses: playerStatuses.map(p => ({ name: p.name, gameStatus: p.gameStatus })),
    };
    onComplete(game, statusUpdates, newAPs);
  };

  const StepDot = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {[1,2,3,4,5].map((s, i) => {
        const effectiveStep = step === 1.5 ? 1.5 : step;
        const filled = effectiveStep >= s || (s === 2 && effectiveStep === 1.5);
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: filled ? C.gold : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: filled ? C.navy : C.muted, transition: "all 0.2s" }}>{s}</div>
            {i < 4 && <div style={{ width: 16, height: 2, background: effectiveStep > s ? C.gold : "rgba(255,255,255,0.1)", transition: "all 0.2s" }} />}
          </div>
        );
      })}
    </div>
  );

  const stepLabels = { 1: "Import", 1.5: "Name Check", 2: "Availability", 3: "Defence", 4: "Confirm", 5: "Confirm" };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.dark} 0%, ${C.mid} 100%)`, fontFamily: "'Barlow', sans-serif", color: C.white }}>
      <style>{`body { background: #0d1828 !important; }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Wizard header */}
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: "14px 12px 12px", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Add Game</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>{stepLabels[step]}</div>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <StepDot />
      </div>
      <div style={{ padding: "12px 12px", boxSizing: "border-box", width: "100%", overflowX: "hidden" }}>

          {/* ── STEP 1: IMPORT BOX SCORE ── */}
          {step === 1 && (
            <div>
              {/* Screenshot upload zone */}
              <div
                onClick={() => !pdfLoading && document.getElementById("gc-img-upload").click()}
                style={{ border: `2px dashed ${boxText ? C.green : C.border}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: pdfLoading ? "wait" : "pointer", marginBottom: 16, background: boxText ? "rgba(76,175,130,0.06)" : "rgba(255,255,255,0.02)", transition: "all 0.2s" }}
              >
                <input id="gc-img-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                {pdfLoading ? (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                    <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>Loading image…</div>
                  </div>
                ) : boxText.startsWith("__IMAGE__") ? (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>Screenshot loaded</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Tap to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>📲</div>
                    <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Tap to upload box score screenshot</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 8, lineHeight: 1.7 }}>
                      In GameChanger: open the game → Stats screen<br />
                      Take a <b style={{ color: C.gold }}>screenshot</b> → upload it here
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>or paste text</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Paste fallback */}
              <textarea value={boxText.startsWith("__IMAGE__") ? "" : boxText}
                onChange={e => setBoxText(e.target.value)}
                placeholder="Paste JSON from Claude, or GameChanger box score text…"
                style={{ width: "100%", minHeight: 100, background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 12, padding: 14, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box", lineHeight: 1.6 }} />

              {parseErr && <div style={{ color: C.red, fontSize: 11, marginTop: 8, padding: "6px 10px", background: "rgba(224,85,85,0.1)", borderRadius: 6 }}>{parseErr}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Btn onClick={handleParse} disabled={parsing || pdfLoading || !boxText.trim()} style={{ flex: 1, padding: "12px 0" }}>
                  {parsing ? "Reading box score…" : "Import Box Score →"}
                </Btn>
                <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 1.5: NAME MAPPING ── */}
          {step === 1.5 && (
            <div>
              <div style={{ background: "rgba(56,178,172,0.08)", border: "1px solid rgba(56,178,172,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 4 }}>Unrecognized Players Found</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>The box score contains names not on your roster. For each one, choose what to do.</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {unknowns.map((u, i) => (
                  <div key={i} style={{ background: C.panel, borderRadius: 10, padding: "12px 14px", border: `1px solid rgba(255,255,255,0.07)` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 10 }}>"{u.parsedName}"</div>
                    {/* Resolution options */}
                    <div style={{ display: "flex", gap: 6, marginBottom: u.resolution === "map" ? 10 : 0, flexWrap: "wrap" }}>
                      {[
                        { k: "ap",   label: "🔵 Add as AP",        color: C.teal, desc: "Affiliated player — tracked separately" },
                        { k: "map",  label: "🔁 Map to roster",    color: C.gold, desc: "Same player, different spelling" },
                        { k: "skip", label: "✕ Ignore",            color: C.muted, desc: "Not your team's player" },
                      ].map(opt => (
                        <button key={opt.k} onClick={() => updateUnknown(i, "resolution", opt.k)}
                          style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            border: `1px solid ${u.resolution === opt.k ? opt.color : "rgba(255,255,255,0.1)"}`,
                            background: u.resolution === opt.k ? `${opt.color}22` : "transparent",
                            color: u.resolution === opt.k ? opt.color : C.muted, transition: "all 0.15s" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Map to dropdown */}
                    {u.resolution === "map" && (
                      <select value={u.mappedTo || ""} onChange={e => updateUnknown(i, "mappedTo", e.target.value)}
                        style={{ width: "100%", background: C.navy, border: `1px solid ${C.gold}`, borderRadius: 8, color: u.mappedTo ? C.white : C.muted, fontSize: 12, padding: "8px 10px" }}>
                        <option value="">Select roster player…</option>
                        {roster.map(p => <option key={p.name} value={p.name}>#{p.num} {p.name}</option>)}
                      </select>
                    )}
                    {u.resolution === "ap" && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Will appear in stats with a 🔵 AP badge. Won't be added permanently to your roster.</div>
                    )}
                    {u.resolution === "skip" && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>This player's stats will be excluded from this game.</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setStep(1)} variant="ghost">← Back</Btn>
                <Btn onClick={handleMappingsDone}
                  disabled={unknowns.some(u => u.resolution === "map" && !u.mappedTo)}
                  style={{ flex: 1, padding: "12px 0" }}>
                  Continue →
                </Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2: PLAYER AVAILABILITY ── */}
          {step === 2 && parsed && (
            <div>
              <div style={{ background: C.panel, borderRadius: 10, padding: "10px 14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>vs. {parsed.opponent}</div>
                <div style={{ fontSize: 12, color: C.gold, marginTop: 3 }}>{parsed.date} · {parsed.result} {parsed.score} · {totalInnings} inn</div>
              </div>

              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                Tap to change status. <span style={{ color: C.green }}>Played</span> = found in box score.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 12 }}>
                {playerStatuses.map((p, i) => {
                  const cycle = { played: "sat", sat: "away", away: "il", il: "played" };
                  const statusDisplay = {
                    played: { label: "✓", color: C.green,  bg: "rgba(76,175,130,0.2)",  border: "rgba(76,175,130,0.5)"  },
                    sat:    { label: "–", color: C.muted,  bg: "rgba(107,130,160,0.1)", border: "rgba(107,130,160,0.3)" },
                    away:   { label: "A", color: C.yellow, bg: "rgba(245,166,34,0.15)", border: "rgba(245,166,34,0.4)"  },
                    il:     { label: "IL",color: C.red,    bg: "rgba(224,85,85,0.15)",  border: "rgba(224,85,85,0.4)"   },
                  };
                  const sd = statusDisplay[p.gameStatus];
                  return (
                    <div key={i} onClick={() => setGameStatus(p.name, cycle[p.gameStatus])}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: C.panel, borderRadius: 4, padding: "3px 6px", cursor: "pointer", borderLeft: `3px solid ${sd.border}` }}>
                      <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, background: sd.bg, color: sd.color }}>{sd.label}</div>
                      <div style={{ width: 18, height: 18, borderRadius: 3, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 9, color: C.gold, flexShrink: 0 }}>{p.num}</div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: C.white, flex: 1 }}>{p.name}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, textAlign: "left" }}>Tap to cycle: ✓ Played · – Sat · A Away · IL</div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={() => setStep(1)} variant="ghost" style={{ whiteSpace: "nowrap" }}>← Back</Btn>
                <Btn onClick={() => setStep(3)} style={{ flex: 1, padding: "13px 0", fontSize: 13, whiteSpace: "nowrap" }}>Def. Innings →</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3: DEFENSIVE INNINGS ── */}
          {step === 3 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
                <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>Total innings this game</span>
                <input type="number" min={1} max={14} value={totalInnings} onChange={e => setTotalInnings(Number(e.target.value))}
                  style={{ width: 48, background: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, color: C.gold, fontSize: 14, fontWeight: 700, textAlign: "center", padding: "4px 0" }} />
              </div>

              <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Tap a player to set their defensive innings and position.</div>

              {/* Player cards */}
              {(() => {
                const playerNames = playerStatuses.filter(p => p.gameStatus === "played").map(p => p.name);
                return playerNames.map(name => {
                  const playerRows = defRows.filter(r => r.name === name);
                  const total = playerRows.reduce((s, r) => s + Number(r.innings), 0);
                  const isExpanded = expandedDefPlayer === name;
                  const over = total > totalInnings;

                  const handleExpand = () => {
                    if (!isExpanded && playerRows.length === 0) {
                      // Auto-init from batting position
                      const battingPos = parsed?.batting?.find(p => p.name === name)?.pos;
                      const pos = (battingPos && battingPos !== "EH" && battingPos !== "DH") ? battingPos : "";
                      setDefRows(prev => [...prev, { name, pos, innings: totalInnings }]);
                    }
                    setExpandedDefPlayer(isExpanded ? null : name);
                  };

                  return (
                    <div key={name} style={{ marginBottom: 4 }}>
                      {/* Player header row - tap to expand */}
                      <div onClick={handleExpand}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel, borderRadius: isExpanded ? "6px 6px 0 0" : 6, padding: "6px 10px", cursor: "pointer", borderLeft: `3px solid ${over ? C.red : total === totalInnings ? C.green : total > 0 ? C.gold : C.muted}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: C.white }}>{shortN(name)}</div>
                          {playerRows.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                              {playerRows.map((r, i) => (
                                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: POS_COLORS[r.pos] || C.muted, background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 5px" }}>
                                  {r.pos} <span style={{ color: C.gold }}>{r.innings}inn</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: over ? C.red : total === totalInnings ? C.green : C.muted, flexShrink: 0 }}>
                          {total}/{totalInnings}
                        </span>
                        <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "0 0 6px 6px", padding: "8px 10px", border: `1px solid rgba(255,255,255,0.06)`, borderTop: "none" }}>
                          {playerRows.map((r, rowIdx) => {
                            let count = -1;
                            const globalIdx = defRows.findIndex(d => {
                              if (d.name === name) { count++; return count === rowIdx; }
                              return false;
                            });
                            return (
                              <div key={rowIdx} style={{ marginBottom: 8, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Position</span>
                                  {playerRows.length > 1 && (
                                    <button onClick={() => setDefRows(prev => prev.filter((_, di) => di !== globalIdx))}
                                      style={{ background: "none", border: "none", color: C.red, fontSize: 12, cursor: "pointer", padding: 0 }}>Remove</button>
                                  )}
                                </div>
                                <select value={r.pos} onChange={e => updateDefRow(globalIdx, "pos", e.target.value)}
                                  style={{ width: "100%", background: C.navy, border: `1px solid ${C.border}`, borderRadius: 5, color: r.pos ? (POS_COLORS[r.pos] || C.white) : C.muted, fontSize: 12, padding: "7px 4px", fontWeight: 700, marginBottom: 8 }}>
                                  <option value="">Select Position</option>
                                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Innings at this position</span>
                                  <input type="number" min={0} max={14} step={1} value={r.innings}
                                    onChange={e => updateDefRow(globalIdx, "innings", parseFloat(e.target.value) || 0)}
                                    onFocus={e => e.target.select()}
                                    style={{ width: 52, background: C.gold, border: "none", borderRadius: 5, color: C.navy, fontSize: 15, fontWeight: 800, textAlign: "center", padding: "6px 0" }} />
                                </div>
                              </div>
                            );
                          })}
                          <button onClick={() => setDefRows(prev => [...prev, { name, pos: "", innings: 0 }])}
                            style={{ width: "100%", padding: "6px 0", borderRadius: 5, background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
                            + Add Position
                          </button>
                          <button onClick={() => setExpandedDefPlayer(null)}
                            style={{ width: "100%", padding: "8px 0", borderRadius: 5, background: C.gold, border: "none", color: C.navy, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                            Save ✓
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              <Btn onClick={handleSave} style={{ width: "100%", padding: "13px 0", fontSize: 14, boxSizing: "border-box", marginTop: 12 }}>
                Save Game ✓
              </Btn>
            </div>
          )}

          {/* ── STEP 4: CONFIRM ── */}
          {step === 4 && parsed && (
            <div>
              <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>vs. {parsed.opponent}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{parsed.date} · {parsed.result} {parsed.score} · {totalInnings} inn</div>
              </div>

              {/* Batting summary */}
              <SH>Batting ({parsed.batting.length} players)</SH>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                {parsed.batting.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 9px", color: C.muted }}>
                    {shortN(p.name)} <span style={{ color: p.h > 0 ? C.gold : C.muted }}>{p.h}H</span> {p.rbi > 0 ? <span style={{ color: C.white }}>{p.rbi}RBI</span> : ""}
                  </span>
                ))}
              </div>

              {/* Pitching summary */}
              <SH>Pitching ({parsed.pitching.length} pitchers)</SH>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                {parsed.pitching.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 9px", color: C.muted }}>
                    {shortN(p.name)} <span style={{ color: C.gold }}>{p.ip}IP</span> {p.so}K {p.pitches}P
                  </span>
                ))}
              </div>

              {/* Availability summary */}
              <SH>Availability</SH>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                {playerStatuses.map((p, i) => {
                  const opts = { played: { color: C.green, label: "✓" }, sat: { color: C.muted, label: "sat" }, away: { color: C.yellow, label: "away" }, il: { color: C.red, label: "IL" } };
                  const o = opts[p.gameStatus];
                  return <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 9px", color: C.muted }}>{shortN(p.name)} <span style={{ color: o.color, fontWeight: 700 }}>{o.label}</span></span>;
                })}
              </div>

              {/* Defensive summary */}
              <SH>Defensive Innings</SH>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20 }}>
                {Object.entries(defTotals).map(([name, tot]) => (
                  <span key={name} style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 9px", color: C.muted }}>{shortN(name)} <span style={{ color: C.teal }}>{tot}inn</span></span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setStep(3)} variant="ghost">← Back</Btn>
                <Btn onClick={handleSave} style={{ flex: 1, padding: "12px 0" }}>Save Game ✓</Btn>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ teamName, season, roster, games, onAddGame, onOpenLineups, onRosterChange, onTeamChange, onPlayerEdit, onAddPlayer, onRemovePlayer, seasons, activeId, onSwitchSeason, onNewSeason, onImportAll }) {
  const [tab, setTab]       = useState("Batting");
  const [selGame, setSelGame] = useState("all");
  const [bStat, setBStat]   = useState("h");
  const [pStat, setPStat]   = useState("so");

  const displayGames = selGame === "all" ? games : games.filter(g => g.id === selGame);
  const { batting, pitching, defensive } = useMemo(() => aggregateStats(displayGames), [displayGames]);
  const totalSeasonInnings = displayGames.reduce((s, g) => s + (g.totalInnings || 0), 0);

  const pStatus = name => roster.find(p => p.name === name)?.status || STATUS.ACTIVE;
  const unavailable = roster.filter(p => p.status !== STATUS.ACTIVE);

  const bStatOpts = [{ k:"ab",label:"AB" },{ k:"h",label:"Hits" },{ k:"r",label:"Runs" },{ k:"rbi",label:"RBI" },{ k:"doubles",label:"2B" },{ k:"triples",label:"3B" },{ k:"hr",label:"HR" },{ k:"sb",label:"SB" },{ k:"bb",label:"BB" },{ k:"so",label:"K's" }];
  const pStatOpts = [{ k:"so",label:"K's" },{ k:"ip",label:"IP" },{ k:"pitches",label:"Pitches" },{ k:"strikes",label:"Strikes" },{ k:"bb",label:"BB" },{ k:"er",label:"ER" }];

  const bChartData = batting
    .filter(p => p.ab > 0 && p[bStat] > 0)
    .map(p => ({ name: shortN(p.name), value: p[bStat] }))
    .sort((a,b) => b.value - a.value);

  const pChartData = pitching
    .map(p => ({
      name: shortN(p.name),
      value: pStat === "ip" ? parseFloat(p.ipR.toFixed(2)) : p[pStat]
    }))
    .filter(p => p.value > 0)
    .sort((a,b) => b.value - a.value);

  const totAB = batting.reduce((s,p) => s+p.ab, 0);
  const totH  = batting.reduce((s,p) => s+p.h,  0);
  const totR  = batting.reduce((s,p) => s+p.r,  0);
  const totIP = pitching.reduce((s,p) => s+p.ipR, 0);
  const totK  = pitching.reduce((s,p) => s+p.so,  0);

  const bRows = batting.map(p => {
    const s = ST[pStatus(p.name)];
    return { name: `${s.badge} #${roster.find(r=>r.name===p.name)?.num??""} ${shortN(p.name)}`, gp: p.gp, ab: p.ab, avg: battingAvg(p.h,p.ab), h: p.h, r: p.r, rbi: p.rbi, doubles: p.doubles||0, triples: p.triples||0, hr: p.hr||0, sb: p.sb||0, bb: p.bb, so: p.so };
  });
  const bTotals = { name: "⚾ TOTALS", avg: battingAvg(totH, totAB), ab: batting.reduce((s,p)=>s+p.ab,0), h: totH, r: totR, rbi: batting.reduce((s,p)=>s+p.rbi,0), doubles: batting.reduce((s,p)=>s+(p.doubles||0),0), triples: batting.reduce((s,p)=>s+(p.triples||0),0), hr: batting.reduce((s,p)=>s+(p.hr||0),0), sb: batting.reduce((s,p)=>s+(p.sb||0),0), bb: batting.reduce((s,p)=>s+p.bb,0), so: batting.reduce((s,p)=>s+p.so,0), gp: "-" };
  const pRows = pitching.map(p => {
    const s = ST[pStatus(p.name)];
    return { name: `${s.badge} #${roster.find(r=>r.name===p.name)?.num??""} ${shortN(p.name)}`, gp: p.gp, ip: fmtIp(p.ipR), era: calcEra(p.er, p.ipR), so: p.so, bb: p.bb, h: p.h, er: p.er, ps: `${p.pitches}-${p.strikes}`, bf: p.bf };
  });

  const maxDefInnings = Math.max(...defensive.map(d => d.total), 1);

  const cycleStatus = (name) => {
    const cur = roster.find(p => p.name === name)?.status || STATUS.ACTIVE;
    const cycle = { active: STATUS.IL, il: STATUS.AWAY, away: STATUS.AP, ap: STATUS.ACTIVE };
    onRosterChange(name, cycle[cur] || STATUS.ACTIVE);
  };

  const TABS = ["Batting", "Pitching", "Defence", "Roster"];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.dark} 0%, ${C.mid} 100%)`, fontFamily: "'Barlow', sans-serif", color: C.white, paddingBottom: 60 }}>
      <style>{`body { background: #0d1828 !important; }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: "14px 16px 12px", boxSizing: "border-box", width: "100%" }}>
        <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3.5, textTransform: "uppercase", marginBottom: 4 }}>Season Tracker · {season}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teamName}</div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onOpenLineups} style={{ padding: "7px 11px", borderRadius: 8, background: C.gold, border: "none", color: C.navy, fontWeight: 800, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Lineups</button>
            <button onClick={onAddGame} style={{ padding: "7px 11px", borderRadius: 8, background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, fontWeight: 800, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Import</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
          {games.length} game{games.length !== 1 ? "s" : ""} · {games.filter(g=>g.result==="W").length}W–{games.filter(g=>g.result==="L").length}L
        </div>
      </div>

      {/* Unavailable banner */}
      {unavailable.length > 0 && (
        <div style={{ background: "rgba(0,0,0,0.25)", padding: "7px 20px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 2 }}>Out:</span>
          {unavailable.map(p => {
            const s = ST[p.status];
            return <span key={p.name} style={{ fontSize: 11, fontWeight: 700, color: s.dot, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: "2px 10px" }}>{s.badge} #{p.num} {shortN(p.name)} · {s.label}</span>;
          })}
        </div>
      )}

      {/* Game filter */}
      {games.length > 0 && (
        <div style={{ padding: "10px 20px 0", display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap", marginRight: 4 }}>View:</span>
          <StatBtn label="All" active={selGame === "all"} onClick={() => setSelGame("all")} />
          {games.map(g => <StatBtn key={g.id} label={g.date} active={selGame === g.id} onClick={() => setSelGame(g.id)} />)}
        </div>
      )}

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", boxSizing: "border-box" }}>
        {[
          { label: "BA",      value: battingAvg(totH, totAB), hi: true },
          { label: "Runs",    value: totR },
          { label: "Hits",    value: totH },
          { label: "IP",      value: fmtIp(totIP) },
          { label: "K's",     value: totK },
          { label: "Def Inn", value: totalSeasonInnings },
        ].map(p => (
          <div key={p.label} style={{ background: p.hi ? C.gold : "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px", textAlign: "center", minWidth: 48, flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: p.hi ? C.navy : C.white, fontFamily: "'Oswald', sans-serif" }}>{p.value}</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: p.hi ? C.navy : C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: 1, color: tab === t ? C.gold : C.muted, borderBottom: `2px solid ${tab === t ? C.gold : "transparent"}`, marginBottom: -1, transition: "all 0.15s" }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: tab === "Batting" || tab === "Pitching" ? "0" : "0 20px" }}>

        {/* No games yet */}
        {games.length === 0 && tab !== "Roster" && (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚾</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 6 }}>No games yet</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Import your first GameChanger box score to get started.</div>
            <Btn onClick={onAddGame}>+ Add First Game</Btn>
          </div>
        )}

        {/* ── DEFENCE TAB ── */}
        {tab === "Defence" && games.length > 0 && (
          <div>
            <SH>Defensive Innings — Playing Time</SH>
            {defensive.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 12, padding: "20px 0" }}>No defensive innings logged yet. Edit a game to add them.</div>
            ) : (
              <>
                <div style={{ height: 190, marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={defensive.map(d => ({ name: shortN(d.name), total: d.total }))} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: C.white, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="total" name="Def Inn" radius={[4,4,0,0]}>
                        {defensive.map((d, i) => {
                          const pct = d.total / maxDefInnings;
                          return <Cell key={i} fill={pct > 0.8 ? C.green : pct > 0.5 ? C.gold : C.red} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 18 }}>
                  Avg: <span style={{ color: C.gold, fontWeight: 700 }}>{(defensive.reduce((s,d)=>s+d.total,0)/defensive.length).toFixed(1)}</span> inn/player
                </div>
                <SH>By Position</SH>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {defensive.map((d, i) => {
                    const s = ST[pStatus(d.name)];
                    return (
                      <div key={i} style={{ background: C.panel, borderRadius: 10, padding: "10px 14px", border: `1px solid ${pStatus(d.name) !== STATUS.ACTIVE ? s.border : "rgba(255,255,255,0.05)"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 12 }}>{s.badge} {shortN(d.name)}</span>
                          <span style={{ color: C.gold, fontWeight: 700, fontSize: 12 }}>{d.total} <span style={{ color: C.muted, fontWeight: 400, fontSize: 10 }}>inn</span></span>
                        </div>
                        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 6 }}>
                          {Object.entries(d.byPos).sort((a,b)=>b[1]-a[1]).map(([pos, inn]) => (
                            <div key={pos} title={`${pos}: ${inn} inn`} style={{ flex: inn, background: POS_COLORS[pos] || C.muted, minWidth: 2 }} />
                          ))}
                          {totalSeasonInnings > d.total && <div style={{ flex: totalSeasonInnings - d.total, background: "rgba(255,255,255,0.06)" }} />}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {Object.entries(d.byPos).sort((a,b)=>b[1]-a[1]).map(([pos, inn]) => (
                            <span key={pos} style={{ fontSize: 10, fontWeight: 700, color: POS_COLORS[pos]||C.muted, background: "rgba(255,255,255,0.05)", borderRadius: 5, padding: "2px 7px" }}>
                              {pos} <span style={{ color: C.white }}>{inn}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BATTING TAB ── */}
        {tab === "Batting" && games.length > 0 && (
          <div>
            <Table expandable highlight={bStat} cols={[{k:"name",label:"Player",left:true},{k:"avg",label:"AVG"},{k:"ab",label:"AB"},{k:"h",label:"H"},{k:"r",label:"R"},{k:"rbi",label:"RBI"},{k:"doubles",label:"2B"},{k:"triples",label:"3B"},{k:"hr",label:"HR"},{k:"sb",label:"SB"},{k:"bb",label:"BB"},{k:"so",label:"K"}]} rows={[...bRows, { ...bTotals, _totals: true }]} />
          </div>
        )}

        {/* ── PITCHING TAB ── */}
        {tab === "Pitching" && games.length > 0 && (
          <div>
            {/* Stat selector */}
            <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
              {pStatOpts.map(s => <StatBtn key={s.k} label={s.label} active={pStat === s.k} onClick={() => setPStat(s.k)} />)}
            </div>

            {/* Compact chart */}
            <div style={{ height: 120, marginBottom: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pChartData} margin={{ left: -20, right: 10, top: 4 }}>
                  <XAxis dataKey="name" tick={{ fill: C.white, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={pStat === "ip"} domain={[0, 'auto']} tickFormatter={v => pStat === "ip" ? v : Math.round(v)} width={28} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" name={pStatOpts.find(s=>s.k===pStat)?.label} radius={[4,4,0,0]}>
                    {pChartData.map((_,i) => <Cell key={i} fill={C.gold} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Strike % — compact inline */}
            <div style={{ marginBottom: 10, padding: "8px 12px", background: C.panel, borderRadius: 10, border: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.gold, marginBottom: 8 }}>Strike %  <span style={{ color: C.muted, fontWeight: 400 }}>· 60% target</span></div>
              {pitching.map((p, i) => {
                const pct = p.pitches > 0 ? Math.round(p.strikes / p.pitches * 100) : 0;
                return (
                  <div key={i} style={{ marginBottom: i < pitching.length - 1 ? 8 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ color: C.white, fontSize: 11, fontWeight: 600 }}>{ST[pStatus(p.name)].badge} {shortN(p.name)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 60 ? C.green : pct >= 50 ? C.gold : C.red }}>
                        {pct}% <span style={{ color: C.muted, fontWeight: 400, fontSize: 10 }}>({p.strikes}/{p.pitches}) {fmtIp(p.ipR)}IP</span>
                      </span>
                    </div>
                    <div style={{ position: "relative", height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 60 ? C.green : pct >= 50 ? C.gold : C.red, borderRadius: 3 }} />
                      <div style={{ position: "absolute", left: "60%", top: 0, width: 1, height: "100%", background: "rgba(255,255,255,0.3)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pitching table */}
            <Table highlight={pStat} cols={[{k:"name",label:"Pitcher",left:true},{k:"gp",label:"GP"},{k:"ip",label:"IP"},{k:"era",label:"ERA"},{k:"so",label:"K"},{k:"bb",label:"BB"},{k:"spct",label:"K%"},{k:"ps",label:"P-S"}]}
              rows={pitching.map(p => {
                const s = ST[pStatus(p.name)];
                const pct = p.pitches > 0 ? Math.round(p.strikes / p.pitches * 100) : 0;
                return { name: `${s.badge} #${roster.find(r=>r.name===p.name)?.num??""} ${shortN(p.name)}`, gp: p.gp, ip: fmtIp(p.ipR), era: calcEra(p.er, p.ipR), so: p.so, bb: p.bb, spct: `${pct}%`, ps: `${p.pitches}-${p.strikes}` };
              })} />
          </div>
        )}

        {/* ── ROSTER TAB ── */}
        {tab === "Roster" && (
          <RosterEditor
            teamName={teamName} season={season} roster={roster}
            onTeamChange={onTeamChange} onPlayerEdit={onPlayerEdit}
            onAddPlayer={onAddPlayer} onRemovePlayer={onRemovePlayer}
            onCycleStatus={cycleStatus}
            seasons={seasons} activeId={activeId} onSwitchSeason={onSwitchSeason} onNewSeason={onNewSeason} onImportAll={onImportAll}
          />
        )}
      </div>
    </div>
  );
}

// ── ROSTER EDITOR ─────────────────────────────────────────────────────────────
function RosterEditor({ teamName, season, roster, onTeamChange, onPlayerEdit, onAddPlayer, onRemovePlayer, onCycleStatus, seasons, activeId, onSwitchSeason, onNewSeason, onImportAll }) {
  const [confirmIdx, setConfirmIdx] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);
  const backupText = () => JSON.stringify({ app: "diamond-coach", version: 1, activeId, seasons });
  const parseBackup = text => {
    try {
      const d = JSON.parse(text.trim());
      if (d.app !== "diamond-coach" || !Array.isArray(d.seasons) || !d.seasons.length) return { error: "That doesn't look like Diamond Coach data." };
      return { seasons: d.seasons, activeId: d.activeId };
    } catch { return { error: "Couldn't read that. Make sure you pasted all of it." }; }
  };
  const doCopy = async () => {
    const t = backupText();
    try { await navigator.clipboard.writeText(t); }
    catch { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const doDownload = () => {
    const url = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `diamond-coach-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const lbl = { fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 };
  return (
    <div>
      <SH>Season</SH>
      <div style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${C.border}` }}>
        <select value={activeId} onChange={e => onSwitchSeason(e.target.value)}
          style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 14, fontWeight: 700, padding: "10px 10px" }}>
          {seasons.map(x => <option key={x.id} value={x.id}>{x.teamName || "Team"} {x.season} ({x.games.length} games)</option>)}
        </select>
        {!newOpen ? (
          <button onClick={() => setNewOpen(true)} style={{ marginTop: 10, background: "none", border: "none", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>+ New season</button>
        ) : (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { onNewSeason(true); setNewOpen(false); }} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, background: C.gold, border: "none", color: C.navy, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Copy this roster</button>
            <button onClick={() => { onNewSeason(false); setNewOpen(false); }} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Start blank</button>
            <button onClick={() => setNewOpen(false)} style={{ padding: "9px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
          </div>
        )}
      </div>

      <SH>Team</SH>
      <div style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={lbl}>Team Name</div>
          <Input value={teamName} onChange={e => onTeamChange({ teamName: e.target.value })} placeholder="Your team name" style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ width: 76 }}>
          <div style={lbl}>Season</div>
          <Input value={season} onChange={e => onTeamChange({ season: e.target.value })} placeholder="2027" style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      <SH>Players ({roster.length})</SH>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Edit any field directly. Tap the status pill to cycle Active, IL, Away, AP.</div>

      {roster.length === 0 && (
        <div style={{ background: C.panel, borderRadius: 10, padding: "18px 14px", marginBottom: 12, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
          No players yet. Add your roster below, or just import a box score and players are added as you go.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {roster.map((p, i) => {
          const s = ST[p.status] || ST.active;
          return (
            <div key={p.id || i} style={{ background: C.panel, borderRadius: 10, padding: "10px 10px 8px", border: `1px solid ${p.status !== STATUS.ACTIVE ? s.border : "rgba(255,255,255,0.05)"}` }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input value={p.num} onChange={e => onPlayerEdit(i, { num: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} placeholder="#" style={{ width: 44, textAlign: "center", flex: "none", boxSizing: "border-box" }} />
                <Input value={p.name} onChange={e => onPlayerEdit(i, { name: e.target.value })} placeholder="Player name" style={{ flex: 1, minWidth: 0, boxSizing: "border-box" }} />
                <select value={p.pos || ""} onChange={e => onPlayerEdit(i, { pos: e.target.value })}
                  style={{ width: 58, flex: "none", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: p.pos ? (POS_COLORS[p.pos] || C.white) : C.muted, fontSize: 12, padding: "8px 4px", fontWeight: 700 }}>
                  <option value="">-</option>
                  {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button onClick={() => onCycleStatus(p.name)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, cursor: "pointer" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.dot }}>{s.label}</span>
                </button>
                <div style={{ flex: 1 }} />
                {confirmIdx === i ? (
                  <>
                    <button onClick={() => { onRemovePlayer(i); setConfirmIdx(null); }} style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(224,85,85,0.15)", border: `1px solid ${C.red}`, color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                    <button onClick={() => setConfirmIdx(null)} style={{ padding: "4px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmIdx(i)} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", padding: "4px 2px" }}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAddPlayer} style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "transparent", border: `1px dashed ${C.gold}`, color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>
        + Add Player
      </button>

      <SH>Backup &amp; Move Data</SH>
      <div style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
          Copy everything (all seasons, rosters, games, lineups) and paste it into the app on another device. Also works as a backup.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={doCopy} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, background: C.gold, border: "none", color: C.navy, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>{copied ? "Copied" : "Copy data"}</button>
          <button onClick={doDownload} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Download file</button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Paste data from another device</div>
        <textarea value={pasteText} onChange={e => { setPasteText(e.target.value); setImportMsg(""); }} placeholder="Paste here" rows={3}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 12, padding: 10, outline: "none", fontFamily: "monospace" }} />
        {!confirmImport ? (
          <button onClick={() => { const r = parseBackup(pasteText); if (r.error) setImportMsg(r.error); else { setImportMsg(`Found ${r.seasons.length} season(s). Importing replaces everything on this device.`); setConfirmImport(true); } }} disabled={!pasteText.trim()}
            style={{ marginTop: 8, width: "100%", padding: "10px 0", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.white, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: pasteText.trim() ? 1 : 0.5 }}>Import</button>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => { const r = parseBackup(pasteText); if (!r.error) { onImportAll(r); setPasteText(""); setImportMsg("Imported."); } setConfirmImport(false); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "rgba(224,85,85,0.15)", border: `1px solid ${C.red}`, color: C.red, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Replace my data</button>
            <button onClick={() => { setConfirmImport(false); setImportMsg(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cancel</button>
          </div>
        )}
        {importMsg && <div style={{ fontSize: 11, color: importMsg.startsWith("Imported") ? C.green : C.gold, marginTop: 8 }}>{importMsg}</div>}
      </div>

      <div style={{ display: "flex", gap: 10, padding: "12px 0", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {Object.entries(ST).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.dot, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: C.muted }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export default function App() {
  // Each season keeps its own team name, roster, games and lineups.
  const [seasons, setSeasons] = useState(() => {
    const saved = load('dc_seasons', null);
    if (saved && saved.length) return saved;
    const t = load('dc_team', { teamName: "My Team", season: String(new Date().getFullYear()) });
    return [{ id: 's1', teamName: t.teamName, season: t.season, roster: load('dc_roster', []), games: load('dc_games', []), lineups: load('dc_lineups', []) }];
  });
  const [activeId, setActiveId] = useState(() => load('dc_active', null));
  const active = seasons.find(x => x.id === activeId) || seasons[0];
  const team = { teamName: active.teamName, season: active.season };
  const roster = active.roster, games = active.games, lineups = active.lineups;

  const upd = key => v => setSeasons(prev => prev.map(x => x.id === active.id ? { ...x, [key]: typeof v === 'function' ? v(x[key]) : v } : x));
  const setRoster = upd('roster'), setGames = upd('games'), setLineups = upd('lineups');
  const setTeamPatch = patch => setSeasons(prev => prev.map(x => x.id === active.id ? { ...x, ...patch } : x));

  const newSeason = copyRoster => {
    const id = newId();
    const yr = parseInt(active.season) ? String(parseInt(active.season) + 1) : "";
    const copied = copyRoster ? active.roster.map(p => ({ ...p, status: STATUS.ACTIVE })) : [];
    setSeasons(prev => [...prev, { id, teamName: active.teamName, season: yr, roster: copied, games: [], lineups: [] }]);
    setActiveId(id);
  };

  const [showImport, setShowImport] = useState(false);
  const [showLineups, setShowLineups] = useState(false);
  React.useEffect(() => { try { localStorage.setItem('dc_seasons', JSON.stringify(seasons)); } catch {} }, [seasons]);
  React.useEffect(() => { try { localStorage.setItem('dc_active', JSON.stringify(active.id)); } catch {} }, [active.id]);

  const handleImportComplete = (game, statusUpdates, newAPs = []) => {
    setGames(prev => [...prev, game]);
    setRoster(prev => {
      const updated = prev.map(p => statusUpdates[p.name] ? { ...p, status: statusUpdates[p.name] } : p);
      const existingNames = new Set(updated.map(p => p.name));
      const toAdd = newAPs.filter(p => !existingNames.has(p.name));
      return [...updated, ...toAdd];
    });
    setShowImport(false);
  };

  const handleRosterChange = (name, newStatus) => {
    setRoster(prev => prev.map(p => p.name === name ? { ...p, status: newStatus } : p));
  };

  // Edit a player. If the name changes, carry it through saved games so stats stay linked.
  const handlePlayerEdit = (idx, patch) => {
    const oldName = roster[idx]?.name;
    if (patch.name !== undefined && oldName && patch.name.trim() && patch.name !== oldName) {
      const rename = arr => (arr || []).map(x => x.name === oldName ? { ...x, name: patch.name } : x);
      setGames(prev => prev.map(g => ({ ...g, batting: rename(g.batting), pitching: rename(g.pitching), defensive: rename(g.defensive) })));
    }
    setRoster(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };
  const handleAddPlayer = () => setRoster(prev => [...prev, { id: Date.now(), name: "", num: "", pos: "", status: STATUS.ACTIVE }]);
  const handleRemovePlayer = idx => setRoster(prev => prev.filter((_, i) => i !== idx));

  if (showLineups) {
    return <Lineups teamName={team.teamName} roster={roster} lineups={lineups} setLineups={setLineups} onBack={() => setShowLineups(false)} />;
  }

  return showImport ? (
    <ImportWizard roster={roster} onComplete={handleImportComplete} onCancel={() => setShowImport(false)} />
  ) : (
    <Dashboard
      teamName={team.teamName}
      season={team.season}
      roster={roster}
      games={games}
      onAddGame={() => setShowImport(true)}
      onOpenLineups={() => setShowLineups(true)}
      onRosterChange={handleRosterChange}
      onTeamChange={setTeamPatch}
      seasons={seasons}
      activeId={active.id}
      onSwitchSeason={setActiveId}
      onNewSeason={newSeason}
      onImportAll={({ seasons: ss, activeId: aid }) => { setSeasons(ss); setActiveId(ss.find(x => x.id === aid) ? aid : ss[0].id); }}
      onPlayerEdit={handlePlayerEdit}
      onAddPlayer={handleAddPlayer}
      onRemovePlayer={handleRemovePlayer}
    />
  );
}
