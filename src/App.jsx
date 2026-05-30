import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CATS = {
  computing:   { label:"Computing",            px:"CPT", rate:0.40, emoji:"💻" },
  peripherals: { label:"Peripherals",           px:"PRP", rate:0.40, emoji:"🖱️" },
  storage:     { label:"Storage",               px:"STG", rate:0.40, emoji:"💾" },
  cables:      { label:"Cables & Connectivity", px:"CBL", rate:0.15, emoji:"🔌" },
  studio:      { label:"Studio Equipment",      px:"STU", rate:0.15, emoji:"🎬" },
  networking:  { label:"Networking & Power",    px:"NET", rate:0.15, emoji:"📡" },
};

const SPEC_DEF = {
  computing:   [["cpu","Processor"],["ram","RAM"],["storage","Storage"],["os","Operating System"],["screen","Screen Size"],["gpu","Graphics Card"]],
  peripherals: [["iface","Interface"],["dpi","DPI (Mouse)"],["conn","Connectivity"]],
  storage:     [["cap","Capacity"],["iface","Interface"],["rspd","Read Speed"],["wspd","Write Speed"],["ff","Form Factor"]],
  cables:      [["ct","Cable Type"],["len","Length"],["spd","Speed Rating"],["ca","Connector A"],["cb","Connector B"]],
  studio:      [["watt","Wattage"],["ct","Color Temp"],["mnt","Mount Type"],["beam","Beam Angle"]],
  networking:  [["ports","Ports"],["spd","Network Speed"],["wifi","WiFi Standard"],["ff","Form Factor"]],
};

const ST_CFG = {
  active:    { l:"Active",    c:"#10B981", bg:"#10B98115" },
  in_use:    { l:"In Use",    c:"#FBBF24", bg:"#FBBF2415" },
  in_repair: { l:"In Repair", c:"#FB923C", bg:"#FB923C15" },
  retired:   { l:"Retired",   c:"#64748B", bg:"#64748B15" },
  lost:      { l:"Lost",      c:"#EF4444", bg:"#EF444415" },
};

const C = {
  bg:"#0C0E17", sf:"#14171F", el:"#1C1F2C", br:"#252837",
  ac:"#F97316", ac2:"#FBBF24", ok:"#10B981", err:"#EF4444",
  tx:"#EEF0F7", mu:"#7B82A0", mu2:"#4A5068",
};

