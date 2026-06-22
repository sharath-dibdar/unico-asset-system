import { useState, useEffect, useCallback } from "react";
import { C, CATS } from "./constants.js";
import { calcDep, uid, nextCode, migrateAsset } from "./utils.js";
import { db } from "./lib/db.js";
import { Sidebar, TopBar, BottomNav } from "./components/Nav.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import LoginPage from "./auth/LoginPage.jsx";

import Dashboard   from "./views/Dashboard.jsx";
import AssetList   from "./views/AssetList.jsx";
import AssetDetail from "./views/AssetDetail.jsx";
import Vendors     from "./views/Vendors.jsx";
import Audits      from "./views/Audits.jsx";
import Reports     from "./views/Reports.jsx";
import Checkout    from "./views/Checkout.jsx";
import UserAdmin   from "./views/UserAdmin.jsx";

import AssetModal       from "./modals/AssetModal.jsx";
import { CheckoutModal, ReturnModal } from "./modals/CheckoutModal.jsx";
import DisposalModal    from "./modals/DisposalModal.jsx";
import BulkImportModal  from "./modals/BulkImportModal.jsx";
import VendorModal      from "./modals/VendorModal.jsx";
import { CreateAuditModal, AuditRunModal } from "./modals/AuditModal.jsx";
import PrintLabelsModal from "./modals/PrintLabelsModal.jsx";

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

