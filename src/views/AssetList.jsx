import { C, CATS, ST_CFG } from "../constants.js";
import { fINR, dTo, calcDep } from "../utils.js";
import { Badge } from "../components/UI.jsx";

export default function AssetList({ filtered, q, setQ, catF, setCatF, stF, setStF, openDetail }) {
  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:180, position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.mu, pointerEvents:"none" }}>⌕</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, code, make, serial…" style={{ paddingLeft:34 }} />
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
          const wd  = dTo(a.wEnd);
          const wDot = wd===null ? null : wd<0 ? C.err : wd<90 ? C.ac : C.ok;
          return (
            <div key={a.id} onClick={()=>openDetail(a)}
              style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", gap:14, alignItems:"center", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.ac; e.currentTarget.style.background=C.el; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.br; e.currentTarget.style.background=C.sf; }}>
              {/* thumbnail or emoji */}
              {a.photos?.[0]
                ? <img src={a.photos[0]} alt="" style={{ width:42, height:42, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
                : <div style={{ width:42, height:42, background:C.el, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{a.name}</span>
                  <Badge s={a.status} />
                </div>
                <div style={{ fontSize:11, color:C.mu, marginTop:2, fontFamily:"'DM Mono',monospace" }}>{a.code} · {a.make} · {a.loc}</div>
                {a.assignTo && a.assignTo!=="Common Pool" && (
                  <div style={{ fontSize:11, color:C.mu, marginTop:1 }}>👤 {a.assignTo}</div>
                )}
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
