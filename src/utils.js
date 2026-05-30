import { CATS, ST_CFG } from "./constants.js";
import * as XLSX from "xlsx";

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
export const fDate = d => d && d !== "N/A" ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
export const dTo = d => (d&&d!=="N/A") ? Math.ceil((new Date(d)-new Date())/864e5) : null;
export const getFY = d => { const dt=new Date(d); return dt.getMonth()>=3?dt.getFullYear():dt.getFullYear()-1; };
export const curFY = () => { const n=new Date(); return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; };
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const nextCode = (cat,assets) => `UNQ-${CATS[cat]?.px||"MSC"}-${String(assets.filter(a=>a.cat===cat).length+1).padStart(4,"0")}`;

// ─── Depreciation (IT Act WDV) ────────────────────────────────────────────────
export function calcDep(price, pDate, rate) {
  if (!price||!pDate||!rate) return { cur:price||0, sched:[] };
  const s=getFY(pDate), e=curFY();
  let v=price; const sched=[];
  for (let fy=s; fy<=e; fy++) {
    let r=rate;
    if (fy===s && new Date(pDate).getMonth()>=9) r/=2;
    const dep=Math.round(v*r);
    sched.push({ fy:`FY ${fy}–${String(fy+1).slice(-2)}`, open:Math.round(v), dep, close:Math.round(v-dep) });
    v-=dep;
  }
  return { cur:Math.round(v), sched };
}

// ─── Asset migration (adds missing fields to old records) ─────────────────────
export function migrateAsset(a) {
  return {
    photos: [], documents: [], serviceLog: [], history: [],
    disposal: null, vendorId: null,
    poNumber:"", billNumber:"", paymentMode:"", gstAmount:0,
    amcProvider:"", amcStart:"", amcEnd:"", amcCost:0, amcNotes:"",
    insurance:{ insurer:"", policyNo:"", coverage:0, premium:0, renewalDate:"" },
    ...a,
    insurance: { insurer:"", policyNo:"", coverage:0, premium:0, renewalDate:"", ...(a.insurance||{}) },
  };
}

