import { useState, useEffect, useCallback } from "react";
import { C, CATS } from "./constants.js";
import { calcDep, uid, nextCode, migrateAsset } from "./utils.js";
import { db } from "./lib/db.js";
import { hasInlineFiles, externalizeAttachments } from "./lib/files.jsx";
import { useScannerWedge } from "./lib/scanner.js";
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
      input[type="checkbox"],input[type="radio"]{-webkit-appearance:auto;appearance:auto;width:16px;height:16px;padding:0;border:none;border-radius:0;box-shadow:none;accent-color:${C.ac};cursor:pointer;flex-shrink:0;}
      select option{background:#fff;color:${C.tx};}
      ::-webkit-scrollbar{width:10px;height:10px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#D5DAE3;border-radius:8px;border:2px solid transparent;background-clip:padding-box;}::-webkit-scrollbar-thumb:hover{background:#C2C8D4;background-clip:padding-box;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .fade{animation:fadeUp 0.22s ease;}
      @media(max-width:768px){.dsk{display:none!important;}}
      @media(min-width:769px){.mob{display:none!important;}}

      /* ─── Mobile layout ─────────────────────────────────────────────── */
      body{-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none;}
      .app-shell{height:100vh;height:100dvh;}          /* dvh = visible area, excludes the phone's browser bars */
      .content{padding:20px 22px;}
      .topbar{padding:14px 22px;}
      .safe-b{padding-bottom:env(safe-area-inset-bottom);}
      .safe-t{padding-top:env(safe-area-inset-top);}
      .h-scroll{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
      .h-scroll::-webkit-scrollbar{display:none;}
      .h-scroll > *{flex:0 0 auto;}
      @media(max-width:768px){
        input,select,textarea{font-size:16px;}             /* below 16px iOS zooms the page on focus */
        .content{padding:14px 14px 28px;}
        .topbar{padding:10px 14px;min-height:60px;}
        .stat-row{display:grid!important;grid-template-columns:1fr 1fr;gap:10px!important;}
        .stat-row > *{min-width:0!important;padding:14px!important;}
        .filters{flex-wrap:nowrap!important;width:100%;overflow-x:auto;scrollbar-width:none;}
        .filters::-webkit-scrollbar{display:none;}
        .filters > *{flex:0 0 auto;width:auto!important;}
        .detail-cols{flex-direction:column;}
        .detail-side{width:100%!important;order:2;}
        .detail-main{order:1;min-width:0!important;}
        .detail-actions{justify-content:flex-start!important;}
        .modal-wrap{padding:0!important;align-items:stretch!important;}
        .modal-box{max-width:none!important;max-height:none!important;height:100%;border-radius:0!important;border:none!important;}
        .modal-head{padding:14px 16px 12px!important;}
        .modal-body{padding:16px!important;}
        .modal-foot{padding:12px 16px calc(12px + env(safe-area-inset-bottom))!important;}
        .stat-card{gap:10px!important;}
        .stat-val{font-size:clamp(18px,5.4vw,26px)!important;}
      }
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
  const [signoffs,     setSignoffs]     = useState([]); // audit_signoffs rows
  const [checkouts,    setCheckouts]    = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [loaded,       setLoaded]       = useState(false);

  const [view,   setView]  = useState("dashboard");
  const [sel,    setSel]   = useState(null);   // selected asset
  const [modal,  setModal] = useState(null);   // { type, data? }

  // A USB/Bluetooth barcode scanner used on any page opens the scan cart with
  // that item. Disabled while another popup is open so a stray scan can't
  // replace a half-filled form (the scan popup listens for itself).
  useScannerWedge(code => setModal({ type:"scan", data:{ code } }), !!me && !modal);

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
    const [a, v, au, co, ws, so] = await Promise.all([
      db.assets.load(),
      db.vendors.load(),
      db.audits.load(),
      db.checkouts.load(),
      db.workstations.load(),
      db.auditSignoffs.load(),
    ]);
    setAssets(a.map(migrateAsset));
    setVendors(v);
    setAudits(au);
    setSignoffs(so);
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

  // ─── Saving changes to existing rows ─────────────────────────────────────
  // Screens update straight away; the database write follows. Each job is
  // { save: () => Promise<{ok, error}>, undo: () => void }. Saves run together;
  // every one that fails has its on-screen change undone, so the screen matches
  // what was actually stored, and the user is told. Returns an ok flag per job.
  async function persist(what, jobs) {
    if (!jobs.length) return [];
    const results = await Promise.all(jobs.map(j => j.save().catch(e => ({ ok:false, error:e.message }))));
    const failed = results.filter(r => !r?.ok);
    jobs.forEach((j, i) => { if (!results[i]?.ok) j.undo(); });
    if (failed.length) {
      const n = jobs.length > 1 ? `${failed.length} of ${jobs.length} changes were` : "the change was";
      alert(`Couldn't save ${what} — ${n} not stored and ${failed.length > 1 ? "have" : "has"} been undone.\n\n${failed[0]?.error || "Unknown error"}`);
    }
    return results.map(r => !!r?.ok);
  }
  const undoAsset       = old => () => { setAssets(p => p.map(a => a.id === old.id ? old : a)); setSel(s => s?.id === old.id ? old : s); };
  const undoWorkstation = old => () => setWorkstations(p => p.map(w => w.id === old.id ? old : w));
  const undoCheckout    = old => () => setCheckouts(p => p.map(c => c.id === old.id ? old : c));
  const dropCheckout    = co  => () => setCheckouts(p => p.filter(c => c.id !== co.id));

  // Check-out of items [{ asset, updated, co }]: each asset is saved first and
  // its checkout record is only created once the asset is really marked in use.
  // `extra` jobs (e.g. the workstation) are saved alongside the assets.
  async function persistCheckouts(items, extra = []) {
    const oks = await persist("the check-out", [
      ...items.map(it => ({ save: () => db.assets.update(it.updated), undo: () => { undoAsset(it.asset)(); dropCheckout(it.co)(); } })),
      ...extra,
    ]);
    const saved = items.filter((_, i) => oks[i]);
    await persist("the check-out records", saved.map(it => ({ save: () => db.checkouts.insert(it.co, me?.auth_id), undo: dropCheckout(it.co) })));
  }

  // The check-in counterpart for open checkouts.
  function returnItems(openCheckouts, returnData, now) {
    return openCheckouts.map(co => {
      const asset = assets.find(a => a.id === co.assetId);
      return {
        co, updatedCo: { ...co, ...returnData, status:"returned" },
        asset, updated: asset && { ...asset, status:"active", history:[...(asset.history||[]), { timestamp:now, action:"checked_in", changes:[] }] },
      };
    });
  }

  // Check-in of items from returnItems(): each checkout is closed first (only
  // its owner or an admin may do that) and its asset is only marked available
  // once that worked. Returns true if every checkout was closed.
  async function persistReturns(items) {
    const oks = await persist("the check-in", items.map(it => ({
      save: () => db.checkouts.update(it.updatedCo),
      undo: () => { undoCheckout(it.co)(); if (it.asset) undoAsset(it.asset)(); },
    })));
    const closed = items.filter((it, i) => oks[i] && it.asset);
    await persist("the returned assets", closed.map(it => ({ save: () => db.assets.update(it.updated), undo: undoAsset(it.asset) })));
    return oks.every(Boolean);
  }

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

    // Move any newly attached photos/documents out of the row into Storage.
    // If the upload fails (e.g. bucket not set up yet) the files stay inline,
    // exactly as before — nothing is lost.
    if (hasInlineFiles(saved)) {
      try {
        const stored = await externalizeAttachments(saved);
        saved = stored;
        setAssets(p => p.map(a => a.id === stored.id ? stored : a));
        setSel(s => s?.id === stored.id ? stored : s);
      } catch (e) {
        console.warn("[files] keeping attachments inline:", e.message);
      }
    }

    // Persist to Supabase. If the write is rejected (e.g. RLS blocks the
    // insert because this account isn't recognised as an admin in the DB),
    // roll back the optimistic UI change so the screen matches reality
    // instead of showing an asset that silently disappears on refresh.
    // Edits go through update: an upsert would hit the admin-only INSERT policy.
    const { ok, error } = editId ? await db.assets.update(saved) : await db.assets.upsert(saved);
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

  // One-time move of inline attachments into Storage (Users & Access →
  // File storage). Per asset: upload + verify every file, then save the row.
  // The row in the app is only swapped once the database write succeeds, and
  // any failure leaves that asset exactly as it was.
  async function migrateAttachments(onProgress) {
    const targets = assets.filter(hasInlineFiles);
    const result = { total: targets.length, moved: 0, failed: [] };
    for (const a of targets) {
      try {
        const stored = await externalizeAttachments(a);
        const { ok, error } = await db.assets.update(stored);
        if (!ok) throw new Error(error || "database write failed");
        setAssets(p => p.map(x => x.id === a.id ? stored : x));
        setSel(s => s?.id === a.id ? stored : s);
        result.moved++;
      } catch (e) {
        result.failed.push(`${a.name} (${a.code}): ${e.message}`);
      }
      onProgress?.({ ...result, done: result.moved + result.failed.length });
    }
    return result;
  }

  async function deleteAsset(id) {
    setAssets(p => p.filter(a => a.id !== id));
    setView("list");
    setSel(null);
    await db.assets.delete(id);
  }

  async function updateAsset(updated) {
    const old = assets.find(a => a.id === updated.id);
    if (!old) return;
    setAssets(p => p.map(a => a.id === updated.id ? updated : a));
    if (sel?.id === updated.id) setSel(updated);
    await persist("this change", [{ save: () => db.assets.update(updated), undo: undoAsset(old) }]);
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
    await persistCheckouts([{ asset, updated, co }]);
  }

  async function doReturn(checkoutId, returnData) {
    const co = checkouts.find(c => c.id === checkoutId);
    if (!co) return;
    const [item] = returnItems([co], returnData, new Date().toISOString());
    setCheckouts(p => p.map(c => c.id === checkoutId ? item.updatedCo : c));
    if (item.asset) {
      setAssets(p => p.map(a => a.id === item.asset.id ? item.updated : a));
      if (sel?.id === item.asset.id) setSel(item.updated);
    }
    closeModal();
    await persistReturns([item]);
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
    await persist("the disposal", [{ save: () => db.assets.update(updated), undo: undoAsset(asset) }]);
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

  async function startAudit(a) {
    const updated = { ...a, status:"in_progress" };
    setAudits(p => p.map(x => x.id === a.id ? updated : x));
    const { ok, error } = await db.audits.update(updated);
    if (!ok) {
      setAudits(p => p.map(x => x.id === a.id ? a : x));
      alert(`Couldn't start this audit.\n\n${error || "Unknown error"}`);
    }
  }

  function runAudit(a) { setModal({ type:"runAudit", data:a }); }

  // Finishing the checklist submits it for sign-off; the audit only becomes
  // "completed" when every approver has signed (enforced in the database).
  async function submitAuditForSignoff(auditId, checks) {
    const prev = audits.find(a => a.id === auditId);
    const updated = { ...prev, checklist:checks, status:"awaiting_signoff", submittedAt:new Date().toISOString(), submittedBy:me?.name || "", completedAt:null };
    setAudits(p => p.map(a => a.id === auditId ? updated : a));
    closeModal();
    const { ok, error } = await db.audits.update(updated);
    if (!ok) {
      setAudits(p => p.map(a => a.id === auditId ? prev : a));
      alert(`Couldn't submit this audit for sign-off.\n\n${error || "Unknown error"}`);
    }
  }

  async function refreshAudit(auditId) {
    const [fresh, so] = await Promise.all([db.audits.get(auditId), db.auditSignoffs.load()]);
    if (fresh) setAudits(p => p.map(a => a.id === auditId ? fresh : a));
    setSignoffs(so);
    return fresh;
  }

  async function sendAuditReport(auditId, resend = false) {
    const res = await db.sendAuditReport(auditId, resend);
    await refreshAudit(auditId);
    return res;
  }

  async function signAudit(audit) {
    if (!me) return;
    if (!confirm(`Sign off "${audit.name}" as ${me.name}?\n\nYou're confirming you've reviewed these audit results. This can't be undone.`)) return;
    const { ok, error } = await db.auditSignoffs.sign(audit.id, me.id);
    if (!ok) {
      alert(`Couldn't record your sign-off.\n\n${error || "Unknown error"}`);
      await refreshAudit(audit.id);
      return;
    }
    // If yours was the last signature, the database has just completed the
    // audit — send the report to everyone.
    const fresh = await refreshAudit(audit.id);
    if (fresh?.status === "completed" && !fresh.reportSentAt) {
      const res = await sendAuditReport(audit.id);
      if (!res.ok) alert(`The audit is signed off and completed, but the report email couldn't be sent.\n\n${res.error}\n\nAn admin can send it from the audit page.`);
    }
  }

  async function reopenAudit(audit) {
    if (!confirm(`Reopen "${audit.name}" for changes?\n\nAll sign-offs collected so far will be cleared and the corrected results will need to be signed again.`)) return;
    const updated = { ...audit, status:"in_progress", submittedAt:null, submittedBy:null };
    const { ok, error } = await db.audits.update(updated);
    if (!ok) alert(`Couldn't reopen this audit.\n\n${error || "Unknown error"}`);
    await refreshAudit(audit.id);
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

    // Linked assets as they were, and as they should be after this save.
    const relinks = [...removedIds.map(id => [id, null]), ...addedIds.map(id => [id, saved.id])]
      .map(([id, workstationId]) => { const a = assets.find(x => x.id === id); return a && { old:a, next:{ ...a, workstationId } }; })
      .filter(Boolean);

    // New workstations are inserted (admin only); existing ones are updated.
    const [wsOk] = await persist("the workstation", [{
      save: () => old ? db.workstations.update(saved) : db.workstations.upsert(saved),
      undo: () => {
        if (old) undoWorkstation(old)(); else setWorkstations(p => p.filter(w => w.id !== saved.id));
        relinks.forEach(r => undoAsset(r.old)());
      },
    }]);
    if (wsOk) await persist("the workstation's asset links", relinks.map(r => ({ save: () => db.assets.update(r.next), undo: undoAsset(r.old) })));
  }

  async function deleteWorkstation(id) {
    const ws = workstations.find(w => w.id === id);
    setWorkstations(p => p.filter(w => w.id !== id));
    setAssets(p => p.map(a => ws?.assetIds.includes(a.id) ? { ...a, workstationId:null } : a));
    await db.workstations.delete(id);
    const linked = ws ? assets.filter(a => ws.assetIds.includes(a.id)) : [];
    await persist("the unlinked assets", linked.map(a => ({ save: () => db.assets.update({ ...a, workstationId:null }), undo: undoAsset(a) })));
  }

  async function doWorkstationCheckout(workstation, formData) {
    const now = new Date().toISOString();
    const checkoutDate = now.split("T")[0];
    const items = workstation.assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean).map(asset => ({
      asset,
      updated: { ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] },
      co: { id:uid(), assetId:asset.id, assignedTo:formData.assignedTo, purpose:formData.purpose, location:formData.location, expectedReturn:formData.expectedReturn, notes:formData.notes, assetCode:asset.code, assetName:asset.name, checkoutDate, status:"out", workstationId:workstation.id },
    }));
    const updatedWs = { ...workstation, assignTo:formData.assignedTo, status:"in_use" };

    setCheckouts(p => [...p, ...items.map(it => it.co)]);
    setAssets(p => p.map(a => items.find(it => it.asset.id === a.id)?.updated || a));
    setWorkstations(p => p.map(w => w.id === workstation.id ? updatedWs : w));
    closeModal();

    await persistCheckouts(items, [{ save: () => db.workstations.update(updatedWs), undo: undoWorkstation(workstation) }]);
  }

  async function doWorkstationReturn(workstation, returnData) {
    const now = new Date().toISOString();
    const items = returnItems(checkouts.filter(c => c.workstationId === workstation.id && c.status === "out"), returnData, now);
    const updatedWs = { ...workstation, assignTo:"", status:"active" };

    setCheckouts(p => p.map(c => items.find(it => it.co.id === c.id)?.updatedCo || c));
    setAssets(p => p.map(a => items.find(it => it.asset?.id === a.id)?.updated || a));
    setWorkstations(p => p.map(w => w.id === workstation.id ? updatedWs : w));
    closeModal();

    // The workstation is only freed once every one of its checkouts is closed.
    if (await persistReturns(items)) await persist("the workstation", [{ save: () => db.workstations.update(updatedWs), undo: undoWorkstation(workstation) }]);
    else undoWorkstation(workstation)();
  }

  // ─── Ad-hoc bulk checkout/check-in (cart scan, not tied to a workstation) ──
  async function doBulkCheckout(assetIds, formData) {
    const now = new Date().toISOString();
    const checkoutDate = now.split("T")[0];
    const batchId = uid();
    const items = assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean).map(asset => ({
      asset,
      updated: { ...asset, status:"in_use", assignTo:formData.assignedTo, history:[...(asset.history||[]), { timestamp:now, action:"checked_out", changes:[{field:"assignedTo",old:asset.assignTo,new:formData.assignedTo}] }] },
      co: { id:uid(), assetId:asset.id, assignedTo:formData.assignedTo, purpose:formData.purpose, location:formData.location, expectedReturn:formData.expectedReturn, notes:formData.notes, assetCode:asset.code, assetName:asset.name, checkoutDate, status:"out", batchId },
    }));

    setCheckouts(p => [...p, ...items.map(it => it.co)]);
    setAssets(p => p.map(a => items.find(it => it.asset.id === a.id)?.updated || a));

    await persistCheckouts(items);
    return batchId;
  }

  async function doBulkReturn(checkoutIds, returnData) {
    const now = new Date().toISOString();
    const items = returnItems(checkouts.filter(c => checkoutIds.includes(c.id) && c.status === "out"), returnData, now);

    setCheckouts(p => p.map(c => items.find(it => it.co.id === c.id)?.updatedCo || c));
    setAssets(p => p.map(a => items.find(it => it.asset?.id === a.id)?.updated || a));

    await persistReturns(items);
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
    <div className="app-shell" style={{ display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", color:C.mu, fontFamily:"'Inter',sans-serif" }}>
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
    <div className="app-shell" style={{ display:"flex", background:"transparent", fontFamily:"'Inter',sans-serif", color:C.tx, overflow:"hidden" }}>
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

        <div className="content" style={{ flex:1, overflowY:"auto" }}>
          {view==="dashboard"  && <Dashboard assets={assets} vendors={vendors} audits={audits} checkouts={checkouts} openDetail={openDetail} totalV={totalV} totalBV={totalBV} setView={setView} isAdmin={isAdmin} />}
          {view==="list"       && <AssetList filtered={filtered} q={q} setQ={setQ} catF={catF} setCatF={setCatF} stF={stF} setStF={setStF} tagF={tagF} setTagF={setTagF} allTags={allTags} openDetail={openDetail} isAdmin={isAdmin} />}
          {view==="detail" && sel && <AssetDetail asset={sel} isAdmin={isAdmin} onEdit={isAdmin?()=>openAdd(sel):null} onDelete={isAdmin?deleteAsset:null} onCheckout={a=>setModal({type:"checkout",data:{asset:a}})} onDispose={isAdmin?a=>setModal({type:"disposal",data:a}):null} onUpdate={updateAsset} onPrintLabel={isAdmin?a=>setModal({type:"printLabels",data:{ids:[a.id]}}):null} />}
          {view==="vendors"    && isAdmin && <Vendors vendors={vendors} assets={assets} onAdd={()=>setModal({type:"vendor"})} onEdit={v=>setModal({type:"vendor",data:v})} onDelete={deleteVendor} />}
          {view==="audits"     && <Audits audits={audits} assets={assets} setView={setView} onCreateAudit={isAdmin?()=>setModal({type:"createAudit"}):null} onStartAudit={startAudit} onRunAudit={a=>setModal({type:"runAudit",data:a})} onDeleteAudit={isAdmin?deleteAudit:null} signoffs={signoffs} onSignAudit={signAudit} onReopenAudit={isAdmin?reopenAudit:null} onSendReport={isAdmin?sendAuditReport:null} />}
          {view==="reports"    && isAdmin && <Reports assets={assets} checkouts={checkouts} vendors={vendors} />}
          {view==="checkout"   && <Checkout checkouts={checkouts} assets={assets} onReturn={co=>setModal({type:"return",data:co})} onNewCheckout={()=>setModal({type:"checkout"})} onReturnBatch={returnBatch} />}
          {view==="workstations" && <Workstations workstations={workstations} assets={assets} isAdmin={isAdmin} onAdd={()=>setModal({type:"workstation"})} onEdit={w=>setModal({type:"workstation",data:w})} onDelete={deleteWorkstation} onCheckOut={w=>setModal({type:"workstationCheckout",data:w})} onCheckIn={w=>setModal({type:"workstationReturn",data:w})} />}
          {view==="useradmin"  && isAdmin && <UserAdmin inlineFileAssets={assets.filter(hasInlineFiles).length} onMigrateAttachments={migrateAttachments} />}
        </div>

        <BottomNav view={view} setView={setView} assets={assets} audits={audits} onScan={() => setModal({type:"scan"})}
          onImport={() => setModal({type:"bulkImport"})} onPrintLabels={() => setModal({type:"printLabels"})} />
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────── */}
      {modal?.type==="asset"       && <AssetModal form={form} setForm={setForm} onSave={saveAsset} onClose={closeModal} isEdit={!!editId} vendors={vendors} onDuplicate={duplicateFromForm} allTags={allTags} />}
      {modal?.type==="checkout"    && <CheckoutModal assets={assets} preselectedAsset={modal.data?.asset} onCheckout={doCheckout} onClose={closeModal} />}
      {modal?.type==="return"      && <ReturnModal checkout={modal.data} assets={assets} onReturn={doReturn} onClose={closeModal} />}
      {modal?.type==="disposal"    && <DisposalModal asset={modal.data} onDispose={doDispose} onClose={closeModal} />}
      {modal?.type==="bulkImport"  && <BulkImportModal assets={assets} onImport={doBulkImport} onClose={closeModal} />}
      {modal?.type==="vendor"      && <VendorModal vendor={modal.data} onSave={saveVendor} onClose={closeModal} />}
      {modal?.type==="createAudit" && <CreateAuditModal assets={assets} onSave={saveAudit} onClose={closeModal} />}
      {modal?.type==="runAudit"    && liveAudit && <AuditRunModal audit={liveAudit} assets={assets} onComplete={checks=>submitAuditForSignoff(liveAudit.id,checks)} onClose={closeModal} />}
      {modal?.type==="printLabels" && <PrintLabelsModal assets={assets} workstations={workstations} preselectIds={modal.data?.ids || []} onClose={closeModal} />}
      {modal?.type==="workstation"         && <WorkstationModal workstation={modal.data} assets={assets} onSave={saveWorkstation} onClose={closeModal} />}
      {modal?.type==="workstationCheckout" && <WorkstationCheckoutModal workstation={modal.data} assets={assets} onCheckout={formData=>doWorkstationCheckout(modal.data,formData)} onClose={closeModal} />}
      {modal?.type==="workstationReturn"   && <WorkstationReturnModal workstation={modal.data} assets={assets} onReturn={returnData=>doWorkstationReturn(modal.data,returnData)} onClose={closeModal} />}
      {modal?.type==="scan"        && (
        <ScanModal
          assets={assets} checkouts={checkouts}
          initialCode={modal.data?.code}
          onBulkCheckout={doBulkCheckout}
          onBulkReturn={doBulkReturn}
          onViewDetails={a => { openDetail(a); closeModal(); }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
