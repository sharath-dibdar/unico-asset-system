import { useState, useEffect } from "react";
import { C, CATS, INIT } from "./constants.js";
import { calcDep, uid, nextCode, migrateAsset } from "./utils.js";
import { Sidebar, TopBar, BottomNav } from "./components/Nav.jsx";

import Dashboard  from "./views/Dashboard.jsx";
import AssetList  from "./views/AssetList.jsx";
import AssetDetail from "./views/AssetDetail.jsx";
import Vendors    from "./views/Vendors.jsx";
import Audits     from "./views/Audits.jsx";
import Reports    from "./views/Reports.jsx";
import Checkout   from "./views/Checkout.jsx";

import AssetModal       from "./modals/AssetModal.jsx";
import { CheckoutModal, ReturnModal } from "./modals/CheckoutModal.jsx";
import DisposalModal    from "./modals/DisposalModal.jsx";
import BulkImportModal  from "./modals/BulkImportModal.jsx";
import VendorModal      from "./modals/VendorModal.jsx";
import { CreateAuditModal, AuditRunModal } from "./modals/AuditModal.jsx";
import PrintLabelsModal from "./modals/PrintLabelsModal.jsx";

export default function App() {
  const [assets,    setAssets]    = useState([]);
  const [vendors,   setVendors]   = useState([]);
  const [audits,    setAudits]    = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [loaded,    setLoaded]    = useState(false);

  const [view,     setView]    = useState("dashboard");
  const [sel,      setSel]     = useState(null);   // selected asset
  const [modal,    setModal]   = useState(null);   // { type, data? }

  // Asset form
  const [form,     setForm]    = useState({});
  const [editId,   setEditId]  = useState(null);

  // Filters
  const [q,    setQ]    = useState("");
  const [catF, setCatF] = useState("all");
  const [stF,  setStF]  = useState("all");

  // ─── localStorage load ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("uais-v3");
      setAssets(saved ? JSON.parse(saved).map(migrateAsset) : INIT.map(migrateAsset));
    } catch { setAssets(INIT.map(migrateAsset)); }
    try { const v = localStorage.getItem("uais-vendors");  setVendors(v?JSON.parse(v):[]); } catch {}
    try { const a = localStorage.getItem("uais-audits");   setAudits(a?JSON.parse(a):[]);  } catch {}
    try { const c = localStorage.getItem("uais-checkout"); setCheckouts(c?JSON.parse(c):[]); } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { if (!loaded) return; try { localStorage.setItem("uais-v3", JSON.stringify(assets)); } catch {} }, [assets, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("uais-vendors", JSON.stringify(vendors)); } catch {} }, [vendors, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("uais-audits", JSON.stringify(audits)); } catch {} }, [audits, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("uais-checkout", JSON.stringify(checkouts)); } catch {} }, [checkouts, loaded]);

  // ─── Navigation helpers ──────────────────────────────────────────────────────
  const openDetail = a => { setSel(a); setView("detail"); };
  const closeModal = () => setModal(null);

  // ─── Asset CRUD ──────────────────────────────────────────────────────────────
  function openAdd(a = null) {
    setEditId(a?.id||null);
    setForm(a ? { ...a, specs:{...(a.specs||{})}, insurance:{...(a.insurance||{})}, photos:[...(a.photos||[])], documents:[...(a.documents||[])] }
               : { status:"active", cond:"Good", specs:{}, photos:[], documents:[], insurance:{ insurer:"",policyNo:"",coverage:0,premium:0,renewalDate:"" }, serviceLog:[], history:[], disposal:null, vendorId:null, poNumber:"", billNumber:"", paymentMode:"", gstAmount:0, amcProvider:"", amcStart:"", amcEnd:"", amcCost:0, amcNotes:"" });
    setModal({ type:"asset" });
  }

  function saveAsset() {
    const now = new Date().toISOString();
    if (editId) {
      const old = assets.find(a=>a.id===editId)||{};
      const changes = Object.keys(form).filter(k=>k[0]!=="_"&&JSON.stringify(form[k])!==JSON.stringify(old[k])&&!["photos","documents","serviceLog","history"].includes(k))
        .map(k=>({ field:k, old:old[k], new:form[k] }));
      const updated = { ...form, id:editId, history:[...(old.history||[]), { timestamp:now, action:"updated", changes }] };
      setAssets(p=>p.map(a=>a.id===editId?updated:a));
      if (sel?.id===editId) setSel(updated);
    } else {
      const newAsset = { ...form, id:uid(), code:nextCode(form.cat,assets), history:[{ timestamp:now, action:"created", changes:[] }] };
      setAssets(p=>[...p, newAsset]);
    }
    closeModal();
  }

  function deleteAsset(id) { setAssets(p=>p.filter(a=>a.id!==id)); setView("list"); setSel(null); }

  function updateAsset(updated) { setAssets(p=>p.map(a=>a.id===updated.id?updated:a)); if(sel?.id===updated.id) setSel(updated); }

  // ─── Checkout ────────────────────────────────────────────────────────────────
  function doCheckout(formData) {
    const asset = assets.find(a=>a.id===formData.assetId);
    if (!asset) return;
    const co = { id:uid(), ...formData, assetCode:asset.code, assetName:asset.name, checkoutDate:new Date().toISOString().split("T")[0], status:"out" };
    setCheckouts(p=>[...p, co]);
    const now = new Date().toISOString();
    updateAsset({ ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] });
    closeModal();
  }

  function doReturn(checkoutId, returnData) {
    setCheckouts(p=>p.map(c=>c.id===checkoutId?{ ...c, ...returnData, status:"returned" }:c));
    const co = checkouts.find(c=>c.id===checkoutId);
    const asset = co ? assets.find(a=>a.id===co.assetId) : null;
    if (asset) {
      const now = new Date().toISOString();
      updateAsset({ ...asset, status:"active", history:[...(asset.history||[]), { timestamp:now, action:"checked_in", changes:[] }] });
    }
    closeModal();
  }

  // ─── Disposal ────────────────────────────────────────────────────────────────
  function doDispose(disposalData) {
    const asset = modal?.data;
    if (!asset) return;
    const now = new Date().toISOString();
    updateAsset({ ...asset, status:"retired", disposal:disposalData, history:[...(asset.history||[]), { timestamp:now, action:"disposed", changes:[{field:"status",old:asset.status,new:"retired"}] }] });
    closeModal();
    setView("list"); setSel(null);
  }

  // ─── Vendors ─────────────────────────────────────────────────────────────────
  function saveVendor(v) {
    setVendors(p => p.find(x=>x.id===v.id) ? p.map(x=>x.id===v.id?v:x) : [...p, v]);
    closeModal();
  }
  function deleteVendor(id) { setVendors(p=>p.filter(v=>v.id!==id)); }

  // ─── Audits ──────────────────────────────────────────────────────────────────
  function saveAudit(a)   { setAudits(p=>[...p, a]); closeModal(); }
  function startAudit(a)  { setAudits(p=>p.map(x=>x.id===a.id?{...x,status:"in_progress"}:x)); }
  function runAudit(a)    { setModal({ type:"runAudit", data:a }); }
  function completeAudit(auditId, checks) {
    setAudits(p=>p.map(a=>a.id===auditId?{ ...a, checklist:checks, status:"completed", completedAt:new Date().toISOString() }:a));
    closeModal();
  }
  function deleteAudit(id) { setAudits(p=>p.filter(a=>a.id!==id)); }

  // ─── Bulk import ─────────────────────────────────────────────────────────────
  function doBulkImport(newAssets) { setAssets(p=>[...p,...newAssets]); closeModal(); }

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const mQ = !q || [a.name,a.code,a.make,a.model,a.serial,a.vendor].some(f=>f?.toLowerCase().includes(q.toLowerCase()));
    return mQ && (catF==="all"||a.cat===catF) && (stF==="all"||a.status===stF);
  });

  const totalV  = assets.reduce((s,a)=>s+(a.price||0),0);
  const totalBV = assets.reduce((s,a)=>s+(CATS[a.cat]&&a.price&&a.pDate?calcDep(a.price,a.pDate,CATS[a.cat].rate).cur:0),0);

  if (!loaded) return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:C.bg, color:C.mu, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
        <div>Loading UAIS…</div>
      </div>
    </div>
  );

  const liveAudit = modal?.type==="runAudit" ? (audits.find(a=>a.id===modal.data?.id)||modal.data) : null;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.tx, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,textarea{background:${C.el};border:1px solid ${C.br};color:${C.tx};padding:10px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none;transition:border-color 0.2s;}
        input:focus,select:focus,textarea:focus{border-color:${C.ac};}
        select option{background:${C.el};color:${C.tx};}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:${C.sf};}::-webkit-scrollbar-thumb{background:${C.br};border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeUp 0.22s ease;}
        @media(max-width:768px){.dsk{display:none!important;}}
        @media(min-width:769px){.mob{display:none!important;}}
      `}</style>

      <Sidebar view={view} setView={setView} assets={assets} vendors={vendors} audits={audits}
        onAdd={()=>openAdd()} onImport={()=>setModal({type:"bulkImport"})}
        onExport={()=>setView("reports")} onPrintLabels={()=>setModal({type:"printLabels"})} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <TopBar view={view} onAdd={()=>openAdd()} onBack={()=>{ if(view==="detail") setView("list"); else if(view==="audit") setView("audits"); }} selectedName={view==="detail"&&sel?sel.name:null} />

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {view==="dashboard" && <Dashboard assets={assets} vendors={vendors} audits={audits} checkouts={checkouts} openDetail={openDetail} totalV={totalV} totalBV={totalBV} setView={setView} />}
          {view==="list"      && <AssetList filtered={filtered} q={q} setQ={setQ} catF={catF} setCatF={setCatF} stF={stF} setStF={setStF} openDetail={openDetail} />}
          {view==="detail" && sel && <AssetDetail asset={sel} onEdit={()=>openAdd(sel)} onDelete={deleteAsset} onCheckout={a=>setModal({type:"checkout",data:{asset:a}})} onDispose={a=>setModal({type:"disposal",data:a})} onUpdate={updateAsset} />}
          {view==="vendors"   && <Vendors vendors={vendors} assets={assets} onAdd={()=>setModal({type:"vendor"})} onEdit={v=>setModal({type:"vendor",data:v})} onDelete={deleteVendor} />}
          {view==="audits"    && <Audits audits={audits} assets={assets} setView={setView} onCreateAudit={()=>setModal({type:"createAudit"})} onStartAudit={startAudit} onRunAudit={a=>setModal({type:"runAudit",data:a})} onDeleteAudit={deleteAudit} onUpdateAudit={a=>setAudits(p=>p.map(x=>x.id===a.id?a:x))} />}
          {view==="reports"   && <Reports assets={assets} checkouts={checkouts} vendors={vendors} />}
          {view==="checkout"  && <Checkout checkouts={checkouts} assets={assets} onReturn={co=>setModal({type:"return",data:co})} onNewCheckout={()=>setModal({type:"checkout"})} />}
        </div>

        <BottomNav view={view} setView={setView} onAdd={()=>openAdd()} />
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {modal?.type==="asset"       && <AssetModal form={form} setForm={setForm} onSave={saveAsset} onClose={closeModal} isEdit={!!editId} vendors={vendors} />}
      {modal?.type==="checkout"    && <CheckoutModal assets={assets} preselectedAsset={modal.data?.asset} onCheckout={doCheckout} onClose={closeModal} />}
      {modal?.type==="return"      && <ReturnModal checkout={modal.data} assets={assets} onReturn={doReturn} onClose={closeModal} />}
      {modal?.type==="disposal"    && <DisposalModal asset={modal.data} onDispose={doDispose} onClose={closeModal} />}
      {modal?.type==="bulkImport"  && <BulkImportModal assets={assets} onImport={doBulkImport} onClose={closeModal} />}
      {modal?.type==="vendor"      && <VendorModal vendor={modal.data} onSave={saveVendor} onClose={closeModal} />}
      {modal?.type==="createAudit" && <CreateAuditModal assets={assets} onSave={saveAudit} onClose={closeModal} />}
      {modal?.type==="runAudit"    && liveAudit && <AuditRunModal audit={liveAudit} assets={assets} onComplete={checks=>completeAudit(liveAudit.id,checks)} onClose={closeModal} />}
      {modal?.type==="printLabels" && <PrintLabelsModal assets={assets} onClose={closeModal} />}
    </div>
  );
}
