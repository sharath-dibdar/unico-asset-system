import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { C, CATS } from "../constants.js";
import { Btn, Badge, Modal } from "../components/UI.jsx";

export default function ScanModal({ assets, checkouts, onCheckout, onReturn, onViewDetails, onClose }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const scanningRef = useRef(true);

  const [found,    setFound]    = useState(null); // matched asset
  const [error,    setError]    = useState("");
  const [scanning, setScanning] = useState(true);
  const [notFound, setNotFound] = useState("");

  useEffect(() => { scanningRef.current = scanning; }, [scanning]);

  useEffect(() => {
    let active = true;

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
          const code  = result.data.trim().toLowerCase();
          const asset = assets.find(a => a.code?.toLowerCase() === code);
          if (asset) {
            setFound(asset);
            setNotFound("");
            setScanning(false);
          } else {
            setNotFound(result.data.trim());
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

  function scanAgain() { setFound(null); setNotFound(""); setScanning(true); }

  const openCheckout = found ? checkouts.find(c => c.assetId === found.id && c.status === "out") : null;
  const canCheckOut  = found && found.status !== "in_use" && found.status !== "retired";
  const canCheckIn   = found && found.status === "in_use" && openCheckout;

  return (
    <Modal title="Scan Asset QR" sub="Point the camera at a printed QR label" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {error && (
          <div style={{ textAlign:"center", padding:"30px 10px", color:C.err, fontSize:13 }}>{error}</div>
        )}

        {!error && !found && (
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#000" }}>
            <video ref={videoRef} muted playsInline style={{ width:"100%", display:"block" }} />
            <canvas ref={canvasRef} style={{ display:"none" }} />
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ width:"58%", aspectRatio:"1", border:`2px solid ${C.ac}`, borderRadius:14, boxShadow:"0 0 0 2000px rgba(0,0,0,0.4)" }} />
            </div>
            {notFound && (
              <div style={{ position:"absolute", bottom:10, left:10, right:10, background:`${C.err}cc`, color:"#fff", fontSize:11, padding:"6px 10px", borderRadius:8, textAlign:"center" }}>
                Code "{notFound}" doesn't match any asset
              </div>
            )}
          </div>
        )}

        {found && (
          <>
            <div style={{ display:"flex", gap:14, alignItems:"center", background:C.el, borderRadius:12, padding:16 }}>
              {found.photos?.[0]
                ? <img src={found.photos[0]} alt="" style={{ width:52, height:52, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
                : <div style={{ width:52, height:52, background:C.sf, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{CATS[found.cat]?.emoji}</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{found.name}</span>
                  <Badge s={found.status} />
                </div>
                <div style={{ fontSize:12, color:C.mu, marginTop:2, fontFamily:"'Noto Sans Mono',monospace" }}>{found.code} · {found.make} {found.model}</div>
                <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>📍 {found.loc || "—"}</div>
                {found.assignTo && found.assignTo !== "Common Pool" && <div style={{ fontSize:12, color:C.tx, marginTop:2 }}>👤 With: {found.assignTo}</div>}
              </div>
            </div>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {canCheckIn  && <Btn onClick={() => onReturn(openCheckout)} variant="success" style={{ flex:1 }}>✓ Check In</Btn>}
              {canCheckOut && <Btn onClick={() => onCheckout(found)}     variant="primary" style={{ flex:1 }}>⇄ Check Out</Btn>}
              <Btn onClick={() => onViewDetails(found)} variant="secondary" style={{ flex:1 }}>View Full Details</Btn>
            </div>

            <Btn onClick={scanAgain} variant="ghost">↻ Scan Another</Btn>
          </>
        )}
      </div>
    </Modal>
  );
}
