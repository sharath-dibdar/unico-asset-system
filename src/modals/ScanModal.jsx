import { useEffect, useRef, useState } from "react";
import { CatIcon } from "../components/Icons.jsx";
import { C, CATS, CHECKOUT_PURPOSES } from "../constants.js";
import { Btn, Modal, Label, AssigneeSelect } from "../components/UI.jsx";
import { getDetector, findAssetByScan, useScannerWedge } from "../lib/scanner.js";

export default function ScanModal({ assets, checkouts, initialCode, onBulkCheckout, onBulkReturn, onViewDetails, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const scanningRef = useRef(true);
  const cartIdsRef  = useRef(new Set());
  const lastScanRef = useRef({ code: "", t: 0 }); // per-code cooldown to avoid rapid re-reads
  const handleRef   = useRef(null);

  const [cart,     setCart]     = useState([]);   // scanned assets
  const [error,    setError]    = useState("");
  const [flash,    setFlash]    = useState(null);  // { type:"added"|"dup"|"retired"|"notfound", text }
  const [outForm,  setOutForm]  = useState(null);  // { assignedTo, purpose, location, expectedReturn, notes } | null
  const [inForm,   setInForm]   = useState(null);  // { returnDate, returnCondition, returnNotes } | null
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState("");    // success message
  const [typed,    setTyped]    = useState("");
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  useEffect(() => { cartIdsRef.current = new Set(cart.map(a => a.id)); }, [cart]);
  useEffect(() => { scanningRef.current = !outForm && !inForm; }, [outForm, inForm]);

  function flashMsg(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(f => (f?.text === text ? null : f)), 1800);
  }

  // One entry point for every source: camera, the code box, or a USB/Bluetooth scanner.
  function handleCode(raw, fromCamera = false) {
    const value = String(raw || "").trim();
    if (!value) return;
    if (fromCamera) {
      // The camera reads one physical label many times a second — ignore
      // repeats of the same code within 1.2s.
      const key = value.toLowerCase(), now = Date.now();
      if (key === lastScanRef.current.code && now - lastScanRef.current.t < 1200) { lastScanRef.current.t = now; return; }
      lastScanRef.current = { code: key, t: now };
    }
    const asset = findAssetByScan(assets, value);
    if (!asset) {
      flashMsg("notfound", `"${value}" doesn't match any asset code or serial number`);
    } else if (cartIdsRef.current.has(asset.id)) {
      flashMsg("dup", `${asset.name} already added`);
    } else if (asset.status === "retired") {
      flashMsg("retired", `${asset.name} is retired — can't process`);
    } else {
      cartIdsRef.current.add(asset.id); // guard synchronously, before the re-render
      setCart(p => [...p, asset]);
      setDone("");
      flashMsg("added", `✓ Added ${asset.name}`);
    }
  }
  handleRef.current = handleCode;

  // Hardware scanner anywhere on the page (when the code box isn't focused).
  useScannerWedge(code => handleRef.current(code));

  // Opened by a hardware scan from another page → start with that item.
  useEffect(() => { if (initialCode) handleRef.current(initialCode); }, [initialCode]);

  useEffect(() => {
    let active = true, timer = null;

    async function loop(detector) {
      if (!active) return;
      const video = videoRef.current;
      if (scanningRef.current && video && video.readyState >= 2) {
        try {
          const found = await detector.detect(video);
          if (active && found.length) handleRef.current(found[0].rawValue, true);
        } catch { /* a dropped frame — keep going */ }
      }
      timer = setTimeout(() => loop(detector), 120);
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = await getDetector();
        if (active) loop(detector);
      } catch (e) {
        if (active) setError(e?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in your browser settings, or use a barcode scanner / type the code below."
          : "No camera available here — use a barcode scanner or type the code below.");
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  function removeFromCart(id) { setCart(p => p.filter(a => a.id !== id)); }

  const toCheckOut = cart.filter(a => a.status !== "in_use" && a.status !== "retired");
  const toCheckIn  = cart
    .filter(a => a.status === "in_use")
    .map(a => ({ asset:a, checkout: checkouts.find(c => c.assetId === a.id && c.status === "out") }))
    .filter(x => x.checkout);

  async function confirmCheckout() {
    setBusy(true);
    await onBulkCheckout(toCheckOut.map(a => a.id), outForm);
    setBusy(false);
    setDone(`Checked out ${toCheckOut.length} item${toCheckOut.length !== 1 ? "s" : ""} ✓`);
    setCart(p => p.filter(a => !toCheckOut.find(o => o.id === a.id)));
    setOutForm(null);
  }

  async function confirmReturn() {
    setBusy(true);
    await onBulkReturn(toCheckIn.map(x => x.checkout.id), inForm);
    setBusy(false);
    setDone(`Checked in ${toCheckIn.length} item${toCheckIn.length !== 1 ? "s" : ""} ✓`);
    setCart(p => p.filter(a => !toCheckIn.find(i => i.asset.id === a.id)));
    setInForm(null);
  }

  const flashColors = { added:C.ok, dup:C.ac2, retired:C.err, notfound:C.err };

  return (
    <Modal title="Scan Assets" sub="Scan one item to act on it directly, or several to build a checkout/check-in batch" onClose={onClose} wide>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {error && <div style={{ textAlign:"center", padding:"18px 10px", color:C.mu, fontSize:13, background:C.el, borderRadius:12 }}>{error}</div>}

        {!error && (
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#000" }}>
            <video ref={videoRef} muted playsInline style={{ width:"100%", display:"block", height:"clamp(300px, 58dvh, 560px)", objectFit:"cover" }} />
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ width:"86%", maxWidth:520, maxHeight:"72%", aspectRatio:"3 / 2", border:`3px solid ${C.ac}`, borderRadius:18, boxShadow:"0 0 0 2000px rgba(0,0,0,0.35)" }} />
            </div>
            {flash && (
              <div style={{ position:"absolute", bottom:10, left:10, right:10, background:flashColors[flash.type], color:"#fff", fontSize:12, fontWeight:600, padding:"7px 10px", borderRadius:8, textAlign:"center" }}>
                {flash.text}
              </div>
            )}
          </div>
        )}

        {/* Typed codes, or a USB/Bluetooth scanner with this box focused */}
        <form onSubmit={e => { e.preventDefault(); handleCode(typed); setTyped(""); }} style={{ display:"flex", gap:8 }}>
          <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Scan with a barcode scanner, or type a code / serial" autoFocus={!touch} autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go" />
          <Btn onClick={() => { handleCode(typed); setTyped(""); }} variant="secondary" style={{ flexShrink:0 }}>Add</Btn>
        </form>
        {error && flash && <div style={{ textAlign:"center", fontSize:12.5, fontWeight:600, color:"#fff", background:flashColors[flash.type], padding:"7px 10px", borderRadius:8 }}>{flash.text}</div>}

        {done && <div style={{ textAlign:"center", fontSize:13, color:C.ok, fontWeight:600 }}>{done}</div>}

        {cart.length === 0 && !done && (
          <div style={{ textAlign:"center", fontSize:13, color:C.mu, padding:"10px 0" }}>Point the camera at a label's QR code or barcode — or the maker's serial-number barcode.</div>
        )}

        {cart.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* To check out */}
            {toCheckOut.length > 0 && (
              <div style={{ border:`1px solid ${C.br}`, borderRadius:12, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Ready to Check Out ({toCheckOut.length})</div>
                  {!outForm && <Btn onClick={() => setOutForm({ assignedTo:"", purpose:"Office Use", location:"", expectedReturn:"", notes:"" })} variant="primary" style={{ fontSize:12, padding:"6px 14px" }}>⇄ Check Out</Btn>}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {toCheckOut.map(a => (
                    <span key={a.id} style={{ fontSize:11, background:C.el, color:C.mu, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}>
                      <CatIcon cat={a.cat} /> {a.name}
                      <button onClick={() => removeFromCart(a.id)} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }}>×</button>
                    </span>
                  ))}
                </div>

                {outForm && (
                  <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10, borderTop:`1px solid ${C.br}`, paddingTop:12 }}>
                    <div><Label>Assigned To *</Label><AssigneeSelect value={outForm.assignedTo} onChange={v => setOutForm(p => ({ ...p, assignedTo:v }))} allowEmpty /></div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div><Label>Purpose</Label>
                        <select value={outForm.purpose} onChange={e => setOutForm(p => ({ ...p, purpose:e.target.value }))}>
                          {CHECKOUT_PURPOSES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div><Label>Location</Label><input value={outForm.location} onChange={e => setOutForm(p => ({ ...p, location:e.target.value }))} placeholder="Where is it going?" /></div>
                    </div>
                    <div><Label>Expected Return Date</Label><input type="date" value={outForm.expectedReturn} onChange={e => setOutForm(p => ({ ...p, expectedReturn:e.target.value }))} /></div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={() => setOutForm(null)} variant="secondary" style={{ flex:1 }} disabled={busy}>Cancel</Btn>
                      <Btn onClick={confirmCheckout} variant="primary" style={{ flex:1, opacity:outForm.assignedTo?1:0.5 }} disabled={!outForm.assignedTo || busy}>{busy ? "Saving…" : "Confirm Check-Out"}</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* To check in */}
            {toCheckIn.length > 0 && (
              <div style={{ border:`1px solid ${C.br}`, borderRadius:12, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Ready to Check In ({toCheckIn.length})</div>
                  {!inForm && <Btn onClick={() => setInForm({ returnDate:new Date().toISOString().split("T")[0], returnCondition:"Good", returnNotes:"" })} variant="success" style={{ fontSize:12, padding:"6px 14px" }}>✓ Check In</Btn>}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {toCheckIn.map(({ asset:a }) => (
                    <span key={a.id} style={{ fontSize:11, background:C.el, color:C.mu, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}>
                      <CatIcon cat={a.cat} /> {a.name}
                      <button onClick={() => removeFromCart(a.id)} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }}>×</button>
                    </span>
                  ))}
                </div>

                {inForm && (
                  <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:10, borderTop:`1px solid ${C.br}`, paddingTop:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div><Label>Return Date</Label><input type="date" value={inForm.returnDate} onChange={e => setInForm(p => ({ ...p, returnDate:e.target.value }))} /></div>
                      <div><Label>Condition</Label>
                        <select value={inForm.returnCondition} onChange={e => setInForm(p => ({ ...p, returnCondition:e.target.value }))}>
                          {["Excellent","Good","Fair","Poor","Damaged"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={() => setInForm(null)} variant="secondary" style={{ flex:1 }} disabled={busy}>Cancel</Btn>
                      <Btn onClick={confirmReturn} variant="success" style={{ flex:1 }} disabled={busy}>{busy ? "Saving…" : "Confirm Check-In"}</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cart.length === 1 && (
              <Btn onClick={() => onViewDetails(cart[0])} variant="secondary">View Full Details</Btn>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
