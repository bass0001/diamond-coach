import React, { useState, useRef } from "react";

const C = {
  navy: "#183054", gold: "#F5A622", dark: "#0d1828", mid: "#111e35",
  panel: "#162540", border: "rgba(245,166,34,0.2)", muted: "#6b82a0",
  white: "#f0f6ff", red: "#e05555", green: "#4caf82",
};
const POS_COLORS = {
  P: "#7dd3fc", C: "#F5A622", "1B": "#4caf82", "2B": "#38b2ac",
  "3B": "#9b6fe0", SS: "#e07855", LF: "#4a90d9", CF: "#d4e04a", RF: "#e04a90", EH: "#aaaaaa", SIT: "#8aa0bd",
};
const FIELD = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const ALL_POS = [...FIELD, "EH"];
const COORDS = {
  P: [150, 178], C: [150, 252], "1B": [228, 172], "2B": [192, 122], "3B": [72, 172],
  SS: [108, 122], LF: [42, 78], CF: [150, 42], RF: [258, 78],
};

const shortName = n => {
  const parts = (n || "").trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};
const lastName = n => {
  const parts = (n || "").trim().split(/\s+/);
  return parts[parts.length - 1] || "";
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Per-inning check: duplicates, and whether all 9 + EH are covered
function inningStatus(lineup, inning) {
  const seen = {};
  const dups = new Set();
  lineup.order.forEach(name => {
    const pos = lineup.grid[name]?.[inning];
    if (!pos || pos === "SIT") return;
    if (seen[pos]) dups.add(pos);
    seen[pos] = true;
  });
  const filled = Object.keys(seen).length;
  return { dups, filled, complete: dups.size === 0 && ALL_POS.every(p => seen[p]) };
}

const inputStyle = {
  background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.white, fontSize: 14, padding: "10px 12px", outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle = { fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 };

// ── FIELD POSITION PICKER ─────────────────────────────────────────────────────
function PositionPicker({ player, inning, lineup, onPick, onClose }) {
  const current = lineup.grid[player]?.[inning] || "";
  const takenBy = {};
  lineup.order.forEach(n => {
    const p = lineup.grid[n]?.[inning];
    if (p && n !== player) takenBy[p] = n;
  });
  const Spot = ({ pos, x, y }) => {
    const sel = current === pos;
    const taken = takenBy[pos];
    return (
      <g onClick={() => onPick(pos)} style={{ cursor: "pointer" }}>
        <circle cx={x} cy={y} r={14} fill={sel ? POS_COLORS[pos] : "rgba(13,24,40,0.85)"}
          stroke={sel ? C.white : taken ? C.red : POS_COLORS[pos]} strokeWidth={sel ? 2.5 : 1.5} />
        <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={sel ? C.dark : POS_COLORS[pos]} style={{ fontFamily: "Oswald, sans-serif" }}>{pos}</text>
        {taken && <text x={x} y={y + 25} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.red}>{lastName(taken).slice(0, 9)}</text>}
      </g>
    );
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.mid, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 380, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{player}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Inning {inning}. Tap a position.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <svg viewBox="0 0 300 290" style={{ width: "100%", display: "block" }}>
          <path d="M150 262 L262 150 L150 38 L38 150 Z" fill="rgba(76,175,130,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <path d="M20 90 Q150 -10 280 90" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          {FIELD.map(pos => <Spot key={pos} pos={pos} x={COORDS[pos][0]} y={COORDS[pos][1]} />)}
        </svg>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => onPick("EH")} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: current === "EH" ? POS_COLORS.EH : "transparent", border: `2px solid ${takenBy.EH ? C.red : POS_COLORS.EH}`, color: current === "EH" ? C.dark : POS_COLORS.EH, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            EH{takenBy.EH ? ` (${lastName(takenBy.EH)})` : ""}
          </button>
          <button onClick={() => onPick("SIT")} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: current === "SIT" ? POS_COLORS.SIT : "transparent", border: `2px solid ${POS_COLORS.SIT}`, color: current === "SIT" ? C.dark : POS_COLORS.SIT, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            SIT
          </button>
          <button onClick={() => onPick("")} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Clear
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: "center" }}>A position shown in red is already taken this inning. You can still pick it, and both cells will flag red.</div>
      </div>
    </div>
  );
}

