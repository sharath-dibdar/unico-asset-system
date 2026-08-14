import { useState } from "react";
import { C, ST_CFG } from "../constants.js";
import { useAuth } from "../auth/AuthContext.jsx";

export const Badge = ({ s }) => {
  const cfg = ST_CFG[s]||ST_CFG.active;
  return <span style={{ background:cfg.bg, color:cfg.c, padding:"3px 11px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{cfg.l}</span>;
};

export const Label = ({ children }) => (
  <div style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5, fontWeight:600 }}>{children}</div>
);

export const FieldVal = ({ label, val, mono, accent, wide }) => val ? (
  <div style={wide?{ gridColumn:"1/-1" }:{}}>
    <Label>{label}</Label>
    <div style={{ fontSize:14, fontWeight:500, fontFamily:mono?"'Noto Sans Mono',monospace":"inherit", color:accent?C.ac2:C.tx, wordBreak:"break-word" }}>{val}</div>
  </div>
) : null;

export const StatCard = ({ label, val, sub, icon, color=C.tx, onClick }) => (
  <div onClick={onClick} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, padding:"20px 22px", flex:1, minWidth:160, cursor:onClick?"pointer":"default", boxShadow:C.shadow, transition:"border-color 0.2s, box-shadow 0.2s" }}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor=color,e.currentTarget.style.boxShadow=C.shadowLg)}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.borderColor=C.br,e.currentTarget.style.boxShadow=C.shadow)}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <Label>{label}</Label>
        <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Inter',sans-serif", color, lineHeight:1.1, letterSpacing:"-0.01em" }}>{val}</div>
        {sub && <div style={{ fontSize:12, color:C.mu, marginTop:5 }}>{sub}</div>}
      </div>
      <div style={{ fontSize:22, opacity:0.7 }}>{icon}</div>
    </div>
  </div>
);

export const Section = ({ title, sub, children, actions }) => (
  <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, padding:22, boxShadow:C.shadow }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15 }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:C.mu, marginTop:3 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display:"flex", gap:8 }}>{actions}</div>}
    </div>
    {children}
  </div>
);

export const Btn = ({ children, onClick, variant="secondary", disabled, style:s }) => {
  const base = { cursor:disabled?"not-allowed":"pointer", padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'Inter',sans-serif", border:"none", transition:"opacity 0.15s, box-shadow 0.15s, background 0.15s", opacity:disabled?0.5:1, ...s };
  const v = {
    primary:  { background:C.ac,  color:C.acTx, boxShadow:"0 1px 2px rgba(15,17,21,0.10)" },
    success:  { background:C.ok,  color:"#fff" },
    danger:   { background:`${C.err}12`, color:C.err, border:`1px solid ${C.err}33` },
    secondary:{ background:"#fff", color:C.tx, border:`1px solid ${C.br}`, boxShadow:"0 1px 2px rgba(15,17,21,0.04)" },
    ghost:    { background:"none",color:C.mu, border:"none", padding:"6px 10px", fontSize:12 },
  };
  return <button onClick={disabled?undefined:onClick} style={{ ...base, ...v[variant] }}>{children}</button>;
};

export const AssigneeSelect = ({ value, onChange, allowEmpty }) => {
  const { users } = useAuth();
  const active = (users || []).filter(u => u.active).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}>
      {allowEmpty && <option value="">— Unassigned —</option>}
      <option value="Common Pool">Common Pool (shared)</option>
      {active.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
    </select>
  );
};

