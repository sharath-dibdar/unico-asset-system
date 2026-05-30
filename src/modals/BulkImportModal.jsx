import { useState, useRef } from "react";
import { C, CATS, ST_CFG } from "../constants.js";
import { parseImportFile, downloadImportTemplate, uid, nextCode } from "../utils.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export default function BulkImportModal({ assets, onImport, onClose }) {
  const [rows, setRows]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setLoading(true); setError(""); setRows(null);
    try {
      const parsed = await parseImportFile(file);
      setRows(parsed);
    } catch(e) {
      setError("Failed to parse file: " + e.message);
    }
    setLoading(false);
  }

  const valid   = (rows||[]).filter(r=>r._valid);
  const invalid = (rows||[]).filter(r=>!r._valid);

  function doImport() {
    const now = new Date().toISOString();
    const newAssets = valid.map(row => {
      const { _row, _errors, _valid: _v, ...fields } = row;
      return {
        photos:[], documents:[], serviceLog:[], history:[], disposal:null, vendorId:null,
        poNumber:"", billNumber:"", paymentMode:"", gstAmount:0,
        amcProvider:"", amcStart:"", amcEnd:"", amcCost:0, amcNotes:"",
        insurance:{ insurer:"", policyNo:"", coverage:0, premium:0, renewalDate:"" },
        wEnd:"N/A", wType:"", specs:{}, notes:"",
        ...fields,
        id: uid(),
        code: nextCode(fields.cat, [...assets, ...valid.slice(0, valid.indexOf(row))]),
        history:[{ timestamp:now, action:"imported", changes:[] }],
      };
    });
    onImport(newAssets);
  }

  return (
    <Modal title="Bulk Import Assets" sub="Import from Excel template" onClose={onClose} wide
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          {rows && valid.length>0 && (
            <Btn onClick={doImport} variant="success">Import {valid.length} Asset{valid.length!==1?"s":""} ✓</Btn>
          )}
        </>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Step 1: Download template */}
        <div style={{ background:C.el, borderRadius:12, padding:16 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Step 1 — Download Template</div>
          <div style={{ fontSize:13, color:C.mu, marginBottom:10 }}>Download the Excel template, fill in your assets, then upload it below.</div>
          <Btn onClick={downloadImportTemplate} variant="secondary" style={{ fontSize:12 }}>⬇ Download Template (.xlsx)</Btn>
        </div>

        {/* Step 2: Upload */}
        <div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Step 2 — Upload Filled Template</div>
          <div
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{ e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onClick={()=>fileRef.current?.click()}
            style={{ border:`2px dashed ${C.br}`, borderRadius:12, padding:"28px 20px", textAlign:"center", cursor:"pointer", color:C.mu, transition:"border-color 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.ac}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.br}>
            {loading ? "Parsing…" : "📂 Drag & drop .xlsx file or click to browse"}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
          {error && <div style={{ color:C.err, fontSize:13, marginTop:8 }}>{error}</div>}
        </div>

        {/* Step 3: Preview */}
        {rows && (
          <div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>
              Step 3 — Review ({valid.length} valid{invalid.length>0?`, ${invalid.length} with errors`:""})
            </div>

            {invalid.length>0 && (
              <div style={{ background:`${C.err}10`, border:`1px solid ${C.err}30`, borderRadius:10, padding:12, marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.err, marginBottom:6 }}>Rows with errors (will be skipped):</div>
                {invalid.map((r,i)=>(
                  <div key={i} style={{ fontSize:12, color:C.err, marginBottom:3 }}>Row {r._row}: {r._errors.join(", ")}</div>
                ))}
              </div>
            )}

            {valid.length>0 && (
              <div style={{ overflowX:"auto", maxHeight:300, overflowY:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead style={{ position:"sticky", top:0, background:C.sf }}>
                    <tr>{["Name","Category","Make","Date","Price","Status"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", textAlign:"left", borderBottom:`1px solid ${C.br}`, color:C.mu, fontWeight:600, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {valid.map((r,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.br}` }}>
                        <td style={{ padding:"8px 10px", fontWeight:600 }}>{r.name}</td>
                        <td style={{ padding:"8px 10px" }}>{CATS[r.cat]?.emoji} {CATS[r.cat]?.label||r.cat}</td>
                        <td style={{ padding:"8px 10px", color:C.mu }}>{r.make}</td>
                        <td style={{ padding:"8px 10px", color:C.mu, fontFamily:"'DM Mono',monospace" }}>{r.pDate}</td>
                        <td style={{ padding:"8px 10px", color:C.ac2 }}>₹{Number(r.price||0).toLocaleString("en-IN")}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <span style={{ background:`${C.ok}18`, color:C.ok, padding:"2px 8px", borderRadius:8, fontSize:11 }}>{ST_CFG[r.status]?.l||r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
