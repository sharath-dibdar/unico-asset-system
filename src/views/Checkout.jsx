import { C, CATS } from "../constants.js";
import { fDate } from "../utils.js";
import { Badge, Btn, EmptyState } from "../components/UI.jsx";

export default function Checkout({ checkouts, assets, onReturn, onNewCheckout, onReturnBatch }) {
  const out      = checkouts.filter(c=>c.status==="out").sort((a,b)=>new Date(b.checkoutDate)-new Date(a.checkoutDate));
  const returned = checkouts.filter(c=>c.status==="returned").sort((a,b)=>new Date(b.returnDate)-new Date(a.returnDate));

  const overdue = out.filter(c=>{
    if (!c.expectedReturn) return false;
    return new Date(c.expectedReturn) < new Date();
  });

  // Group anything sharing a workstationId or batchId (bundled / multi-scan checkouts)
  const groupKey = c => c.workstationId || c.batchId || null;
  const groupsMap = new Map();
  const solo = [];
  out.forEach(c => {
    const k = groupKey(c);
    if (!k) { solo.push(c); return; }
    if (!groupsMap.has(k)) groupsMap.set(k, []);
    groupsMap.get(k).push(c);
  });
  const groups = [...groupsMap.entries()];

  const Row = ({ c, showReturn }) => {
    const asset = assets.find(a=>a.id===c.assetId);
    const days = c.expectedReturn ? Math.ceil((new Date(c.expectedReturn)-new Date())/864e5) : null;
    return (
      <div style={{ background:C.sf, border:`1px solid ${overdue.includes(c)?C.err+"50":C.br}`, borderRadius:12, padding:"14px 18px", display:"flex", gap:14, alignItems:"center" }}>
        <div style={{ width:40, height:40, background:C.el, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
          {CATS[asset?.cat]?.emoji||"📦"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.assetName}</div>
          <div style={{ fontSize:11, color:C.mu, fontFamily:"'Noto Sans Mono',monospace", marginTop:1 }}>{c.assetCode}</div>
          <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.tx }}>👤 {c.assignedTo}</span>
            <span style={{ fontSize:12, color:C.mu }}>📍 {c.location||"—"}</span>
            <span style={{ fontSize:12, color:C.mu }}>🗂 {c.purpose}</span>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:12, color:C.mu }}>Out: {fDate(c.checkoutDate)}</div>
          {c.status==="out" && days!==null && (
            <div style={{ fontSize:11, fontWeight:700, color:days<0?C.err:days===0?C.ac:C.mu, marginTop:2 }}>
              {days<0?`${Math.abs(days)}d overdue`:days===0?"Due today":`Due in ${days}d`}
            </div>
          )}
          {c.status==="returned" && <div style={{ fontSize:12, color:C.ok, marginTop:2 }}>Returned {fDate(c.returnDate)}</div>}
        </div>
        {showReturn && (
          <Btn onClick={()=>onReturn(c)} variant="success" style={{ fontSize:12, padding:"7px 14px", flexShrink:0 }}>Check In</Btn>
        )}
      </div>
    );
  };

  const GroupCard = ({ groupKey: gk, items }) => {
    const first = items[0];
    const isWorkstation = !!first.workstationId;
    const days = first.expectedReturn ? Math.ceil((new Date(first.expectedReturn)-new Date())/864e5) : null;
    const anyOverdue = items.some(c => overdue.includes(c));
    return (
      <div style={{ background:C.sf, border:`1px solid ${anyOverdue?C.err+"50":C.br}`, borderRadius:12, padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11, color:C.ac, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700, marginBottom:3 }}>
              {isWorkstation ? "🖥️ Workstation bundle" : "🛒 Multi-item checkout"} · {items.length} item{items.length!==1?"s":""}
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, color:C.tx, fontWeight:600 }}>👤 {first.assignedTo}</span>
              <span style={{ fontSize:12, color:C.mu }}>📍 {first.location||"—"}</span>
              <span style={{ fontSize:12, color:C.mu }}>🗂 {first.purpose}</span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:C.mu }}>Out: {fDate(first.checkoutDate)}</div>
            {days!==null && (
              <div style={{ fontSize:11, fontWeight:700, color:days<0?C.err:days===0?C.ac:C.mu, marginTop:2 }}>
                {days<0?`${Math.abs(days)}d overdue`:days===0?"Due today":`Due in ${days}d`}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {items.map(c => {
            const asset = assets.find(a => a.id === c.assetId);
            return <span key={c.id} style={{ fontSize:11, background:C.el, color:C.mu, padding:"4px 10px", borderRadius:8 }}>{CATS[asset?.cat]?.emoji} {c.assetName}</span>;
          })}
        </div>

        <Btn onClick={() => onReturnBatch(gk)} variant="success" style={{ alignSelf:"flex-start", fontSize:12, padding:"7px 14px" }}>Check In All ({items.length})</Btn>
      </div>
    );
  };

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Stats */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:140, background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Out Now</div>
          <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Archivo',sans-serif", color:C.ac2 }}>{out.length}</div>
        </div>
        <div style={{ flex:1, minWidth:140, background:C.sf, border:`1px solid ${overdue.length>0?C.err+"40":C.br}`, borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Overdue</div>
          <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Archivo',sans-serif", color:overdue.length>0?C.err:C.mu }}>{overdue.length}</div>
        </div>
        <div style={{ flex:1, minWidth:140, background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Total Movements</div>
          <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Archivo',sans-serif", color:C.tx }}>{checkouts.length}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center" }}>
          <Btn onClick={onNewCheckout} variant="primary">+ Check Out Asset</Btn>
        </div>
      </div>

      {/* Currently out */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:700, fontSize:15 }}>Currently Out ({out.length})</div>
        {out.length===0
          ? <div style={{ color:C.mu, fontSize:14, padding:"12px 0" }}>All assets are currently in.</div>
          : (
            <>
              {groups.map(([gk, items]) => <GroupCard key={gk} groupKey={gk} items={items} />)}
              {solo.map(c=><Row key={c.id} c={c} showReturn={true} />)}
            </>
          )
        }
      </div>

      {/* Return history */}
      {returned.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:700, fontSize:15 }}>Recent Returns</div>
          {returned.slice(0,10).map(c=><Row key={c.id} c={c} showReturn={false} />)}
        </div>
      )}
    </div>
  );
}