const INIT = [
  { id:"a1", code:"UNQ-CPT-0001", name:'MacBook Pro 14" M3 Pro', cat:"computing", make:"Apple", model:"MacBook Pro 14 (M3 Pro)", serial:"C02ZK3MDMD6M", color:"Space Black", cond:"Excellent", status:"active", loc:"Edit Desk 1", assignTo:"Sharath D.", pDate:"2024-01-15", vendor:"iStore Bangalore", price:199900, wEnd:"2027-01-15", wType:"Apple Care+", specs:{cpu:"M3 Pro",ram:"18GB",storage:"512GB SSD NVMe",os:"macOS Sonoma",screen:'14.2" Liquid Retina XDR',gpu:"18-core GPU"}, notes:"Primary editing machine. Paired with Dell 4K monitor." },
  { id:"a2", code:"UNQ-CPT-0002", name:'Dell UltraSharp 27" 4K', cat:"computing", make:"Dell", model:"U2723DE", serial:"CN0R7T3P2847", color:"Silver", cond:"Good", status:"active", loc:"Edit Desk 1", assignTo:"Sharath D.", pDate:"2023-08-10", vendor:"Dell India Online", price:52000, wEnd:"2026-08-10", wType:"On-Site 3yr", specs:{screen:'27" 4K IPS',iface:"USB-C / HDMI 2.0 / DP 1.4"}, notes:"Secondary monitor on edit desk." },
  { id:"a3", code:"UNQ-STU-0001", name:"Sony A7 IV Body", cat:"studio", make:"Sony", model:"ILCE-7M4", serial:"5087453", color:"Black", cond:"Excellent", status:"in_use", loc:"Studio Cabinet", assignTo:"Shoot Team", pDate:"2023-04-05", vendor:"Vijay Sales Bangalore", price:249000, wEnd:"2025-04-05", wType:"Brand 2yr", specs:{watt:"N/A"}, notes:"Main camera body. Assigned to shoot team during projects." },
  { id:"a4", code:"UNQ-STU-0002", name:"Aputure 600D Pro", cat:"studio", make:"Aputure", model:"LS 600D Pro", serial:"AP60D2305088", color:"Black", cond:"Good", status:"active", loc:"Studio Light Rack", assignTo:"Common Pool", pDate:"2022-11-20", vendor:"Import via B&H Photo", price:95000, wEnd:"2024-11-20", wType:"Brand 2yr", specs:{watt:"600W",ct:"5600K Daylight",mnt:"Bowens S-Mount",beam:"Variable"}, notes:"Key light. Warranty has expired. Consider AMC." },
  { id:"a5", code:"UNQ-STG-0001", name:"Samsung T7 Shield 2TB", cat:"storage", make:"Samsung", model:"MU-PC2T0H/WW", serial:"S6XSNS0T211783", color:"Blue", cond:"Good", status:"active", loc:"Common Pool", assignTo:"Common Pool", pDate:"2024-03-01", vendor:"Amazon India", price:14500, wEnd:"2027-03-01", wType:"Brand 3yr", specs:{cap:"2TB",iface:"USB 3.2 Gen2 Type-C",rspd:"1050 MB/s",wspd:"1000 MB/s",ff:"Rugged Portable SSD"}, notes:"Project backup and handoff drive." },
  { id:"a6", code:"UNQ-PRP-0001", name:"Logitech MX Master 3S", cat:"peripherals", make:"Logitech", model:"MX Master 3S", serial:"2211LZ37LJ45", color:"Graphite", cond:"Good", status:"active", loc:"Edit Desk 1", assignTo:"Sharath D.", pDate:"2023-06-15", vendor:"Amazon India", price:9995, wEnd:"2025-06-15", wType:"Brand 2yr", specs:{iface:"USB-C",dpi:"200–8000 DPI",conn:"Bluetooth 5 / Logi Bolt"}, notes:"" },
  { id:"a7", code:"UNQ-CBL-0001", name:"Apple Thunderbolt 4 Pro Cable 1.8m", cat:"cables", make:"Apple", model:"MWP02ZM/A", serial:"N/A", color:"Black", cond:"Good", status:"active", loc:"Edit Desk Drawer", assignTo:"Common Pool", pDate:"2024-01-15", vendor:"iStore Bangalore", price:8900, wEnd:"N/A", wType:"N/A", specs:{ct:"Thunderbolt 4 / USB4",len:"1.8m",spd:"40 Gbps / 100W PD",ca:"USB-C",cb:"USB-C"}, notes:"For MBP to Dell monitor." },
  { id:"a8", code:"UNQ-NET-0001", name:"TP-Link Deco XE75 (2-pack)", cat:"networking", make:"TP-Link", model:"Deco XE75", serial:"2210DA004782", color:"White", cond:"Good", status:"active", loc:"Router / Server Area", assignTo:"Common Pool", pDate:"2023-02-28", vendor:"Amazon India", price:18500, wEnd:"2026-02-28", wType:"Brand 3yr", specs:{ports:"3× Gigabit LAN/WAN",spd:"AXE5400 WiFi 6E",wifi:"802.11ax (6 GHz)",ff:"Mesh System Unit"}, notes:"Main office mesh router. 2-unit setup covers entire studio." },
  { id:"a9", code:"UNQ-STU-0003", name:"Manfrotto 055XPRO3 Tripod", cat:"studio", make:"Manfrotto", model:"055XPRO3 + 498RC4", serial:"MF2208417", color:"Black", cond:"Good", status:"active", loc:"Studio Cabinet", assignTo:"Common Pool", pDate:"2022-06-10", vendor:"Foto Rieselfeld", price:32000, wEnd:"N/A", wType:"N/A", specs:{watt:"N/A",ct:"N/A",mnt:"Ball Head 498RC4",beam:"N/A"}, notes:"Main tripod for shoots." },
  { id:"a10", code:"UNQ-PRP-0002", name:"Keychron K3 Pro Keyboard", cat:"peripherals", make:"Keychron", model:"K3 Pro (Brown Switches)", serial:"KC3P2209041", color:"Grey", cond:"Excellent", status:"active", loc:"Edit Desk 1", assignTo:"Sharath D.", pDate:"2023-09-01", vendor:"Keychron.com", price:7500, wEnd:"2024-09-01", wType:"Brand 1yr", specs:{iface:"USB-C / Bluetooth 5.1",conn:"Bluetooth / Wired"}, notes:"75% layout. Brown tactile switches." },
];

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

const fINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const dTo = d => (d&&d!=="N/A") ? Math.ceil((new Date(d)-new Date())/864e5) : null;
const getFY = d => { const dt=new Date(d); return dt.getMonth()>=3?dt.getFullYear():dt.getFullYear()-1; };
const curFY = () => { const n=new Date(); return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const nextCode = (cat,assets) => `UNQ-${CATS[cat]?.px||"MSC"}-${String(assets.filter(a=>a.cat===cat).length+1).padStart(4,"0")}`;

function calcDep(price, pDate, rate) {
  if (!price||!pDate||!rate) return { cur: price||0, sched:[] };
  const s=getFY(pDate), e=curFY();
  let v=price; const sched=[];
  for (let fy=s; fy<=e; fy++) {
    let r=rate;
    if (fy===s && new Date(pDate).getMonth()>=9) r/=2; // half-year rule (after Oct 1)
    const dep=Math.round(v*r);
    sched.push({ fy:`FY ${fy}–${String(fy+1).slice(-2)}`, open:Math.round(v), dep, close:Math.round(v-dep) });
    v-=dep;
  }
  return { cur:Math.round(v), sched };
}

// ═══════════════════════════════════════════════════════════════
// SMALL UI PIECES
// ═══════════════════════════════════════════════════════════════

const Badge = ({ s }) => {
  const cfg = ST_CFG[s]||ST_CFG.active;
  return <span style={{ background:cfg.bg, color:cfg.c, padding:"3px 11px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{cfg.l}</span>;
};

const Label = ({ children }) => (
  <div style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5, fontWeight:600 }}>{children}</div>
);

const FieldVal = ({ label, val, mono, accent }) => val ? (
  <div>
    <Label>{label}</Label>
    <div style={{ fontSize:14, fontWeight:500, fontFamily:mono?"'DM Mono',monospace":"inherit", color:accent?C.ac2:C.tx }}>{val}</div>
  </div>
) : null;

const StatCard = ({ label, val, sub, icon, color=C.ac, onClick }) => (
  <div onClick={onClick} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:"20px 22px", flex:1, minWidth:160, cursor:onClick?"pointer":"default", transition:"border-color 0.2s" }}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor=color)}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.borderColor=C.br)}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <Label>{label}</Label>
        <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color, lineHeight:1.1 }}>{val}</div>
        {sub && <div style={{ fontSize:12, color:C.mu, marginTop:5 }}>{sub}</div>}
      </div>
      <div style={{ fontSize:22, opacity:0.7 }}>{icon}</div>
    </div>
  </div>
);