// ─── Image compression ────────────────────────────────────────────────────────
export function compressImage(file, maxPx=900, quality=0.78) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx/img.width, maxPx/img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width*ratio);
        canvas.height = Math.round(img.height*ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── File download helper ─────────────────────────────────────────────────────
export function downloadFile(content, filename, mime="text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV helper ───────────────────────────────────────────────────────────────
function toCSV(headers, rows) {
  return [headers, ...rows]
    .map(r => r.map(v => `"${String(v??'').replace(/"/g,"''")}"`).join(","))
    .join("\n");
}
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ─── Export: Asset Register CSV ───────────────────────────────────────────────
export function generateAssetCSV(assets) {
  const h = ["Code","Name","Category","Make","Model","Serial","Color","Condition","Status",
             "Location","Assigned To","Purchase Date","Purchase Price","Book Value",
             "Vendor","PO Number","Bill Number","Payment Mode","GST Amount",
             "Warranty End","Warranty Type","AMC Provider","AMC End",
             "Insurer","Policy No","Notes"];
  const rows = assets.map(a => {
    const dep = CATS[a.cat] ? calcDep(a.price,a.pDate,CATS[a.cat].rate) : null;
    return [a.code,a.name,CATS[a.cat]?.label||a.cat,a.make,a.model||"",a.serial||"",
            a.color||"",a.cond||"",ST_CFG[a.status]?.l||a.status,
            a.loc||"",a.assignTo||"",a.pDate||"",a.price||0,dep?.cur||0,
            a.vendor||"",a.poNumber||"",a.billNumber||"",a.paymentMode||"",a.gstAmount||0,
            a.wEnd||"",a.wType||"",a.amcProvider||"",a.amcEnd||"",
            a.insurance?.insurer||"",a.insurance?.policyNo||"",a.notes||""];
  });
  return toCSV(h, rows);
}

// ─── Export: Depreciation Schedule CSV ───────────────────────────────────────
export function generateDepCSV(assets) {
  const h = ["Asset Code","Asset Name","Category","Purchase Price","Dep Rate","FY","Opening","Depreciation","Closing"];
  const rows = [];
  assets.forEach(a => {
    const cat = CATS[a.cat]; if (!cat) return;
    calcDep(a.price,a.pDate,cat.rate).sched.forEach(s =>
      rows.push([a.code,a.name,cat.label,a.price,`${Math.round(cat.rate*100)}%`,s.fy,s.open,s.dep,s.close])
    );
  });
  return toCSV(h, rows);
}

// ─── Export: Tally Journal XML ────────────────────────────────────────────────
export function generateTallyXML(assets) {
  const vouchers = assets.filter(a=>a.price&&a.pDate).map(a => `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Journal" ACTION="Create">
          <DATE>${a.pDate.replace(/-/g,"")}</DATE>
          <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
          <NARRATION>Asset Purchase: ${esc(a.name)} [${a.code}]</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Fixed Assets - ${esc(CATS[a.cat]?.label||"General")}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${a.price}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Bank Account</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${a.price}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n  <BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>\n  <REQUESTDATA>${vouchers}\n  </REQUESTDATA></IMPORTDATA></BODY>\n</ENVELOPE>`;
}

// ─── Export: Zoho Books Fixed Assets CSV ─────────────────────────────────────
export function generateZohoCSV(assets) {
  const h = ["Asset Name","Description","Asset Account","Serial Number","Purchase Date",
             "Purchase Price","Quantity","Depreciation Method","Depreciation Percent","Warranty Expiry"];
  const rows = assets.map(a => [
    a.name, [a.make,a.model].filter(Boolean).join(" "),
    `Fixed Assets - ${CATS[a.cat]?.label||"General"}`,
    a.serial||"", a.pDate||"", a.price||0, 1,
    "Written Down Value", Math.round((CATS[a.cat]?.rate||0.15)*100),
    a.wEnd&&a.wEnd!=="N/A"?a.wEnd:"",
  ]);
  return toCSV(h, rows);
}

// ─── Export: Disposed Assets Log ─────────────────────────────────────────────
export function generateDisposalCSV(assets) {
  const disposed = assets.filter(a=>a.disposal);
  const h = ["Code","Name","Category","Purchase Price","Book Value at Disposal","Disposal Date","Method","Sale Value","Gain/Loss","Buyer","Notes"];
  const rows = disposed.map(a => {
    const dep = CATS[a.cat] ? calcDep(a.price,a.pDate,CATS[a.cat].rate) : null;
    const bv = dep?.cur||0;
    const sv = a.disposal.saleValue||0;
    return [a.code,a.name,CATS[a.cat]?.label||a.cat,a.price,bv,
            a.disposal.date,a.disposal.method,sv,sv-bv,
            a.disposal.buyer||"",a.disposal.notes||""];
  });
  return toCSV(h, rows);
}

// ─── Excel Import Template Download ──────────────────────────────────────────
export function downloadImportTemplate() {
  const headers = ["Name","Category","Make","Model","Serial Number","Color",
                   "Condition","Status","Location","Assigned To",
                   "Purchase Date","Purchase Price (INR)","Vendor",
                   "Warranty End Date","Warranty Type","Notes",
                   "PO Number","Bill Number","Payment Mode"];
  const example = ['Sony A7 IV Body','studio','Sony','ILCE-7M4','5087453','Black',
                   'Excellent','active','Studio Cabinet','Shoot Team',
                   '2023-04-05','249000','Vijay Sales',
                   '2025-04-05','Brand 2yr','Main camera body',
                   'PO-2023-001','INV-2023-456','NEFT'];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map((_,i)=>({ wch: [28,14,14,20,16,10,12,12,20,18,14,20,20,18,14,30,14,14,14][i]||14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  XLSX.writeFile(wb, "unico-import-template.xlsx");
}

// ─── Excel Import Parser ──────────────────────────────────────────────────────
const COL_MAP = {
  "name":"name","asset name":"name",
  "category":"cat",
  "make":"make","brand":"make",
  "model":"model","model number":"model",
  "serial number":"serial","serial":"serial","s/n":"serial",
  "color":"color","colour":"color",
  "condition":"cond",
  "status":"status",
  "location":"loc",
  "assigned to":"assignTo",
  "purchase date":"pDate",
  "purchase price (inr)":"price","purchase price":"price","price":"price","cost":"price",
  "vendor":"vendor","supplier":"vendor",
  "warranty end date":"wEnd","warranty end":"wEnd",
  "warranty type":"wType",
  "notes":"notes",
  "po number":"poNumber",
  "bill number":"billNumber",
  "payment mode":"paymentMode",
};

const CAT_ALIASES = {
  computing:["computing","computer","laptop","desktop","monitor","macbook"],
  peripherals:["peripheral","peripherals","keyboard","mouse","webcam","headphone","drawing tablet"],
  storage:["storage","hard disk","ssd","hdd","external drive","usb drive","nas"],
  cables:["cable","cables","cables & connectivity","connectivity","hdmi","usb-c","thunderbolt"],
  studio:["studio","studio equipment","camera","light","tripod","gimbal"],
  networking:["networking","networking & power","router","switch","ups","wifi"],
};

function normalizeCategory(raw) {
  const s = String(raw||"").toLowerCase().trim();
  for (const [key, aliases] of Object.entries(CAT_ALIASES)) {
    if (aliases.some(a => s.includes(a))) return key;
  }
  return s;
}

function normalizeDate(val) {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return s;
}

export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type:"array", cellDates:true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval:"" });
        const parsed = rawRows.map((row, idx) => {
          const asset = {};
          for (const [col, val] of Object.entries(row)) {
            const field = COL_MAP[col.toLowerCase().trim()];
            if (field) asset[field] = val;
          }
          // normalize
          if (asset.cat) asset.cat = normalizeCategory(asset.cat);
          if (asset.pDate) asset.pDate = normalizeDate(asset.pDate);
          if (asset.wEnd) asset.wEnd = normalizeDate(asset.wEnd) || "N/A";
          if (asset.price) asset.price = Number(String(asset.price).replace(/[^0-9.]/g,""))||0;
          if (!asset.status) asset.status = "active";
          if (!asset.cond) asset.cond = "Good";
          // validation
          const errors = [];
          if (!asset.name) errors.push("Name required");
          if (!CATS[asset.cat]) errors.push(`Unknown category: "${asset.cat}"`);
          if (!asset.make) errors.push("Make required");
          if (!asset.pDate) errors.push("Purchase Date required");
          if (!asset.price) errors.push("Purchase Price required");
          return { ...asset, _row: idx+2, _errors: errors, _valid: errors.length===0 };
        }).filter(r => Object.keys(r).length > 3); // skip empty rows
        resolve(parsed);
      } catch(err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