// ── PRINT ─────────────────────────────────────────────────────────────────────
function printLineup(lineup, teamName, roster) {
  const num = n => roster.find(p => p.name === n)?.num ?? "";
  const cols = Array.from({ length: lineup.innings }, (_, i) => i + 1);
  const rows = lineup.order.map((n, i) => `
    <tr><td>${i + 1}</td><td>${num(n)}</td><td class="nm">${n}</td>
    ${cols.map(c => `<td>${lineup.grid[n]?.[c] || ""}</td>`).join("")}</tr>`).join("");
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups for this site to print."); return; }
  w.document.write(`<!doctype html><html><head><title>Lineup</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#000}
    h1{font-size:20px;margin:0}h2{font-size:14px;font-weight:normal;margin:4px 0 16px;color:#333}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:7px 6px;text-align:center;font-size:14px}
    th{background:#eee}td.nm{text-align:left;font-weight:bold}
  </style></head><body>
    <h1>${teamName} vs ${lineup.opponent || "TBD"}</h1>
    <h2>${lineup.date || ""} &middot; ${lineup.innings} innings</h2>
    <table><thead><tr><th>#</th><th>No.</th><th style="text-align:left">Player</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── LINEUP BUILDER ────────────────────────────────────────────────────────────
const ROW_H = 46;

function Builder({ lineup, roster, teamName, onChange, onBack }) {
  const [picker, setPicker] = useState(null); // { name, inning }
  const [drag, setDrag] = useState(null);     // { from, to }
  const dragRef = useRef(null);

  const innings = Array.from({ length: lineup.innings }, (_, i) => i + 1);
  const stat = innings.map(i => inningStatus(lineup, i));
  const bench = roster.filter(p => p.name && !lineup.order.includes(p.name));
  const num = n => roster.find(p => p.name === n)?.num;

  const setCell = (name, inning, pos) => {
    const grid = { ...lineup.grid, [name]: { ...(lineup.grid[name] || {}) } };
    if (pos) grid[name][inning] = pos; else delete grid[name][inning];
    onChange({ ...lineup, grid });
  };
  const setOrder = order => onChange({ ...lineup, order });
  const removeFromLineup = name => {
    const grid = { ...lineup.grid }; delete grid[name];
    onChange({ ...lineup, order: lineup.order.filter(n => n !== name), grid });
  };
  const setInnings = n => {
    const grid = {};
    Object.entries(lineup.grid).forEach(([name, inn]) => {
      grid[name] = Object.fromEntries(Object.entries(inn).filter(([k]) => +k <= n));
    });
    onChange({ ...lineup, innings: n, grid });
  };
  const copyPrev = inning => {
    const grid = { ...lineup.grid };
    lineup.order.forEach(n => {
      const prev = lineup.grid[n]?.[inning - 1];
      grid[n] = { ...(grid[n] || {}) };
      if (prev) grid[n][inning] = prev; else delete grid[n][inning];
    });
    onChange({ ...lineup, grid });
  };

  // Drag to reorder batting order (pointer events, works with touch)
  const onHandleDown = (e, idx) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, from: idx };
    setDrag({ from: idx, to: idx });
  };
  const onHandleMove = e => {
    const d = dragRef.current; if (!d) return;
    const to = Math.max(0, Math.min(lineup.order.length - 1, d.from + Math.round((e.clientY - d.startY) / ROW_H)));
    setDrag(s => (s && s.to !== to ? { ...s, to } : s));
  };
  const onHandleUp = () => {
    const d = dragRef.current; dragRef.current = null;
    if (d && drag && drag.to !== d.from) {
      const o = [...lineup.order];
      const [m] = o.splice(d.from, 1);
      o.splice(drag.to, 0, m);
      setOrder(o);
    }
    setDrag(null);
  };
  const shown = (() => {
    if (!drag) return lineup.order;
    const o = [...lineup.order];
    const [m] = o.splice(drag.from, 1);
    o.splice(drag.to, 0, m);
    return o;
  })();

  const CW = 33;
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.dark}, ${C.mid})`, fontFamily: "'Barlow', sans-serif", color: C.white, paddingBottom: 60 }}>
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.gold, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Lineup</div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Oswald', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>vs {lineup.opponent || "TBD"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{lineup.date}</div>
          </div>
          <button onClick={() => printLineup(lineup, teamName, roster)} style={{ padding: "7px 12px", borderRadius: 8, background: C.gold, border: "none", color: C.navy, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>Print</button>
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4 }}>Innings</span>
          {[5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => setInnings(n)} style={{ width: 34, height: 30, borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", background: lineup.innings === n ? C.gold : "transparent", color: lineup.innings === n ? C.navy : C.white, border: `1px solid ${lineup.innings === n ? C.gold : "rgba(255,255,255,0.2)"}` }}>{n}</button>
          ))}
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 26 + 84 + CW * lineup.innings + 22 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", height: 28, fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              <div style={{ width: 26 }} />
              <div style={{ width: 84 }}>Batting order</div>
              {innings.map(i => <div key={i} style={{ width: CW, textAlign: "center", fontWeight: 700 }}>{i}</div>)}
            </div>

            {shown.map((name, idx) => {
              const isDrag = drag && name === lineup.order[drag.from];
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", height: ROW_H, background: isDrag ? "rgba(245,166,34,0.15)" : idx % 2 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.05)", borderRadius: isDrag ? 8 : 0 }}>
                  <div onPointerDown={e => onHandleDown(e, lineup.order.indexOf(name))} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
                    style={{ width: 26, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", cursor: "grab", color: C.muted, fontSize: 15 }}>⠿</div>
                  <div style={{ width: 84, minWidth: 0, paddingRight: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ color: C.gold, marginRight: 4 }}>{idx + 1}</span>{shortName(name)}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>{num(name) !== undefined && num(name) !== "" ? `#${num(name)}` : ""}</div>
                  </div>
                  {innings.map(i => {
                    const pos = lineup.grid[name]?.[i];
                    const dup = pos && stat[i - 1].dups.has(pos);
                    return (
                      <div key={i} style={{ width: CW, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => setPicker({ name, inning: i })} style={{ width: CW - 4, height: 34, borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "'Oswald', sans-serif", padding: 0,
                          background: dup ? "rgba(224,85,85,0.25)" : pos ? "rgba(255,255,255,0.05)" : "transparent",
                          color: dup ? C.red : pos ? POS_COLORS[pos] : "rgba(255,255,255,0.2)",
                          border: `1px solid ${dup ? C.red : pos ? POS_COLORS[pos] : "rgba(255,255,255,0.15)"}` }}>
                          {pos || "+"}
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={() => removeFromLineup(name)} title="Remove from lineup" style={{ width: 22, background: "none", border: "none", color: C.muted, fontSize: 16, padding: 0, cursor: "pointer" }}>×</button>
                </div>
              );
            })}

            {/* Inning check row */}
            <div style={{ display: "flex", alignItems: "center", height: 34, marginTop: 6 }}>
              <div style={{ width: 26 + 84, fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", paddingLeft: 26 }}>Check</div>
              {innings.map((i, k) => {
                const s = stat[k];
                const bad = s.dups.size > 0;
                return (
                  <div key={i} style={{ width: CW, textAlign: "center", fontSize: 11, fontWeight: 800, color: bad ? C.red : s.complete ? C.green : C.muted }}>
                    {bad ? "!" : s.complete ? "✓" : `${s.filled}/10`}
                  </div>
                );
              })}
            </div>
            {/* Copy previous inning */}
            <div style={{ display: "flex", alignItems: "center", height: 30 }}>
              <div style={{ width: 26 + 84, fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", paddingLeft: 26 }}>Copy prev</div>
              {innings.map(i => (
                <div key={i} style={{ width: CW, textAlign: "center" }}>
                  {i > 1 && <button onClick={() => copyPrev(i)} style={{ background: "none", border: "none", color: C.gold, fontSize: 14, cursor: "pointer", padding: 0 }}>⧉</button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {lineup.order.length < 10 && (
          <div style={{ fontSize: 11, color: C.gold, marginTop: 10 }}>You need at least 10 players in the lineup to cover 9 positions plus EH.</div>
        )}

        {bench.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>Not in lineup (tap to add)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {bench.map(p => (
                <button key={p.name} onClick={() => setOrder([...lineup.order, p.name])} style={{ padding: "6px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  + {shortName(p.name)}{p.status && p.status !== "active" ? ` (${p.status.toUpperCase()})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, color: C.muted, marginTop: 18, lineHeight: 1.6 }}>
          Drag ⠿ to change the batting order. Tap a cell to pick a position on the field. ⧉ copies the previous inning. Changes save automatically.
        </div>
      </div>

      {picker && (
        <PositionPicker player={picker.name} inning={picker.inning} lineup={lineup}
          onPick={pos => { setCell(picker.name, picker.inning, pos); setPicker(null); }}
          onClose={() => setPicker(null)} />
      )}
    </div>
  );
}

// ── NEW GAME FORM ─────────────────────────────────────────────────────────────
function NewGame({ onCreate, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(today);
  const [innings, setInnings] = useState(7);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.gold, marginBottom: 12 }}>New Game</div>
      <div style={labelStyle}>Opponent</div>
      <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Opponent name" style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={labelStyle}>Date</div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={labelStyle}>Innings</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => setInnings(n)} style={{ flex: 1, height: 40, borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: "pointer", background: innings === n ? C.gold : "transparent", color: innings === n ? C.navy : C.white, border: `1px solid ${innings === n ? C.gold : "rgba(255,255,255,0.2)"}` }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onCreate({ opponent: opponent.trim(), date, innings })} disabled={!opponent.trim()} style={{ flex: 2, padding: "12px 0", borderRadius: 8, background: C.gold, color: C.navy, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: opponent.trim() ? 1 : 0.5 }}>Build Lineup →</button>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px 0", borderRadius: 8, background: "transparent", color: C.muted, border: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── LINEUPS SCREEN (list + builder) ───────────────────────────────────────────
export default function Lineups({ teamName, roster, lineups, setLineups, onBack }) {
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(lineups.length === 0);
  const [confirmId, setConfirmId] = useState(null);

  const open = lineups.find(l => l.id === openId);
  if (open) {
    return <Builder lineup={open} roster={roster} teamName={teamName}
      onChange={l => setLineups(prev => prev.map(x => x.id === l.id ? l : x))}
      onBack={() => setOpenId(null)} />;
  }

  const create = ({ opponent, date, innings }) => {
    const order = roster.filter(p => p.name && (!p.status || p.status === "active" || p.status === "ap")).map(p => p.name);
    const l = { id: uid(), opponent, date, innings, order, grid: {} };
    setLineups(prev => [l, ...prev]);
    setCreating(false);
    setOpenId(l.id);
  };

  const sorted = [...lineups].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.dark}, ${C.mid})`, fontFamily: "'Barlow', sans-serif", color: C.white, paddingBottom: 60 }}>
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.gold, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3.5, textTransform: "uppercase" }}>{teamName}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>Games &amp; <span style={{ color: C.gold }}>Lineups</span></div>
          </div>
          {!creating && <button onClick={() => setCreating(true)} style={{ padding: "7px 12px", borderRadius: 8, background: C.gold, border: "none", color: C.navy, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>+ New Game</button>}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {roster.filter(p => p.name).length < 10 && (
          <div style={{ fontSize: 12, color: C.gold, background: "rgba(245,166,34,0.08)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, lineHeight: 1.5 }}>
            You have {roster.filter(p => p.name).length} players on the roster. A lineup needs 10 (9 positions plus EH). Add players on the Roster tab.
          </div>
        )}
        {creating && <NewGame onCreate={create} onCancel={() => setCreating(false)} />}
        {sorted.length === 0 && !creating && <div style={{ color: C.muted, fontSize: 13 }}>No games yet.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(l => {
            const done = Array.from({ length: l.innings }, (_, i) => inningStatus(l, i + 1).complete).filter(Boolean).length;
            return (
              <div key={l.id} style={{ background: C.panel, borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div onClick={() => setOpenId(l.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>vs {l.opponent}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l.date} · {l.innings} innings</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: done === l.innings ? C.green : C.muted }}>{done}/{l.innings} set</div>
                  <div style={{ color: C.gold, fontSize: 18 }}>›</div>
                </div>
                <div style={{ marginTop: 6, textAlign: "right" }}>
                  {confirmId === l.id ? (
                    <>
                      <button onClick={() => { setLineups(prev => prev.filter(x => x.id !== l.id)); setConfirmId(null); }} style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(224,85,85,0.15)", border: `1px solid ${C.red}`, color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}>Delete game</button>
                      <button onClick={() => setConfirmId(null)} style={{ padding: "3px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(l.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
