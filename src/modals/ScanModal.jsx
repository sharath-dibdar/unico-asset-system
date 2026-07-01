import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { C, CATS, CHECKOUT_PURPOSES } from "../constants.js";
import { Btn, Modal, Label, AssigneeSelect } from "../components/UI.jsx";

export default function ScanModal({ assets, checkouts, onBulkCheckout, onBulkReturn, onViewDetails, onClose }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const scanningRef = useRef(true);
  const cartIdsRef  = useRef(new Set());
  const lastScanRef = useRef({ code: "", t: 0 }); // per-code cooldown to avoid rapid re-reads

  const [cart,     setCart]     = useState([]);   // scanned assets
  const [error,    setError]    = useState("");
  const [flash,    setFlash]    = useState(null);  // { type:"added"|"dup"|"retired"|"notfound", text }
  const [outForm,  setOutForm]  = useState(null);  // { assignedTo, purpose, location, expectedReturn, notes } | null
  const [inForm,   setInForm]   = useState(null);  // { returnDate, returnCondition, returnNotes } | null
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState("");    // success message

  useEffect(() => { cartIdsRef.current = new Set(cart.map(a => a.id)); }, [cart]);
  useEffect(() => { scanningRef.current = !outForm && !inForm; }, [outForm, inForm]);

  useEffect(() => {
    let active = true;

    function flashMsg(type, text) {
      setFlash({ type, text });
      setTimeout(() => setFlash(f => (f?.text === text ? null : f)), 1600);
    }

    function loop() {
      if (!active) return;
      const video = videoRef.current, canvas = canvasRef.current;
      if (scanningRef.current && video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          const code = result.data.trim().toLowerCase();
          const now  = Date.now();
          // Ignore the same code if seen within the last 1.2s — the camera
          // decodes ~60 frames/s, so one physical label reads many times.
          if (code === lastScanRef.current.code && now - lastScanRef.current.t < 1200) {
            lastScanRef.current.t = now;
          } else {
            lastScanRef.current = { code, t: now };
            const asset = assets.find(a => a.code?.toLowerCase() === code);
            if (!asset) {
              flashMsg("notfound", `"${result.data.trim()}" doesn't match any asset`);
            } else if (cartIdsRef.current.has(asset.id)) {
              flashMsg("dup", `${asset.name} already added`);
            } else if (asset.status === "retired") {
              flashMsg("retired", `${asset.name} is retired — can't process`);
            } else {
              cartIdsRef.current.add(asset.id); // guard synchronously, before the re-render
              setCart(p => [...p, asset]);
              flashMsg("added", `✓ Added ${asset.name}`);
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        loop();
      } catch {
        setError("Camera access denied or unavailable. Allow camera permission in your browser and try again.");
      }
    })();

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [assets]);

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
        {error && <div style={{ textAlign:"center", padding:"30px 10px", color:C.err, fontSize:13 }}>{error}</div>}

        {!error && (
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#000" }}>
            <video ref={videoRef} muted playsInline style={{ width:"100%", display:"block", maxHeight:280, objectFit:"cover" }} />
            <canvas ref={canvasRef} style={{ display:"none" }} />
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ width:"46%", aspectRatio:"1", border:`2px solid ${C.ac}`, borderRadius:14, boxShadow:"0 0 0 2000px rgba(0,0,0,0.4)" }} />
            </div>
            {flash && (
              <div style={{ position:"absolute", bottom:10, left:10, right:10, background:flashColors[flash.type], color:"#fff", fontSize:12, fontWeight:600, padding:"7px 10px", borderRadius:8, textAlign:"center" }}>
                {flash.text}
              </div>
            )}
          </div>
        )}

        {done && <div style={{ textAlign:"center", fontSize:13, color:C.ok, fontWeight:600 }}>{done}</div>}

        {cart.length === 0 && !done && (
          <div style={{ textAlign:"center", fontSize:13, color:C.mu, padding:"10px 0" }}>Point the camera at a printed QR label to begin.</div>
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
                      {CATS[a.cat]?.emoji} {a.name}
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
                      {CATS[a.cat]?.emoji} {a.name}
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
