import { useState } from "react";
import { C } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";

export default function LoginPage() {
  const { requestOTP, verifyOTP } = useAuth();
  const [email,   setEmail]  = useState("");
  const [step,    setStep]   = useState("email"); // "email" | "otp"
  const [code,    setCode]   = useState("");
  const [devCode, setDevCode] = useState("");
  const [err,     setErr]    = useState("");
  const [busy,    setBusy]   = useState(false);

  function handleRequest(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = requestOTP(email);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setDevCode(res.code);
    setStep("otp");
  }

  function handleVerify(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = verifyOTP(email, code);
    setBusy(false);
    if (!res.ok) setErr(res.error);
  }

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

          {/* Dev OTP banner */}
          {devCode && step === "otp" && (
            <div style={{ background:`${C.ac2}15`, border:`1px solid ${C.ac2}35`, borderRadius:10, padding:"11px 14px", marginBottom:18 }}>
              <div style={{ fontSize:11, color:C.mu, marginBottom:4 }}>📬 Dev mode — no email server connected</div>
              <div style={{ fontFamily:"'Noto Sans Mono',monospace", fontWeight:700, fontSize:22, color:C.ac2, letterSpacing:"0.25em" }}>{devCode}</div>
              <div style={{ fontSize:11, color:C.mu, marginTop:3 }}>Expires in 10 min. Connect an email provider to send real OTPs.</div>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:C.mu, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Email address</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
              </div>
              {err && <div style={{ fontSize:13, color:C.err }}>{err}</div>}
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
              {err && <div style={{ fontSize:13, color:C.err }}>{err}</div>}
              <button type="submit" disabled={busy} style={{ background:C.ac, color:C.acTx, border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Archivo',sans-serif", opacity:busy?0.6:1 }}>
                {busy ? "Verifying…" : "Verify & Sign In →"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setDevCode(""); setErr(""); setCode(""); }}
                style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:13, fontFamily:"'Archivo',sans-serif" }}>
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:C.mu }}>
          Default admin: <span style={{ fontFamily:"'Noto Sans Mono',monospace", color:C.ac }}>admin@unico.app</span>
        </div>
      </div>
    </div>
  );
}
