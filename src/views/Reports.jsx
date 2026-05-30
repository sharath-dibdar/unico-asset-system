import { C, CATS, ST_CFG } from "../constants.js";
import { fINR, fDate, calcDep, dTo } from "../utils.js";
import { generateAssetCSV, generateDepCSV, generateTallyXML, generateZohoCSV, generateDisposalCSV, downloadFile } from "../utils.js";
import { Section, Btn, Label } from "../components/UI.jsx";

export default function Reports({ assets, checkouts, vendors, onOpenExport }) {
  const totalV  = assets.reduce((s,a)=>s+(a.price||0),0);
  const totalBV = assets.reduce((s,a)=>s+(CATS[a.cat]&&a.price&&a.pDate?calcDep(a.price,a.pDate,CATS[a.cat].rate).cur:0),0);
  const active  = assets.filter(a=>a.status!=="retired"&&!a.disposal);

  // by category
  const byCat = Object.entries(CATS).map(([k,v]) => {
    const catAssets = assets.filter(a=>a.cat===k);
    const bv = catAssets.reduce((s,a)=>s+(CATS[a.cat]&&a.price&&a.pDate?calcDep(a.price,a.pDate,CATS[a.cat].rate).cur:0),0);
    return { key:k, label:v.label, emoji:v.emoji, count:catAssets.length, value:catAssets.reduce((s,a)=>s+(a.price||0),0), bv };
  }).filter(r=>r.count>0);

  // by person
  const byPerson = {};
  assets.forEach(a => {
    const p = a.assignTo||"Unassigned";
    if (!byPerson[p]) byPerson[p] = { count:0, value:0 };
    byPerson[p].count++; byPerson[p].value += (a.price||0);
  });

  // by location
  const byLoc = {};
  assets.forEach(a => {
    const l = a.loc||"Unknown";
    if (!byLoc[l]) byLoc[l] = { count:0, value:0 };
    byLoc[l].count++; byLoc[l].value += (a.price||0);
  });

  // expiring warranties
  const expiring = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d>=0&&d<=90; }).sort((a,b)=>dTo(a.wEnd)-dTo(b.wEnd));
  const expired  = assets.filter(a=>{ const d=dTo(a.wEnd); return d!==null&&d<0; });

  const TH = ({ children, right }) => <th style={{ padding:"8px 12px", textAlign:right?"right":"left", borderBottom:`1px solid ${C.br}`, color:C.mu, fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>{children}</th>;
  const TD = ({ children, mono, accent, right }) => <td style={{ padding:"9px 12px", textAlign:right?"right":"left", fontFamily:mono?"'Noto Sans Mono',monospace":"inherit", color:accent?C.ac2:C.tx, fontSize:13 }}>{children}</td>;

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Quick export buttons */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>Quick Exports</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Btn onClick={()=>downloadFile(generateAssetCSV(assets),"unico-asset-register.csv","text/csv")} variant="secondary" style={{ fontSize:12 }}>⬇ Asset Register (CSV)</Btn>
          <Btn onClick={()=>downloadFile(generateDepCSV(assets),"unico-depreciation.csv","text/csv")} variant="secondary" style={{ fontSize:12 }}>⬇ Depreciation Schedule (CSV)</Btn>
          <Btn onClick={()=>downloadFile(generateTallyXML(assets),"unico-tally-journals.xml","text/xml")} variant="secondary" style={{ fontSize:12 }}>⬇ Tally Journal XML</Btn>
          <Btn onClick={()=>downloadFile(generateZohoCSV(assets),"unico-zoho-assets.csv","text/csv")} variant="secondary" style={{ fontSize:12 }}>⬇ Zoho Books (CSV)</Btn>
          {assets.some(a=>a.disposal) && <Btn onClick={()=>downloadFile(generateDisposalCSV(assets),"unico-disposal-log.csv","text/csv")} variant="secondary" style={{ fontSize:12 }}>⬇ Disposal Log (CSV)</Btn>}
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {[
          { l:"Total Assets",      v:assets.length,     c:C.ac },
          { l:"Purchase Value",    v:fINR(totalV),      c:C.ac2 },
          { l:"Current Book Value",v:fINR(totalBV),     c:C.ok },
          { l:"Total Depreciated", v:fINR(totalV-totalBV), c:C.err },
        ].map(k=>(
          <div key={k.l} style={{ flex:1, minWidth:140, background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{k.l}</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Archivo',sans-serif", color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* By category */}
      <Section title="Inventory by Category">
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><TH>Category</TH><TH right>Assets</TH><TH right>Purchase Value</TH><TH right>Book Value</TH><TH right>Dep %</TH></tr></thead>
            <tbody>
              {byCat.map(r=>(
                <tr key={r.key} style={{ borderBottom:`1px solid ${C.br}` }}>
                  <TD>{r.emoji} {r.label}</TD>
                  <TD right>{r.count}</TD>
                  <TD right accent>{fINR(r.value)}</TD>
                  <TD right>{fINR(r.bv)}</TD>
                  <TD right>{r.value>0?Math.round((1-r.bv/r.value)*100):0}%</TD>
                </tr>
              ))}
              <tr style={{ borderTop:`2px solid ${C.br}` }}>
                <td style={{ padding:"10px 12px", fontWeight:700 }}>Total</td>
                <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>{assets.length}</td>
                <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:C.ac2 }}>{fINR(totalV)}</td>
                <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:C.ok }}>{fINR(totalBV)}</td>
                <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>{totalV>0?Math.round((1-totalBV/totalV)*100):0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {/* By person */}
        <Section title="Assets by Person" style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(byPerson).sort(([,a],[,b])=>b.count-a.count).map(([person, data])=>(
              <div key={person} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.br}` }}>
                <div style={{ fontSize:13 }}>👤 {person}</div>
                <div style={{ fontSize:12, color:C.mu }}>{data.count} assets · {fINR(data.value)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* By location */}
        <Section title="Assets by Location" style={{ flex:1, minWidth:280 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(byLoc).sort(([,a],[,b])=>b.count-a.count).map(([loc, data])=>(
              <div key={loc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.br}` }}>
                <div style={{ fontSize:13 }}>📍 {loc}</div>
                <div style={{ fontSize:12, color:C.mu }}>{data.count} assets · {fINR(data.value)}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Warranty status */}
      <Section title={`Warranty Status (${expiring.length + expired.length} alerts)`}>
        {expired.length>0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.err, marginBottom:8 }}>Expired ({expired.length})</div>
            {expired.slice(0,5).map(a=>{
              const d=dTo(a.wEnd);
              return <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.br}`, fontSize:13 }}>
                <span>{a.name} <span style={{ color:C.mu, fontSize:11, fontFamily:"'Noto Sans Mono',monospace" }}>{a.code}</span></span>
                <span style={{ color:C.err, fontWeight:600 }}>{Math.abs(d)}d ago</span>
              </div>;
            })}
          </div>
        )}
        {expiring.length>0 && (
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.ac2, marginBottom:8 }}>Expiring within 90 days ({expiring.length})</div>
            {expiring.map(a=>{
              const d=dTo(a.wEnd);
              return <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.br}`, fontSize:13 }}>
                <span>{a.name}</span>
                <span style={{ color:d<30?C.err:C.ac2, fontWeight:600 }}>{d}d left</span>
              </div>;
            })}
          </div>
        )}
        {expiring.length===0&&expired.length===0 && <div style={{ color:C.ok, fontSize:14 }}>✓ All warranties in good standing</div>}
      </Section>
    </div>
  );
}
