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
import Workstations from "./views/Workstations.jsx";

import AssetModal       from "./modals/AssetModal.jsx";
import { CheckoutModal, ReturnModal } from "./modals/CheckoutModal.jsx";
import DisposalModal    from "./modals/DisposalModal.jsx";
import BulkImportModal  from "./modals/BulkImportModal.jsx";
import VendorModal      from "./modals/VendorModal.jsx";
import { CreateAuditModal, AuditRunModal } from "./modals/AuditModal.jsx";
import PrintLabelsModal from "./modals/PrintLabelsModal.jsx";
import ScanModal from "./modals/ScanModal.jsx";
import WorkstationModal from "./modals/WorkstationModal.jsx";
import { WorkstationCheckoutModal, WorkstationReturnModal } from "./modals/WorkstationCheckoutModal.jsx";

function GlobalStyles() {
  return (
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      input,select,textarea{background:#fff;border:1px solid ${C.br};color:${C.tx};padding:10px 12px;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color 0.15s,box-shadow 0.15s;-webkit-appearance:none;appearance:none;}
      textarea{resize:vertical;min-height:84px;line-height:1.5;}
      select{cursor:pointer;padding-right:34px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
      input::placeholder,textarea::placeholder{color:#B4BAC6;}
      input:focus,select:focus,textarea:focus{border-color:${C.ac};box-shadow:0 0 0 3px rgba(255,210,0,0.25);}
      input[type="checkbox"],input[type="radio"]{width:auto;accent-color:${C.ac};cursor:pointer;}
      select option{background:#fff;color:${C.tx};}
      ::-webkit-scrollbar{width:10px;height:10px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#D5DAE3;border-radius:8px;border:2px solid transparent;background-clip:padding-box;}::-webkit-scrollbar-thumb:hover{background:#C2C8D4;background-clip:padding-box;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .fade{animation:fadeUp 0.22s ease;}
      @media(max-width:768px){.dsk{display:none!important;}}
      @media(min-width:769px){.mob{display:none!important;}}
    `}</style>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalStyles />
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { me, loaded: authLoaded, isAdmin, adminMismatch } = useAuth();

  const [assets,       setAssets]       = useState([]);
  const [vendors,      setVendors]      = useState([]);
  const [audits,       setAudits]       = useState([]);
  const [checkouts,    setCheckouts]    = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [loaded,       setLoaded]       = useState(false);

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
  const [tagF, setTagF] = useState("all");

  // ─── Load all data from Supabase ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoaded(false);
    const [a, v, au, co, ws] = await Promise.all([
      db.assets.load(),
      db.vendors.load(),
      db.audits.load(),
      db.checkouts.load(),
      db.workstations.load(),
    ]);
    setAssets(a.map(migrateAsset));
    setVendors(v);
    setAudits(au);
    setCheckouts(co);
    setWorkstations(ws);
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
      : { status:"active", cond:"Good", specs:{}, photos:[], documents:[], tags:[], insurance:{ insurer:"",policyNo:"",coverage:0,premium:0,renewalDate:"" }, serviceLog:[], history:[], disposal:null, vendorId:null, poNumber:"", billNumber:"", paymentMode:"", gstAmount:0, amcProvider:"", amcStart:"", amcEnd:"", amcCost:0, amcNotes:"" }
    );
    setModal({ type:"asset" });
  }

  // Turn the current form into a fresh new-asset draft (keeps shared details,
  // clears the per-unit identity so it saves as a separate asset).
  function duplicateFromForm() {
    setEditId(null);
    setForm(p => {
      const { id, code, history, ...rest } = p;
      return { ...rest, name:"", serial:"", status:"active", assignTo:"", workstationId:null, history:[] };
    });
  }

  async function saveAsset() {
    const now = new Date().toISOString();
    let saved;
    const prevSel = sel;
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

    // Persist to Supabase. If the write is rejected (e.g. RLS blocks the
    // insert because this account isn't recognised as an admin in the DB),
    // roll back the optimistic UI change so the screen matches reality
    // instead of showing an asset that silently disappears on refresh.
    const { ok, error } = await db.assets.upsert(saved);
    if (!ok) {
      if (editId) {
        const old = assets.find(a => a.id === editId);
        if (old) {
          setAssets(p => p.map(a => a.id === editId ? old : a));
          if (prevSel?.id === editId) setSel(old);
        }
      } else {
        setAssets(p => p.filter(a => a.id !== saved.id));
      }
      alert(`Couldn't save this asset — the change was not stored.\n\n${error || "Unknown error"}\n\nIf this says "row-level security", your account isn't linked as an admin in the database. Run supabase/migration_003_fix_profile_linking.sql.`);
    }
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

  // ─── Workstations ────────────────────────────────────────────────────────
  async function saveWorkstation(form) {
    const old = form.id ? workstations.find(w => w.id === form.id) : null;
    const saved = old ? { ...old, ...form } : { ...form, id:uid(), status:"active", assignTo:"", createdAt:new Date().toISOString() };

    const removedIds = (old?.assetIds || []).filter(id => !saved.assetIds.includes(id));
    const addedIds   = saved.assetIds.filter(id => !(old?.assetIds || []).includes(id));

    setWorkstations(p => old ? p.map(w => w.id === saved.id ? saved : w) : [...p, saved]);
    setAssets(p => p.map(a => {
      if (removedIds.includes(a.id)) return { ...a, workstationId:null };
      if (addedIds.includes(a.id))   return { ...a, workstationId:saved.id };
      return a;
    }));
    closeModal();

    await db.workstations.upsert(saved);
    await Promise.all([
      ...removedIds.map(id => db.assets.upsert({ ...assets.find(a => a.id === id), workstationId:null })),
      ...addedIds.map(id => db.assets.upsert({ ...assets.find(a => a.id === id), workstationId:saved.id })),
    ]);
  }

  async function deleteWorkstation(id) {
    const ws = workstations.find(w => w.id === id);
    setWorkstations(p => p.filter(w => w.id !== id));
    setAssets(p => p.map(a => ws?.assetIds.includes(a.id) ? { ...a, workstationId:null } : a));
    await db.workstations.delete(id);
    if (ws) await Promise.all(ws.assetIds.map(aid => db.assets.upsert({ ...assets.find(a => a.id === aid), workstationId:null })));
  }

  async function doWorkstationCheckout(workstation, formData) {
    const now = new Date().toISOString();
    const checkoutDate = now.split("T")[0];
    const newCheckouts = [];
    const updatedAssets = [];

    for (const assetId of workstation.assetIds) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) continue;
      const co = { id:uid(), assetId, assignedTo:formData.assignedTo, purpose:formData.purpose, location:formData.location, expectedReturn:formData.expectedReturn, notes:formData.notes, assetCode:asset.code, assetName:asset.name, checkoutDate, status:"out", workstationId:workstation.id };
      newCheckouts.push(co);
      updatedAssets.push({ ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] });
    }

    const updatedWs = { ...workstation, assignTo:formData.assignedTo, status:"in_use" };

    setCheckouts(p => [...p, ...newCheckouts]);
    setAssets(p => p.map(a => updatedAssets.find(u => u.id === a.id) || a));
    setWorkstations(p => p.map(w => w.id === workstation.id ? updatedWs : w));
    closeModal();

    await Promise.all([
      ...newCheckouts.map(co => db.checkouts.insert(co, me?.auth_id)),
      ...updatedAssets.map(a => db.assets.upsert(a)),
      db.workstations.upsert(updatedWs),
    ]);
  }

  async function doWorkstationReturn(workstation, returnData) {
    const now = new Date().toISOString();
    const openCheckouts = checkouts.filter(c => c.workstationId === workstation.id && c.status === "out");
    const updatedCheckouts = openCheckouts.map(c => ({ ...c, ...returnData, status:"returned" }));
    const updatedAssets = openCheckouts
      .map(c => assets.find(a => a.id === c.assetId))
      .filter(Boolean)
      .map(a => ({ ...a, status:"active", history:[...(a.history||[]), { timestamp:now, action:"checked_in", changes:[] }] }));

    const updatedWs = { ...workstation, assignTo:"", status:"active" };

    setCheckouts(p => p.map(c => updatedCheckouts.find(u => u.id === c.id) || c));
    setAssets(p => p.map(a => updatedAssets.find(u => u.id === a.id) || a));
    setWorkstations(p => p.map(w => w.id === workstation.id ? updatedWs : w));
    closeModal();

    await Promise.all([
      ...updatedCheckouts.map(co => db.checkouts.update(co)),
      ...updatedAssets.map(a => db.assets.upsert(a)),
      db.workstations.upsert(updatedWs),
    ]);
  }

  // ─── Ad-hoc bulk checkout/check-in (cart scan, not tied to a workstation) ──
  async function doBulkCheckout(assetIds, formData) {
    const now = new Date().toISOString();
    const checkoutDate = now.split("T")[0];
    const batchId = uid();
    const newCheckouts = [];
    const updatedAssets = [];

    for (const assetId of assetIds) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) continue;
      const co = { id:uid(), assetId, assignedTo:formData.assignedTo, purpose:formData.purpose, location:formData.location, expectedReturn:formData.expectedReturn, notes:formData.notes, assetCode:asset.code, assetName:asset.name, checkoutDate, status:"out", batchId };
      newCheckouts.push(co);
      updatedAssets.push({ ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] });
    }

    setCheckouts(p => [...p, ...newCheckouts]);
    setAssets(p => p.map(a => updatedAssets.find(u => u.id === a.id) || a));

    await Promise.all([
      ...newCheckouts.map(co => db.checkouts.insert(co, me?.auth_id)),
      ...updatedAssets.map(a => db.assets.upsert(a)),
    ]);
    return batchId;
  }

  async function doBulkReturn(checkoutIds, returnData) {
    const now = new Date().toISOString();
    const targets = checkouts.filter(c => checkoutIds.includes(c.id) && c.status === "out");
    const updatedCheckouts = targets.map(c => ({ ...c, ...returnData, status:"returned" }));
    const updatedAssets = targets
      .map(c => assets.find(a => a.id === c.assetId))
      .filter(Boolean)
      .map(a => ({ ...a, status:"active", history:[...(a.history||[]), { timestamp:now, action:"checked_in", changes:[] }] }));

    setCheckouts(p => p.map(c => updatedCheckouts.find(u => u.id === c.id) || c));
    setAssets(p => p.map(a => updatedAssets.find(u => u.id === a.id) || a));

    await Promise.all([
      ...updatedCheckouts.map(co => db.checkouts.update(co)),
      ...updatedAssets.map(a => db.assets.upsert(a)),
    ]);
  }

  function returnBatch(groupKey) {
    const ids = checkouts.filter(c => (c.workstationId || c.batchId) === groupKey && c.status === "out").map(c => c.id);
    doBulkReturn(ids, { returnDate:new Date().toISOString().split("T")[0], returnCondition:"Good", returnNotes:"" });
  }

  // ─── Bulk import ─────────────────────────────────────────────────────────
  async function doBulkImport(newAssets) {
    setAssets(p => [...p, ...newAssets]);
    closeModal();
    await db.assets.bulkInsert(newAssets);
  }

  // ─── Filters ─────────────────────────────────────────────────────────────
  const allTags = [...new Set(assets.flatMap(a => a.tags || []))].sort((x, y) => x.localeCompare(y));

  const filtered = assets.filter(a => {
    const mQ = !q || [a.name,a.code,a.make,a.model,a.serial,a.vendor,...(a.tags||[])].some(f => f?.toLowerCase().includes(q.toLowerCase()));
    const mTag = tagF === "all" || (a.tags || []).includes(tagF);
    return mQ && (catF === "all" || a.cat === catF) && (stF === "all" || a.status === stF) && mTag;
  });

  const totalV  = assets.reduce((s, a) => s + (a.price || 0), 0);
  const totalBV = assets.reduce((s, a) => s + (CATS[a.cat] && a.price && a.pDate ? calcDep(a.price, a.pDate, CATS[a.cat].rate).cur : 0), 0);

  // ─── Loading / auth gates ─────────────────────────────────────────────────
  if (!loaded || !authLoaded) return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:"transparent", color:C.mu, fontFamily:"'Inter',sans-serif" }}>
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
    <div style={{ display:"flex", height:"100vh", background:"transparent", fontFamily:"'Inter',sans-serif", color:C.tx, overflow:"hidden" }}>
      <Sidebar view={view} setView={setView} assets={assets} vendors={vendors} audits={audits}
        onAdd={() => openAdd()} onImport={() => setModal({type:"bulkImport"})}
        onExport={() => setView("reports")} onPrintLabels={() => setModal({type:"printLabels"})}
        onScan={() => setModal({type:"scan"})} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <TopBar view={view} onAdd={() => openAdd()} onBack={() => { if(view==="detail") setView("list"); else if(view==="audit") setView("audits"); }} onScan={() => setModal({type:"scan"})} selectedName={view==="detail"&&sel?sel.name:null} />

        {adminMismatch && (
          <div style={{ background:`${C.err}1A`, borderBottom:`1px solid ${C.err}`, color:C.tx, padding:"10px 22px", fontSize:13, lineHeight:1.5, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:15 }}>⚠️</span>
            <span>
              <strong>Your account shows as Admin, but the database doesn't recognise it as one.</strong>{" "}
              Admin changes (adding assets, vendors, audits) won't be saved and will disappear on refresh. This account's login isn't linked to its profile — an admin needs to run <code style={{ background:C.el, padding:"1px 5px", borderRadius:4 }}>supabase/migration_003_fix_profile_linking.sql</code>, then sign out and back in.
            </span>
          </div>
        )}

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {view==="dashboard"  && <Dashboard assets={assets} vendors={vendors} audits={audits} checkouts={checkouts} openDetail={openDetail} totalV={totalV} totalBV={totalBV} setView={setView} isAdmin={isAdmin} />}
          {view==="list"       && <AssetList filtered={filtered} q={q} setQ={setQ} catF={catF} setCatF={setCatF} stF={stF} setStF={setStF} tagF={tagF} setTagF={setTagF} allTags={allTags} openDetail={openDetail} isAdmin={isAdmin} />}
          {view==="detail" && sel && <AssetDetail asset={sel} isAdmin={isAdmin} onEdit={isAdmin?()=>openAdd(sel):null} onDelete={isAdmin?deleteAsset:null} onCheckout={a=>setModal({type:"checkout",data:{asset:a}})} onDispose={isAdmin?a=>setModal({type:"disposal",data:a}):null} onUpdate={updateAsset} />}
          {view==="vendors"    && isAdmin && <Vendors vendors={vendors} assets={assets} onAdd={()=>setModal({type:"vendor"})} onEdit={v=>setModal({type:"vendor",data:v})} onDelete={deleteVendor} />}
          {view==="audits"     && <Audits audits={audits} assets={assets} setView={setView} onCreateAudit={isAdmin?()=>setModal({type:"createAudit"}):null} onStartAudit={startAudit} onRunAudit={a=>setModal({type:"runAudit",data:a})} onDeleteAudit={isAdmin?deleteAudit:null} onUpdateAudit={a=>{ const u={...a}; setAudits(p=>p.map(x=>x.id===a.id?u:x)); db.audits.upsert(u); }} />}
          {view==="reports"    && isAdmin && <Reports assets={assets} checkouts={checkouts} vendors={vendors} />}
          {view==="checkout"   && <Checkout checkouts={checkouts} assets={assets} onReturn={co=>setModal({type:"return",data:co})} onNewCheckout={()=>setModal({type:"checkout"})} onReturnBatch={returnBatch} />}
          {view==="workstations" && <Workstations workstations={workstations} assets={assets} isAdmin={isAdmin} onAdd={()=>setModal({type:"workstation"})} onEdit={w=>setModal({type:"workstation",data:w})} onDelete={deleteWorkstation} onCheckOut={w=>setModal({type:"workstationCheckout",data:w})} onCheckIn={w=>setModal({type:"workstationReturn",data:w})} />}
          {view==="useradmin"  && isAdmin && <UserAdmin />}
        </div>

        <BottomNav view={view} setView={setView} onAdd={() => openAdd()} onScan={() => setModal({type:"scan"})} />
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────── */}
      {modal?.type==="asset"       && <AssetModal form={form} setForm={setForm} onSave={saveAsset} onClose={closeModal} isEdit={!!editId} vendors={vendors} onDuplicate={duplicateFromForm} allTags={allTags} />}
      {modal?.type==="checkout"    && <CheckoutModal assets={assets} preselectedAsset={modal.data?.asset} onCheckout={doCheckout} onClose={closeModal} />}
      {modal?.type==="return"      && <ReturnModal checkout={modal.data} assets={assets} onReturn={doReturn} onClose={closeModal} />}
      {modal?.type==="disposal"    && <DisposalModal asset={modal.data} onDispose={doDispose} onClose={closeModal} />}
      {modal?.type==="bulkImport"  && <BulkImportModal assets={assets} onImport={doBulkImport} onClose={closeModal} />}
      {modal?.type==="vendor"      && <VendorModal vendor={modal.data} onSave={saveVendor} onClose={closeModal} />}
      {modal?.type==="createAudit" && <CreateAuditModal assets={assets} onSave={saveAudit} onClose={closeModal} />}
      {modal?.type==="runAudit"    && liveAudit && <AuditRunModal audit={liveAudit} assets={assets} onComplete={checks=>completeAudit(liveAudit.id,checks)} onClose={closeModal} />}
      {modal?.type==="printLabels" && <PrintLabelsModal assets={assets} workstations={workstations} onClose={closeModal} />}
      {modal?.type==="workstation"         && <WorkstationModal workstation={modal.data} assets={assets} onSave={saveWorkstation} onClose={closeModal} />}
      {modal?.type==="workstationCheckout" && <WorkstationCheckoutModal workstation={modal.data} assets={assets} onCheckout={formData=>doWorkstationCheckout(modal.data,formData)} onClose={closeModal} />}
      {modal?.type==="workstationReturn"   && <WorkstationReturnModal workstation={modal.data} assets={assets} onReturn={returnData=>doWorkstationReturn(modal.data,returnData)} onClose={closeModal} />}
      {modal?.type==="scan"        && (
        <ScanModal
          assets={assets} checkouts={checkouts}
          onBulkCheckout={doBulkCheckout}
          onBulkReturn={doBulkReturn}
          onViewDetails={a => { openDetail(a); closeModal(); }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