function AppInner() {
  const { me, loaded: authLoaded, isAdmin } = useAuth();

  const [assets,    setAssets]    = useState([]);
  const [vendors,   setVendors]   = useState([]);
  const [audits,    setAudits]    = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [loaded,    setLoaded]    = useState(false);

  const [view,   setView]  = useState("dashboard");
  const [sel,    setSel]   = useState(null);   // selected asset
  const [modal,  setModal] = useState(null);   // { type, data? }

  // Asset form
  const [form,   setForm]  = useState({});
  const [editId, setEditId]= useState(null);

  // Filters
  const [q,    setQ]    = useState("");
  const [catF, setCatF] = useState("all");
  const [stF,  setStF]  = useState("all");

  // ─── Load all data from Supabase ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoaded(false);
    const [a, v, au, co] = await Promise.all([
      db.assets.load(),
      db.vendors.load(),
      db.audits.load(),
      db.checkouts.load(),
    ]);
    setAssets(a.map(migrateAsset));
    setVendors(v);
    setAudits(au);
    setCheckouts(co);
    setLoaded(true);
  }, []);

  // Load once when auth is resolved and user is signed in
  useEffect(() => {
    if (authLoaded && me) loadData();
    else if (authLoaded && !me) setLoaded(true);
  }, [authLoaded, me, loadData]);

  // ─── Navigation helpers ──────────────────────────────────────────────────
  const openDetail = a => { setSel(a); setView("detail"); };
  const closeModal = () => setModal(null);

  // ─── Asset CRUD ──────────────────────────────────────────────────────────
  function openAdd(a = null) {
    setEditId(a?.id || null);
    setForm(a
      ? { ...a, specs:{...(a.specs||{})}, insurance:{...(a.insurance||{})}, photos:[...(a.photos||[])], documents:[...(a.documents||[])] }
      : { status:"active", cond:"Good", specs:{}, photos:[], documents:[], insurance:{ insurer:"",policyNo:"",coverage:0,premium:0,renewalDate:"" }, serviceLog:[], history:[], disposal:null, vendorId:null, poNumber:"", billNumber:"", paymentMode:"", gstAmount:0, amcProvider:"", amcStart:"", amcEnd:"", amcCost:0, amcNotes:"" }
    );
    setModal({ type:"asset" });
  }

  async function saveAsset() {
    const now = new Date().toISOString();
    let saved;
    if (editId) {
      const old = assets.find(a => a.id === editId) || {};
      const changes = Object.keys(form)
        .filter(k => k[0] !== "_" && JSON.stringify(form[k]) !== JSON.stringify(old[k]) && !["photos","documents","serviceLog","history"].includes(k))
        .map(k => ({ field:k, old:old[k], new:form[k] }));
      saved = { ...form, id:editId, history:[...(old.history||[]), { timestamp:now, action:"updated", changes }] };
      setAssets(p => p.map(a => a.id === editId ? saved : a));
      if (sel?.id === editId) setSel(saved);
    } else {
      saved = { ...form, id:uid(), code:nextCode(form.cat, assets), history:[{ timestamp:now, action:"created", changes:[] }] };
      setAssets(p => [...p, saved]);
    }
    closeModal();
    await db.assets.upsert(saved);
  }

  async function deleteAsset(id) {
    setAssets(p => p.filter(a => a.id !== id));
    setView("list");
    setSel(null);
    await db.assets.delete(id);
  }

  async function updateAsset(updated) {
    setAssets(p => p.map(a => a.id === updated.id ? updated : a));
    if (sel?.id === updated.id) setSel(updated);
    await db.assets.upsert(updated);
  }

  // ─── Checkout ────────────────────────────────────────────────────────────
  async function doCheckout(formData) {
    const asset = assets.find(a => a.id === formData.assetId);
    if (!asset) return;
    const co = { id:uid(), ...formData, assetCode:asset.code, assetName:asset.name, checkoutDate:new Date().toISOString().split("T")[0], status:"out" };
    setCheckouts(p => [...p, co]);
    const now = new Date().toISOString();
    const updated = { ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] };
    setAssets(p => p.map(a => a.id === asset.id ? updated : a));
    if (sel?.id === asset.id) setSel(updated);
    closeModal();
    await db.checkouts.insert(co, me?.auth_id);
    await db.assets.upsert(updated);
  }

  async function doReturn(checkoutId, returnData) {
    const co = checkouts.find(c => c.id === checkoutId);
    const updatedCo = { ...co, ...returnData, status:"returned" };
    setCheckouts(p => p.map(c => c.id === checkoutId ? updatedCo : c));
    const asset = co ? assets.find(a => a.id === co.assetId) : null;
    if (asset) {
      const now = new Date().toISOString();
      const updated = { ...asset, status:"active", history:[...(asset.history||[]), { timestamp:now, action:"checked_in", changes:[] }] };
      setAssets(p => p.map(a => a.id === asset.id ? updated : a));
      if (sel?.id === asset.id) setSel(updated);
      await db.assets.upsert(updated);
    }
    closeModal();
    await db.checkouts.update(updatedCo);
  }

  // ─── Disposal ────────────────────────────────────────────────────────────
  async function doDispose(disposalData) {
    const asset = modal?.data;
    if (!asset) return;
    const now = new Date().toISOString();
    const updated = { ...asset, status:"retired", disposal:disposalData, history:[...(asset.history||[]), { timestamp:now, action:"disposed", changes:[{field:"status",old:asset.status,new:"retired"}] }] };
    setAssets(p => p.map(a => a.id === asset.id ? updated : a));
    closeModal();
    setView("list");
    setSel(null);
    await db.assets.upsert(updated);
  }

  // ─── Vendors ─────────────────────────────────────────────────────────────
  async function saveVendor(v) {
    setVendors(p => p.find(x => x.id === v.id) ? p.map(x => x.id === v.id ? v : x) : [...p, v]);
    closeModal();
    await db.vendors.upsert(v);
  }

  async function deleteVendor(id) {
    setVendors(p => p.filter(v => v.id !== id));
    await db.vendors.delete(id);
  }

  // ─── Audits ──────────────────────────────────────────────────────────────
  async function saveAudit(a) {
    setAudits(p => [...p, a]);
    closeModal();
    await db.audits.upsert(a);
  }

  function startAudit(a) {
    const updated = { ...a, status:"in_progress" };
    setAudits(p => p.map(x => x.id === a.id ? updated : x));
    db.audits.upsert(updated);
  }

  function runAudit(a) { setModal({ type:"runAudit", data:a }); }

  async function completeAudit(auditId, checks) {
    const updated = { ...audits.find(a => a.id === auditId), checklist:checks, status:"completed", completedAt:new Date().toISOString() };
    setAudits(p => p.map(a => a.id === auditId ? updated : a));
    closeModal();
    await db.audits.upsert(updated);
  }

  async function deleteAudit(id) {
    setAudits(p => p.filter(a => a.id !== id));
    await db.audits.delete(id);
  }

  // ─── Bulk import ─────────────────────────────────────────────────────────
  async function doBulkImport(newAssets) {
    setAssets(p => [...p, ...newAssets]);
    closeModal();
    await db.assets.bulkInsert(newAssets);
  }

  // ─── Filters ─────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const mQ = !q || [a.name,a.code,a.make,a.model,a.serial,a.vendor].some(f => f?.toLowerCase().includes(q.toLowerCase()));
    return mQ && (catF === "all" || a.cat === catF) && (stF === "all" || a.status === stF);
  });

  const totalV  = assets.reduce((s, a) => s + (a.price || 0), 0);
  const totalBV = assets.reduce((s, a) => s + (CATS[a.cat] && a.price && a.pDate ? calcDep(a.price, a.pDate, CATS[a.cat].rate).cur : 0), 0);

  // ─── Loading / auth gates ─────────────────────────────────────────────────
  if (!loaded || !authLoaded) return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:C.bg, color:C.mu, fontFamily:"'Archivo',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <img src="/logo.svg" alt="Unico" style={{ width:56, height:56, borderRadius:14, marginBottom:16, opacity:0.85 }} />
        <div style={{ fontSize:13 }}>Loading…</div>
      </div>
    </div>
  );

  if (!me) return <LoginPage />;

  const liveAudit = modal?.type === "runAudit"
    ? (audits.find(a => a.id === modal.data?.id) || modal.data)
    : null;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Archivo',sans-serif", color:C.tx, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Noto+Sans+Mono:wdth,wght@75,400;75,500;75,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,textarea{background:${C.el};border:1px solid ${C.br};color:${C.tx};padding:10px 14px;border-radius:8px;font-family:'Archivo',sans-serif;font-size:13px;width:100%;outline:none;transition:border-color 0.2s;}
        input:focus,select:focus,textarea:focus{border-color:${C.ac};}
        select option{background:${C.el};color:${C.tx};}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:${C.sf};}::-webkit-scrollbar-thumb{background:${C.br};border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeUp 0.22s ease;}
        @media(max-width:768px){.dsk{display:none!important;}}
        @media(min-width:769px){.mob{display:none!important;}}
      `}</style>

      <Sidebar view={view} setView={setView} assets={assets} vendors={vendors} audits={audits}
        onAdd={() => openAdd()} onImport={() => setModal({type:"bulkImport"})}
        onExport={() => setView("reports")} onPrintLabels={() => setModal({type:"printLabels"})} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <TopBar view={view} onAdd={() => openAdd()} onBack={() => { if(view==="detail") setView("list"); else if(view==="audit") setView("audits"); }} selectedName={view==="detail"&&sel?sel.name:null} />

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {view==="dashboard"  && <Dashboard assets={assets} vendors={vendors} audits={audits} checkouts={checkouts} openDetail={openDetail} totalV={totalV} totalBV={totalBV} setView={setView} isAdmin={isAdmin} />}
          {view==="list"       && <AssetList filtered={filtered} q={q} setQ={setQ} catF={catF} setCatF={setCatF} stF={stF} setStF={setStF} openDetail={openDetail} isAdmin={isAdmin} />}
          {view==="detail" && sel && <AssetDetail asset={sel} isAdmin={isAdmin} onEdit={isAdmin?()=>openAdd(sel):null} onDelete={isAdmin?deleteAsset:null} onCheckout={a=>setModal({type:"checkout",data:{asset:a}})} onDispose={isAdmin?a=>setModal({type:"disposal",data:a}):null} onUpdate={updateAsset} />}
          {view==="vendors"    && isAdmin && <Vendors vendors={vendors} assets={assets} onAdd={()=>setModal({type:"vendor"})} onEdit={v=>setModal({type:"vendor",data:v})} onDelete={deleteVendor} />}
          {view==="audits"     && <Audits audits={audits} assets={assets} setView={setView} onCreateAudit={isAdmin?()=>setModal({type:"createAudit"}):null} onStartAudit={startAudit} onRunAudit={a=>setModal({type:"runAudit",data:a})} onDeleteAudit={isAdmin?deleteAudit:null} onUpdateAudit={a=>{ const u={...a}; setAudits(p=>p.map(x=>x.id===a.id?u:x)); db.audits.upsert(u); }} />}
          {view==="reports"    && isAdmin && <Reports assets={assets} checkouts={checkouts} vendors={vendors} />}
          {view==="checkout"   && <Checkout checkouts={checkouts} assets={assets} onReturn={co=>setModal({type:"return",data:co})} onNewCheckout={()=>setModal({type:"checkout"})} />}
          {view==="useradmin"  && isAdmin && <UserAdmin />}
        </div>

        <BottomNav view={view} setView={setView} onAdd={() => openAdd()} />
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────── */}
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