const QRDisplay = ({ code }) => (
  <div style={{ background:C.el, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:10, border:`1px solid ${C.br}` }}>
    <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>Scan QR Tag</div>
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&bgcolor=1C1F2C&color=F97316&margin=10`}
      alt={code} style={{ width:160, height:160, borderRadius:10, imageRendering:"pixelated" }}
      onError={e=>{ e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }}
    />
    <div style={{ display:"none", width:160, height:160, background:C.br, borderRadius:10, alignItems:"center", justifyContent:"center", fontSize:11, color:C.mu, textAlign:"center", padding:12 }}>
      QR available when online
    </div>
    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.ac, letterSpacing:"0.05em", fontWeight:500 }}>{code}</div>
    <div style={{ fontSize:11, color:C.mu2 }}>Print & stick on the device</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════

function Sidebar({ view, setView, assets, onAdd }) {
  const expired = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d<0; }).length;
  const expiring = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d>=0&&d<=90; }).length;

  return (
    <div className="dsk" style={{ width:230, background:C.sf, borderRight:`1px solid ${C.br}`, display:"flex", flexDirection:"column", padding:"0 0 20px", flexShrink:0, userSelect:"none" }}>
      {/* Brand */}
      <div style={{ padding:"24px 22px 20px" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:C.ac, letterSpacing:"0.04em" }}>UNICO</div>
        <div style={{ fontSize:10, color:C.mu2, letterSpacing:"0.14em", textTransform:"uppercase", marginTop:1 }}>Asset Intelligence</div>
      </div>

      {/* Add button */}
      <div style={{ padding:"0 16px 16px" }}>
        <button onClick={onAdd} style={{ width:"100%", background:`${C.ac}18`, border:`1px solid ${C.ac}40`, color:C.ac, cursor:"pointer", padding:"10px", borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.02em" }}>
          + New Asset
        </button>
      </div>

      {/* Nav */}
      {[{id:"dashboard",icon:"⊞",l:"Dashboard"},{id:"list",icon:"≡",l:"All Assets"}].map(n => (
        <button key={n.id} onClick={()=>setView(n.id)} style={{
          display:"flex", alignItems:"center", gap:12, padding:"11px 22px",
          background:view===n.id?`${C.ac}14`:"transparent",
          borderLeft:view===n.id?`3px solid ${C.ac}`:"3px solid transparent",
          border:"none", borderLeft:view===n.id?`3px solid ${C.ac}`:"3px solid transparent",
          cursor:"pointer", color:view===n.id?C.ac:C.mu,
          fontSize:14, fontWeight:view===n.id?600:400, fontFamily:"'DM Sans',sans-serif",
          textAlign:"left", width:"100%", transition:"all 0.15s"
        }}>{n.icon}  {n.l}</button>
      ))}

      {/* Categories */}
      <div style={{ padding:"20px 22px 8px", fontSize:10, color:C.mu2, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600 }}>Categories</div>
      {Object.entries(CATS).map(([k,v]) => {
        const n = assets.filter(a=>a.cat===k).length;
        return (
          <button key={k} onClick={()=>setView("list")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 22px", background:"transparent", border:"none", cursor:"pointer", color:C.mu, fontSize:12, fontFamily:"'DM Sans',sans-serif", textAlign:"left", width:"100%", transition:"color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.color=C.tx}
            onMouseLeave={e=>e.currentTarget.style.color=C.mu}>
            <span>{v.emoji}  {v.label}</span>
            <span style={{ background:C.el, padding:"1px 8px", borderRadius:10, fontSize:10, color:C.mu }}>{n}</span>
          </button>
        );
      })}

      {/* Alerts */}
      {(expired>0||expiring>0) && (
        <div style={{ margin:"16px 16px 0", background:`${C.err}0E`, border:`1px solid ${C.err}25`, borderRadius:10, padding:"12px 14px" }}>
          {expired>0 && <div style={{ fontSize:11, color:C.err, marginBottom:3 }}>⚠  {expired} warrant{expired>1?"ies":"y"} expired</div>}
          {expiring>0 && <div style={{ fontSize:11, color:C.ac2 }}>⏰  {expiring} expiring within 90d</div>}
        </div>
      )}

      <div style={{ flex:1 }} />
      <div style={{ padding:"16px 22px", borderTop:`1px solid ${C.br}` }}>
        <div style={{ fontSize:11, color:C.mu2 }}>TOTAL ASSETS</div>
        <div style={{ fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.tx, lineHeight:1.1 }}>{assets.length}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════════════════════════════

function TopBar({ view, onAdd, onBack, selectedName }) {
  const titles = { dashboard:"Dashboard", list:"All Assets", detail:"Asset Detail" };
  return (
    <div style={{ background:C.sf, borderBottom:`1px solid ${C.br}`, padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {view==="detail" && (
          <button onClick={onBack} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
        )}
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, color:C.tx, lineHeight:1 }}>{view==="detail"&&selectedName ? selectedName : titles[view]||""}</div>
          {view==="detail"&&selectedName && <div style={{ fontSize:11, color:C.mu, marginTop:2 }}>Asset Detail</div>}
        </div>
      </div>
      <button onClick={onAdd} style={{ background:C.ac, color:"#fff", border:"none", cursor:"pointer", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
        + Add Asset
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOTTOM NAV (MOBILE)
// ═══════════════════════════════════════════════════════════════

function BottomNav({ view, setView, onAdd }) {
  return (
    <div className="mob" style={{ background:C.sf, borderTop:`1px solid ${C.br}`, display:"flex", flexShrink:0, zIndex:10 }}>
      {[{id:"dashboard",icon:"⊞",l:"Home"},{id:"list",icon:"≡",l:"Assets"}].map(n=>(
        <button key={n.id} onClick={()=>setView(n.id)} style={{ flex:1, background:"none", border:"none", cursor:"pointer", color:view===n.id?C.ac:C.mu, padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:20 }}>
          <span style={{ fontSize:18 }}>{n.icon}</span>
          <span style={{ fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>{n.l}</span>
        </button>
      ))}
      <button onClick={onAdd} style={{ flex:1, background:"none", border:"none", cursor:"pointer", color:C.ac, padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
        <span style={{ fontSize:18 }}>＋</span>
        <span style={{ fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>Add</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

function Dashboard({ assets, openDetail, totalV, totalBV, setView }) {
  const warnings = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d<=90; }).sort((a,b)=>dTo(a.wEnd)-dTo(b.wEnd));
  const recent = [...assets].sort((a,b)=>new Date(b.pDate)-new Date(a.pDate)).slice(0,5);
  const catBar = Object.entries(CATS).map(([k,v])=>({ name:v.label.split(" ")[0], count:assets.filter(a=>a.cat===k).length, color:k==="computing"?C.ac:k==="studio"?C.ac2:k==="storage"?C.ok:k==="peripherals"?"#A78BFA":k==="networking"?"#38BDF8":"#FB7185" })).filter(d=>d.count>0);
  const depPct = totalV>0 ? Math.round((1-totalBV/totalV)*100) : 0;

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Stat row */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        <StatCard label="Total Assets" val={assets.length} sub="Across 6 categories" icon="📦" color={C.ac} onClick={()=>setView("list")} />
        <StatCard label="Purchase Value" val={fINR(totalV)} sub="All assets combined" icon="💰" color={C.ac2} />
        <StatCard label="Current Book Value" val={fINR(totalBV)} sub={`${depPct}% depreciated (IT Act)`} icon="📊" color={C.ok} />
        <StatCard label="Warranty Alerts" val={warnings.length} sub="Expiring within 90 days" icon="⚠️" color={warnings.length>0?C.err:C.ok} />
      </div>

      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {/* Warranty alerts */}
        <div style={{ flex:1.1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", gap:0 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Warranty Tracker</div>
          {warnings.length===0 ? (
            <div style={{ color:C.ok, fontSize:14, padding:"20px 0" }}>✓ All warranties in good standing</div>
          ) : warnings.slice(0,6).map(a=>{
            const d=dTo(a.wEnd);
            const col = d<0?C.err:d<30?C.err:d<60?C.ac:C.ac2;
            return (
              <div key={a.id} onClick={()=>openDetail(a)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer", gap:10 }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                  <div style={{ fontSize:11, color:C.mu, fontFamily:"'DM Mono',monospace" }}>{a.code}</div>
                </div>
                <div style={{ background:`${col}18`, color:col, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                  {d<0?`${Math.abs(d)}d expired`:d===0?"Expires today":`${d}d left`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent assets */}
        <div style={{ flex:1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 }}>Recently Added</div>
            <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:C.ac, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>View all →</button>
          </div>
          {recent.map(a=>(
            <div key={a.id} onClick={()=>openDetail(a)} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{ width:36, height:36, background:C.el, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                <div style={{ fontSize:11, color:C.mu }}>{a.pDate} · {fINR(a.price)}</div>
              </div>
              <Badge s={a.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Category chart */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:18 }}>Inventory Distribution</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:1, minWidth:260, height:160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBar} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.br} vertical={false} />
                <XAxis dataKey="name" tick={{ fill:C.mu, fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:C.mu, fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background:C.el, border:`1px solid ${C.br}`, borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:13 }} cursor={{ fill:`${C.ac}10` }} />
                <Bar dataKey="count" name="Assets" radius={[5,5,0,0]}>
                  {catBar.map((e,i)=><Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:180 }}>
            {Object.entries(CATS).map(([k,v])=>{
              const n=assets.filter(a=>a.cat===k).length;
              const val=assets.filter(a=>a.cat===k).reduce((s,a)=>s+(a.price||0),0);
              if (!n) return null;
              return (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                  <div style={{ fontSize:12, color:C.mu }}>{v.emoji}  {v.label}</div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{n} · <span style={{ color:C.mu }}>{fINR(val)}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET LIST
// ═══════════════════════════════════════════════════════════════

function AssetList({ filtered, q, setQ, catF, setCatF, stF, setStF, openDetail, openAdd }) {
  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:180, position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.mu, pointerEvents:"none" }}>⌕</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, code, make…" style={{ paddingLeft:34 }} />
        </div>
        <select value={catF} onChange={e=>setCatF(e.target.value)} style={{ width:"auto", minWidth:170 }}>
          <option value="all">All Categories</option>
          {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <select value={stF} onChange={e=>setStF(e.target.value)} style={{ width:"auto", minWidth:140 }}>
          <option value="all">All Status</option>
          {Object.entries(ST_CFG).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      <div style={{ fontSize:12, color:C.mu }}>{filtered.length} asset{filtered.length!==1?"s":""} found</div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(a => {
          const dep = CATS[a.cat] ? calcDep(a.price,a.pDate,CATS[a.cat].rate) : null;
          const wd = dTo(a.wEnd);
          const wDot = wd===null ? null : wd<0 ? C.err : wd<90 ? C.ac : C.ok;
          return (
            <div key={a.id} onClick={()=>openDetail(a)} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", gap:14, alignItems:"center", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.ac; e.currentTarget.style.background=C.el; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.br; e.currentTarget.style.background=C.sf; }}>
              <div style={{ width:42, height:42, background:C.el, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{a.name}</span>
                  <Badge s={a.status} />
                </div>
                <div style={{ fontSize:11, color:C.mu, marginTop:2, fontFamily:"'DM Mono',monospace" }}>{a.code} · {a.make} · {a.loc}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }} className="dsk">
                <div style={{ fontSize:14, fontWeight:700, color:C.tx }}>{fINR(a.price)}</div>
                {dep && <div style={{ fontSize:11, color:C.mu }}>Book: {fINR(dep.cur)}</div>}
              </div>
              {wDot && <div style={{ width:8, height:8, borderRadius:"50%", background:wDot, flexShrink:0 }} title={wd<0?"Warranty expired":`${wd}d warranty left`} />}
              <span style={{ color:C.mu2, fontSize:16, flexShrink:0 }}>›</span>
            </div>
          );
        })}
        {filtered.length===0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:C.mu }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📦</div>
            <div style={{ fontSize:16, fontWeight:600, color:C.tx }}>No assets found</div>
            <div style={{ fontSize:13, marginTop:4 }}>Try adjusting your search or filters</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET DETAIL
// ═══════════════════════════════════════════════════════════════

function AssetDetail({ asset: a, onEdit, onDelete }) {
  const dep = CATS[a.cat] ? calcDep(a.price,a.pDate,CATS[a.cat].rate) : null;
  const specDefs = SPEC_DEF[a.cat]||[];
  const wd = dTo(a.wEnd);
  const depPct = dep&&a.price ? Math.round((1-dep.cur/a.price)*100) : 0;

  const chartData = dep ? [
    { yr:"Purchase", val:a.price },
    ...dep.sched.map(s=>({ yr:s.fy.replace("FY ",""), val:s.close }))
  ] : [];

  const warnCol = wd===null ? C.mu : wd<0 ? C.err : wd<30 ? C.err : wd<90 ? C.ac : C.ok;
  const warnMsg = wd===null ? "No warranty data" : wd<0 ? `Expired ${Math.abs(wd)} days ago` : wd===0 ? "Expires today!" : `${wd} days remaining`;

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18, maxWidth:960 }}>
      {/* Header actions */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onEdit} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.tx, cursor:"pointer", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>✏  Edit</button>
        <button onClick={()=>{ if(confirm(`Delete "${a.name}"? This cannot be undone.`)) onDelete(a.id); }} style={{ background:`${C.err}10`, border:`1px solid ${C.err}30`, color:C.err, cursor:"pointer", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>🗑  Delete</button>
      </div>

      <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
        {/* QR + warranty column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:200, maxWidth:220 }}>
          <QRDisplay code={a.code} />
          {/* Warranty card */}
          <div style={{ background:C.sf, border:`1px solid ${wd!==null&&wd<0?C.err+"40":C.br}`, borderRadius:14, padding:16 }}>
            <Label>Warranty Status</Label>
            <div style={{ color:warnCol, fontWeight:700, fontSize:14, marginBottom:4 }}>{wd!==null&&wd<0?"⚠ ":wd!==null&&wd<=90?"⏰ ":"✓ "}{warnMsg}</div>
            {a.wEnd&&a.wEnd!=="N/A"&&<div style={{ fontSize:12, color:C.mu }}>Until {a.wEnd}</div>}
            {a.wType&&a.wType!=="N/A"&&<div style={{ fontSize:12, color:C.mu, marginTop:2 }}>{a.wType}</div>}
          </div>
          {/* Quick depreciation */}
          {dep && (
            <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:16 }}>
              <Label>Book Value Today</Label>
              <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.ok }}>{fINR(dep.cur)}</div>
              <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>{depPct}% depreciated</div>
              <div style={{ fontSize:11, color:C.mu2, marginTop:1 }}>WDV @ {Math.round(CATS[a.cat].rate*100)}% p.a.</div>
            </div>
          )}
        </div>

        {/* Main info column */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, minWidth:280 }}>
          {/* Asset info */}
          <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:16 }}>Asset Information</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
              <FieldVal label="Category" val={CATS[a.cat]?.label} />
              <FieldVal label="Make / Brand" val={a.make} />
              <FieldVal label="Model" val={a.model} />
              <FieldVal label="Serial Number" val={a.serial} mono />
              <FieldVal label="Color" val={a.color} />
              <FieldVal label="Condition" val={a.cond} />
              <FieldVal label="Location" val={a.loc} />
              <FieldVal label="Assigned To" val={a.assignTo} />
            </div>
          </div>

          {/* Purchase info */}
          <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:16 }}>Purchase Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
              <FieldVal label="Purchase Date" val={a.pDate} />
              <FieldVal label="Vendor / Supplier" val={a.vendor} />
              <div>
                <Label>Purchase Price</Label>
                <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.ac2 }}>{fINR(a.price)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specs */}
      {specDefs.length>0 && a.specs && Object.keys(a.specs).length>0 && (
        <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:16 }}>Technical Specifications</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
            {specDefs.map(([k,l]) => a.specs?.[k] ? (
              <div key={k} style={{ background:C.el, borderRadius:9, padding:"10px 14px" }}>
                <div style={{ fontSize:10, color:C.mu2, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:600, fontFamily:"'DM Mono',monospace", color:C.ac }}>{a.specs[k]}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Depreciation schedule */}
      {dep && dep.sched.length>0 && (
        <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 }}>Depreciation Schedule</div>
              <div style={{ fontSize:11, color:C.mu, marginTop:3 }}>Written Down Value Method · IT Act · {Math.round(CATS[a.cat].rate*100)}% per annum · Half-year rule applied</div>
            </div>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
              <div style={{ textAlign:"right" }}>
                <Label>Original Cost</Label>
                <div style={{ fontSize:16, fontWeight:700 }}>{fINR(a.price)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <Label>Current Book Value</Label>
                <div style={{ fontSize:16, fontWeight:700, color:C.ok }}>{fINR(dep.cur)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <Label>Total Dep.</Label>
                <div style={{ fontSize:16, fontWeight:700, color:C.ac }}>{fINR(a.price-dep.cur)} ({depPct}%)</div>
              </div>
            </div>
          </div>

          {/* Area chart */}
          <div style={{ height:180, marginBottom:20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.ac} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={C.ac} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.br} />
                <XAxis dataKey="yr" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}K`} />
                <Tooltip formatter={v=>[fINR(v),"Book Value"]} contentStyle={{ background:C.el, border:`1px solid ${C.br}`, borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:12 }} labelStyle={{ color:C.tx }} />
                <Area type="monotone" dataKey="val" stroke={C.ac} strokeWidth={2.5} fill="url(#dg)" dot={{ fill:C.ac, r:4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>{["Financial Year","Opening Value","Depreciation","Closing Value"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:h==="Financial Year"?"left":"right", borderBottom:`1px solid ${C.br}`, color:C.mu, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", fontSize:10 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {dep.sched.map((s,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.br}` }}>
                    <td style={{ padding:"10px 12px", fontFamily:"'DM Mono',monospace", color:C.mu, fontSize:12 }}>{s.fy}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right" }}>{fINR(s.open)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:C.err, fontFamily:"'DM Mono',monospace" }}>− {fINR(s.dep)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:C.ok, fontFamily:"'DM Mono',monospace" }}>{fINR(s.close)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {a.notes && (
        <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:8 }}>Notes</div>
          <div style={{ fontSize:14, color:C.mu, lineHeight:1.7 }}>{a.notes}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD / EDIT MODAL
// ═══════════════════════════════════════════════════════════════

function Modal({ form, setForm, step, setStep, onSave, onClose, isEdit, assets }) {
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const setSpec = (k,v) => setForm(p=>({...p,specs:{...p.specs,[k]:v}}));
  const specDefs = SPEC_DEF[form.cat]||[];
  const steps = specDefs.length>0 ? 3 : 2;
  const canNext = step===1 ? (form.name&&form.cat&&form.make) : step===2 ? (form.pDate&&form.price) : true;

  const depPreview = form.price&&form.pDate&&form.cat&&CATS[form.cat] ? calcDep(form.price,form.pDate,CATS[form.cat].rate) : null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, width:"100%", maxWidth:560, maxHeight:"92vh", overflow:"auto", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>{isEdit?"Edit Asset":"New Asset"}</div>
            <div style={{ fontSize:11, color:C.mu, marginTop:2 }}>Step {step} of {steps} — {step===1?"Basic Info":step===2?"Purchase & Warranty":"Technical Specs"}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:22, lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Progress */}
        <div style={{ height:3, background:C.el, flexShrink:0 }}>
          <div style={{ height:"100%", background:C.ac, width:`${(step/steps)*100}%`, transition:"width 0.3s ease" }} />
        </div>

        {/* Body */}
        <div style={{ padding:24, flex:1, overflow:"auto" }}>
          {step===1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <Label>Asset Name *</Label>
                <input value={form.name||""} onChange={e=>set("name",e.target.value)} placeholder="e.g. Sony A7 IV Body" />
              </div>
              <div>
                <Label>Category *</Label>
                <select value={form.cat||""} onChange={e=>set("cat",e.target.value)}>
                  <option value="">Select a category…</option>
                  {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Make / Brand *</Label><input value={form.make||""} onChange={e=>set("make",e.target.value)} placeholder="Apple, Sony, Dell…" /></div>
                <div><Label>Model</Label><input value={form.model||""} onChange={e=>set("model",e.target.value)} placeholder="Model number/name" /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Serial Number</Label><input value={form.serial||""} onChange={e=>set("serial",e.target.value)} placeholder="Optional" /></div>
                <div><Label>Color</Label><input value={form.color||""} onChange={e=>set("color",e.target.value)} placeholder="e.g. Space Black" /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <Label>Condition</Label>
                  <select value={form.cond||"Good"} onChange={e=>set("cond",e.target.value)}>
                    {["New","Excellent","Good","Fair","Poor"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status||"active"} onChange={e=>set("status",e.target.value)}>
                    {Object.entries(ST_CFG).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Location</Label><input value={form.loc||""} onChange={e=>set("loc",e.target.value)} placeholder="Edit Desk 1, Studio…" /></div>
                <div><Label>Assigned To</Label><input value={form.assignTo||""} onChange={e=>set("assignTo",e.target.value)} placeholder="Name / Common Pool" /></div>
              </div>
            </div>
          )}

          {step===2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Purchase Date *</Label><input type="date" value={form.pDate||""} onChange={e=>set("pDate",e.target.value)} /></div>
                <div><Label>Purchase Price (₹) *</Label><input type="number" value={form.price||""} onChange={e=>set("price",Number(e.target.value))} placeholder="e.g. 49999" /></div>
              </div>
              <div><Label>Vendor / Supplier</Label><input value={form.vendor||""} onChange={e=>set("vendor",e.target.value)} placeholder="Amazon India, iStore…" /></div>

              {/* Live depreciation preview */}
              {depPreview && (
                <div style={{ background:C.el, borderRadius:10, padding:14, border:`1px solid ${C.br}` }}>
                  <div style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Live Depreciation Preview (IT Act WDV)</div>
                  <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Rate</div><div style={{ fontWeight:700, color:C.ac }}>{Math.round(CATS[form.cat].rate*100)}% WDV</div></div>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Current Book Value</div><div style={{ fontWeight:700, color:C.ok }}>{fINR(depPreview.cur)}</div></div>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Depreciated So Far</div><div style={{ fontWeight:700, color:C.ac }}>{Math.round((1-depPreview.cur/form.price)*100)}%</div></div>
                  </div>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Warranty End Date</Label><input type="date" value={form.wEnd&&form.wEnd!=="N/A"?form.wEnd:""} onChange={e=>set("wEnd",e.target.value||"N/A")} /></div>
                <div><Label>Warranty Type</Label><input value={form.wType||""} onChange={e=>set("wType",e.target.value)} placeholder="Brand 1yr, On-Site…" /></div>
              </div>
              <div><Label>Notes</Label><textarea value={form.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Any additional notes about this asset…" rows={3} style={{ resize:"vertical" }} /></div>
            </div>
          )}

          {step===3 && specDefs.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:13, color:C.mu, marginBottom:4 }}>
                Specs for <strong style={{ color:C.tx }}>{CATS[form.cat]?.label}</strong> — all fields optional
              </div>
              {specDefs.map(([k,l])=>(
                <div key={k}>
                  <Label>{l}</Label>
                  <input value={form.specs?.[k]||""} onChange={e=>setSpec(k,e.target.value)} placeholder={`Enter ${l.toLowerCase()}…`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", flexShrink:0 }}>
          <button onClick={step>1?()=>setStep(s=>s-1):onClose} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.tx, cursor:"pointer", padding:"10px 20px", borderRadius:9, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            {step>1?"← Back":"Cancel"}
          </button>
          {step<steps ? (
            <button onClick={()=>canNext&&setStep(s=>s+1)} style={{ background:canNext?C.ac:`${C.ac}50`, color:"#fff", border:"none", cursor:canNext?"pointer":"not-allowed", padding:"10px 24px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", transition:"background 0.2s" }}>
              Next →
            </button>
          ) : (
            <button onClick={onSave} style={{ background:C.ok, color:"#fff", border:"none", cursor:"pointer", padding:"10px 24px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
              {isEdit?"Save Changes ✓":"Add Asset ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [assets, setAssets] = useState([]);
  const [view, setView] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [step, setStep] = useState(1);
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("all");
  const [stF, setStF] = useState("all");
  const [loaded, setLoaded] = useState(false);

useEffect(()=>{
  try {
    const saved = localStorage.getItem("uais-v2");
    if (saved) setAssets(JSON.parse(saved));
    else setAssets(INIT);
  } catch { setAssets(INIT); }
  setLoaded(true);
},[]);

useEffect(()=>{
  if (!loaded || !assets.length) return;
  try { localStorage.setItem("uais-v2", JSON.stringify(assets)); } catch {}
},[assets, loaded]);

  const openDetail = a => { setSel(a); setView("detail"); };
  const openAdd = (a=null) => {
    setEditId(a?.id||null);
    setForm(a?{...a,specs:{...(a.specs||{})}}:{status:"active",cond:"Good",specs:{}});
    setStep(1);
    setShowModal(true);
  };

  const saveAsset = () => {
    if (editId) {
      const updated = {...form, id:editId};
      setAssets(p=>p.map(a=>a.id===editId?updated:a));
      if (sel?.id===editId) setSel(updated);
    } else {
      const n = {...form, id:uid(), code:nextCode(form.cat,assets)};
      setAssets(p=>[...p,n]);
    }
    setShowModal(false);
  };

  const deleteAsset = id => { setAssets(p=>p.filter(a=>a.id!==id)); setView("list"); setSel(null); };

  const filtered = assets.filter(a=>{
    const mQ = !q||[a.name,a.code,a.make,a.model].some(f=>f?.toLowerCase().includes(q.toLowerCase()));
    return mQ && (catF==="all"||a.cat===catF) && (stF==="all"||a.status===stF);
  });

  const totalV = assets.reduce((s,a)=>s+(a.price||0),0);
  const totalBV = assets.reduce((s,a)=>s+(CATS[a.cat]&&a.price&&a.pDate?calcDep(a.price,a.pDate,CATS[a.cat].rate).cur:0),0);

  if (!loaded) return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:C.bg, color:C.mu, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>📦</div>
        <div>Loading UAIS…</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.tx, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,textarea{background:${C.el};border:1px solid ${C.br};color:${C.tx};padding:10px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none;transition:border-color 0.2s;}
        input:focus,select:focus,textarea:focus{border-color:${C.ac};}
        select option{background:${C.el};color:${C.tx};}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${C.sf};}
        ::-webkit-scrollbar-thumb{background:${C.br};border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeUp 0.22s ease;}
        @media(max-width:768px){.dsk{display:none!important;}}
        @media(min-width:769px){.mob{display:none!important;}}
      `}</style>

      <Sidebar view={view} setView={setView} assets={assets} onAdd={()=>openAdd()} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <TopBar
          view={view}
          onAdd={()=>openAdd()}
          onBack={()=>setView("list")}
          selectedName={view==="detail"&&sel?sel.name:null}
        />

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {view==="dashboard" && <Dashboard assets={assets} openDetail={openDetail} totalV={totalV} totalBV={totalBV} setView={setView} />}
          {view==="list" && <AssetList filtered={filtered} q={q} setQ={setQ} catF={catF} setCatF={setCatF} stF={stF} setStF={setStF} openDetail={openDetail} openAdd={openAdd} />}
          {view==="detail" && sel && <AssetDetail asset={sel} onEdit={()=>openAdd(sel)} onDelete={deleteAsset} />}
        </div>

        <BottomNav view={view} setView={setView} onAdd={()=>openAdd()} />
      </div>

      {showModal && <Modal form={form} setForm={setForm} step={step} setStep={setStep} onSave={saveAsset} onClose={()=>setShowModal(false)} isEdit={!!editId} assets={assets} />}
    </div>
  );
}