// Chip-style tag editor. value: string[]; suggestions: string[] for autocomplete.
export const TagInput = ({ value = [], onChange, suggestions = [], placeholder = "Add a tag…" }) => {
  const [input, setInput] = useState("");
  const tags = value || [];
  const add = raw => {
    const t = raw.trim();
    if (!t) { setInput(""); return; }
    if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) onChange([...tags, t]);
    setInput("");
  };
  const remove = t => onChange(tags.filter(x => x !== t));
  const onKey = e => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
    else if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length - 1]);
  };
  const avail = suggestions.filter(s => !tags.some(t => t.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", border:`1px solid ${C.br}`, background:C.el, borderRadius:9, padding:"7px 9px" }}>
        {tags.map(t => (
          <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${C.ac}18`, color:C.acD, borderRadius:6, padding:"3px 8px", fontSize:12, fontWeight:600 }}>
            🏷 {t}
            <button onClick={() => remove(t)} style={{ background:"none", border:"none", color:C.acD, cursor:"pointer", fontSize:13, lineHeight:1, padding:0 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(input)}
          list="unico-tag-suggestions"
          placeholder={tags.length ? "" : placeholder}
          style={{ flex:1, minWidth:110, border:"none", background:"transparent", padding:"2px 0", fontSize:13, outline:"none" }}
        />
        <datalist id="unico-tag-suggestions">
          {avail.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>
      <div style={{ fontSize:10, color:C.mu2, marginTop:4 }}>Press Enter or comma to add. Existing tags autocomplete.</div>
    </div>
  );
};

export const EmptyState = ({ icon="📦", title="Nothing here yet", sub="" }) => (
  <div style={{ textAlign:"center", padding:"60px 20px", color:C.mu }}>
    <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
    <div style={{ fontSize:16, fontWeight:600, color:C.tx }}>{title}</div>
    {sub && <div style={{ fontSize:13, marginTop:6 }}>{sub}</div>}
  </div>
);

export const NFCButton = ({ assetCode }) => {
  const [status, setStatus] = useState("idle");
  const [msg, setMsg]       = useState("");
  const supported = "NDEFReader" in window;

  async function write() {
    if (!supported) { setStatus("unsupported"); setMsg("Requires Chrome on Android"); return; }
    setStatus("writing"); setMsg("Hold NFC tag near phone…");
    try {
      const ndef = new NDEFReader();
      await ndef.write({ records:[{ recordType:"text", data:assetCode }] });
      setStatus("success"); setMsg("✓ Tag written!");
      setTimeout(()=>{ setStatus("idle"); setMsg(""); }, 3000);
    } catch(e) {
      setStatus("error"); setMsg(e.message||"Write failed");
      setTimeout(()=>{ setStatus("idle"); setMsg(""); }, 4000);
    }
  }

  const cols = { idle:C.mu, writing:C.ac2, success:C.ok, error:C.err, unsupported:C.mu2 };
  const labs = { idle:"Write NFC Tag", writing:"Writing…", success:"Tag Written", error:"Failed", unsupported:"NFC Unsupported" };
  return (
    <div style={{ marginTop:8 }}>
      <button onClick={write} disabled={status==="writing"||status==="success"} style={{ width:"100%", background:C.el, border:`1px solid ${cols[status]}40`, color:cols[status], cursor:status==="writing"?"wait":"pointer", padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:600, fontFamily:"'Inter',sans-serif" }}>
        📡 {labs[status]}
      </button>
      {msg && <div style={{ fontSize:10, color:cols[status], textAlign:"center", marginTop:4 }}>{msg}</div>}
    </div>
  );
};

export const QRDisplay = ({ code }) => (
  <div style={{ background:C.el, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:10, border:`1px solid ${C.br}` }}>
    <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em" }}>QR / NFC Tag</div>
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=0F1115&margin=10`}
      alt={code} style={{ width:160, height:160, borderRadius:10, imageRendering:"pixelated" }}
      onError={e=>{ e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }}
    />
    <div style={{ display:"none", width:160, height:160, background:C.br, borderRadius:10, alignItems:"center", justifyContent:"center", fontSize:11, color:C.mu, textAlign:"center", padding:12 }}>
      QR available when online
    </div>
    <div style={{ fontFamily:"'Noto Sans Mono',monospace", fontSize:13, color:C.acD, letterSpacing:"0.05em", fontWeight:500 }}>{code}</div>
    <div style={{ fontSize:11, color:C.mu2 }}>Scan or tap to identify</div>
    <NFCButton assetCode={code} />
  </div>
);

// ─── Modal shell ──────────────────────────────────────────────────────────────
export const Modal = ({ title, sub, onClose, children, footer, wide }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(15,17,21,0.4)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
    <div className="fade" style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:18, width:"100%", maxWidth:wide?760:560, maxHeight:"92vh", overflow:"auto", display:"flex", flexDirection:"column", boxShadow:C.shadowLg }}>
      <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:18 }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:C.mu, marginTop:2 }}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:24, lineHeight:1, padding:4 }}>×</button>
      </div>
      <div style={{ padding:24, flex:1, overflow:"auto" }}>{children}</div>
      {footer && <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", flexShrink:0 }}>{footer}</div>}
    </div>
  </div>
);
