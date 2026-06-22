import { useState } from "react";
import { C } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";

export default function LoginPage() {
  const { requestOTP, verifyOTP, authError } = useAuth();
  const [email,  setEmail]  = useState("");
  const [step,   setStep]   = useState("email"); // "email" | "otp"
  const [code,   setCode]   = useState("");
  const [err,    setErr]    = useState("");
  const [busy,   setBusy]   = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await requestOTP(email);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setStep("otp");
  }

  async function handleVerify(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await verifyOTP(email, code);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    // on success, AuthContext resolves profile → App re-renders to main UI
  }

  // Show context-level auth error (e.g. "no account found") after OTP verified
  const displayErr = err || authError;

  return (
    <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:C.bg, fontFamily:"'Archivo',sans-serif", color:C.tx, padding:16 }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <img src="/logo.svg" alt="Unico" style={{ width:72, height:72, borderRadius:18, marginBottom:12 }} />
          <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:800, fontSize:20, color:C.tx, letterSpacing:"0.03em" }}>UNICO</div>
          <div style={{ fontSize:11, color:C.mu, letterSpacing:"0.16em", textTransform:"uppercase", marginTop:2 }}>Asset Intelligence System</div>
        </div>

        <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, padding:28 }}>
          <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:700, fontSize:18, marginBottom:4 }}>
            {step === "email" ? "Sign in" : "Check your email"}
          </div>
          <div style={{ fontSize:13, color:C.mu, marginBottom:22 }}>
            {step === "email"
              ? "Enter your work email to receive a one-time password."
              : `We sent a 6-digit code to ${email}`}
          </div>

          {step === "email" ? (
            <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Email address</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
              </div>
              {displayErr && <div style={{ fontSize:13, color:C.err }}>{displayErr}</div>}
              <button type="submit" disabled={busy} style={{ background:C.ac, color:C.acTx, border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Archivo',sans-serif", transition:"opacity 0.15s", opacity:busy?0.6:1 }}>
                {busy ? "Sending…" : "Send OTP →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>One-time password</div>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g,""))}
                  placeholder="000000" required autoFocus
                  style={{ textAlign:"center", fontSize:26, letterSpacing:"0.3em", fontFamily:"'Noto Sans Mono',monospace" }}
                />
              </div>
              {displayErr && <div style={{ fontSize:13, color:C.err }}>{displayErr}</div>}
              <button type="submit" disabled={busy} style={{ background:C.ac, color:C.acTx, border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Archivo',sans-serif", opacity:busy?0.6:1 }}>
                {busy ? "Verifying…" : "Verify & Sign In →"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setErr(""); setCode(""); }}
                style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:13, fontFamily:"'Archivo',sans-serif" }}>
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:C.mu }}>
          Check your spam folder if the code doesn't arrive within a minute.
        </div>
      </div>
    </div>
  );
}
