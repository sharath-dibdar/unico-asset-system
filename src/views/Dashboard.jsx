import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { C, CATS, ST_CFG } from "../constants.js";
import { fINR, dTo, calcDep } from "../utils.js";
import { StatCard, Badge, Label } from "../components/UI.jsx";

export default function Dashboard({ assets, vendors, audits, checkouts, openDetail, totalV, totalBV, setView, isAdmin }) {
  const warnings    = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d<=90; }).sort((a,b)=>dTo(a.wEnd)-dTo(b.wEnd));
  const insWarnings = assets.filter(a=>{ const d=dTo(a.insurance?.renewalDate); return d!==null&&d>=0&&d<=90; }).sort((a,b)=>dTo(a.insurance?.renewalDate)-dTo(b.insurance?.renewalDate));
  const recent      = [...assets].sort((a,b)=>new Date(b.pDate)-new Date(a.pDate)).slice(0,5);
  const checkedOut  = (checkouts||[]).filter(c=>c.status==="out").length;
  const disposed    = assets.filter(a=>a.disposal).length;
  const disposalVal = assets.filter(a=>a.disposal?.saleValue).reduce((s,a)=>s+(a.disposal.saleValue||0),0);
  const pendingAudits = (audits||[]).filter(a=>a.status==="pending"||a.status==="in_progress").length;
  const depPct = totalV>0 ? Math.round((1-totalBV/totalV)*100) : 0;

  const catBar = Object.entries(CATS).map(([k,v])=>({
    name:v.label.split(" ")[0], count:assets.filter(a=>a.cat===k).length,
    color:k==="computing"?C.acD:k==="studio"?C.ac2:k==="storage"?C.ok:k==="peripherals"?"#A78BFA":k==="networking"?"#38BDF8":"#FB7185"
  })).filter(d=>d.count>0);

  // FY-wise total book value for mini chart
  const fyChart = (() => {
    const fys = {};
    assets.forEach(a => {
      if (!a.price||!a.pDate||!CATS[a.cat]) return;
      calcDep(a.price,a.pDate,CATS[a.cat].rate).sched.forEach(s => {
        fys[s.fy] = (fys[s.fy]||0) + s.close;
      });
    });
    return Object.entries(fys).sort(([a],[b])=>a.localeCompare(b)).map(([fy,val])=>({ yr:fy.replace("FY ",""), val }));
  })();

  const Row = ({ a }) => {
    const d=dTo(a.wEnd);
    const col = d===null?null:d<0?C.err:d<30?C.err:d<90?C.ac2:C.ok;
    return (
      <div onClick={()=>openDetail(a)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer", gap:10 }}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
          <div style={{ fontSize:11, color:C.mu, fontFamily:"'Noto Sans Mono',monospace" }}>{a.code}</div>
        </div>
        {col && <div style={{ background:`${col}18`, color:col, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
          {d<0?`${Math.abs(d)}d expired`:d===0?"Today":`${d}d left`}
        </div>}
      </div>
    );
  };

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* KPI row 1 */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        <StatCard label="Total Assets"      val={assets.length}   sub="Across 6 categories"               icon="📦" color={C.ac}  onClick={()=>setView("list")} />
        {isAdmin && <StatCard label="Purchase Value"     val={fINR(totalV)}    sub="All assets combined"               icon="💰" color={C.ac2} />}
        {isAdmin && <StatCard label="Current Book Value" val={fINR(totalBV)}   sub={`${depPct}% depreciated (IT Act)`} icon="📊" color={C.ok}  />}
        <StatCard label="Warranty Alerts"   val={warnings.length} sub="Expiring within 90 days"           icon="⚠️" color={warnings.length>0?C.err:C.ok} onClick={()=>{}} />
      </div>

      {/* KPI row 2 */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        <StatCard label="Currently Out"  val={checkedOut}           sub="Assets checked out"   icon="⇄"  color={C.ac2} onClick={()=>setView("checkout")} />
        {isAdmin && <StatCard label="Disposal Value" val={fINR(disposalVal)} sub={`${disposed} assets retired`} icon="♻️" color={C.mu} />}
        <StatCard label="Pending Audits" val={pendingAudits}        sub="Physical audit tasks" icon="📋" color={pendingAudits>0?C.ac2:C.ok} onClick={()=>setView("audits")} />
        {isAdmin && <StatCard label="Vendors" val={(vendors||[]).length} sub="In vendor book"  icon="🏪" color={C.mu} onClick={()=>setView("vendors")} />}
      </div>

      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {/* Warranty + Insurance alerts */}
        <div style={{ flex:1.1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Warranty Tracker</div>
          {warnings.length===0
            ? <div style={{ color:C.ok, fontSize:14 }}>✓ All warranties in good standing</div>
            : warnings.slice(0,5).map(a=><Row key={a.id} a={a} />)}

          {insWarnings.length>0 && (
            <>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:13, margin:"14px 0 10px", color:C.ac2 }}>🛡  Insurance Renewals Due</div>
              {insWarnings.slice(0,3).map(a => {
                const d = dTo(a.insurance?.renewalDate);
                return (
                  <div key={a.id} onClick={()=>openDetail(a)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                      <div style={{ fontSize:11, color:C.mu }}>{a.insurance?.insurer||"—"}</div>
                    </div>
                    <div style={{ background:`${C.ac2}18`, color:C.ac2, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {d===0?"Today":`${d}d`}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Recently added */}
        <div style={{ flex:1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15 }}>Recently Added</div>
            <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:C.acD, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Inter',sans-serif" }}>View all →</button>
          </div>
          {recent.map(a=>(
            <div key={a.id} onClick={()=>openDetail(a)} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              {a.photos?.[0]
                ? <img src={a.photos[0]} alt="" style={{ width:36, height:36, borderRadius:9, objectFit:"cover", flexShrink:0 }} />
                : <div style={{ width:36, height:36, background:C.el, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                <div style={{ fontSize:11, color:C.mu }}>{a.pDate}{isAdmin ? ` · ${fINR(a.price)}` : ""}</div>
              </div>
              <Badge s={a.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {/* Category bar */}
        <div style={{ flex:1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Inventory Distribution</div>
          <div style={{ height:150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBar} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.br} vertical={false} />
                <XAxis dataKey="name" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background:C.el, border:`1px solid ${C.br}`, borderRadius:8, fontFamily:"'Inter',sans-serif", fontSize:12 }} cursor={{ fill:`${C.ac}10` }} />
                <Bar dataKey="count" name="Assets" radius={[4,4,0,0]}>
                  {catBar.map((e,i)=><Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
            {Object.entries(CATS).map(([k,v]) => {
              const n=assets.filter(a=>a.cat===k).length;
              const val=assets.filter(a=>a.cat===k).reduce((s,a)=>s+(a.price||0),0);
              if (!n) return null;
              return <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontSize:12, color:C.mu }}>{v.emoji}  {v.label}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{n}{isAdmin ? ` · ` : ""}{isAdmin ? <span style={{ color:C.mu }}>{fINR(val)}</span> : ""}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Book value trend — admin only */}
        {isAdmin && fyChart.length>1 && (
          <div style={{ flex:1, minWidth:280, background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Book Value Trend</div>
            <div style={{ height:160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fyChart}>
                  <defs>
                    <linearGradient id="bvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.ok} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.ok} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.br} />
                  <XAxis dataKey="yr" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}K`} />
                  <Tooltip formatter={v=>[fINR(v),"Book Value"]} contentStyle={{ background:C.el, border:`1px solid ${C.br}`, borderRadius:8, fontFamily:"'Inter',sans-serif", fontSize:12 }} />
                  <Area type="monotone" dataKey="val" stroke={C.ok} strokeWidth={2.5} fill="url(#bvg)" dot={{ fill:C.ok, r:3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Checked-out assets */}
      {checkedOut>0 && (
        <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15 }}>⇄  Currently Out ({checkedOut})</div>
            <button onClick={()=>setView("checkout")} style={{ background:"none", border:"none", color:C.acD, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Inter',sans-serif" }}>Full log →</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {assets.filter(a=>a.status==="in_use").slice(0,4).map(a=>(
              <div key={a.id} onClick={()=>openDetail(a)} style={{ display:"flex", gap:12, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.br}`, cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <div style={{ width:32, height:32, background:C.el, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                  <div style={{ fontSize:11, color:C.mu }}>{a.assignTo||"—"} · {a.loc||"—"}</div>
                </div>
                <Badge s={a.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
