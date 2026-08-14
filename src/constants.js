// ─── Asset Categories ────────────────────────────────────────────────────────
export const CATS = {
  computing:   { label:"Computing",            px:"CPT", rate:0.40, emoji:"💻" },
  peripherals: { label:"Peripherals",           px:"PRP", rate:0.40, emoji:"🖱️" },
  storage:     { label:"Storage",               px:"STG", rate:0.40, emoji:"💾" },
  cables:      { label:"Cables & Connectivity", px:"CBL", rate:0.15, emoji:"🔌" },
  studio:      { label:"Studio Equipment",      px:"STU", rate:0.15, emoji:"🎬" },
  networking:  { label:"Networking & Power",    px:"NET", rate:0.15, emoji:"📡" },
};

// ─── Category-specific spec fields ───────────────────────────────────────────
export const SPEC_DEF = {
  computing:   [["cpu","Processor"],["ram","RAM"],["storage","Storage"],["os","OS"],["screen","Screen Size"],["gpu","Graphics Card"]],
  peripherals: [["iface","Interface"],["dpi","DPI"],["conn","Connectivity"]],
  storage:     [["cap","Capacity"],["iface","Interface"],["rspd","Read Speed"],["wspd","Write Speed"],["ff","Form Factor"]],
  cables:      [["ct","Cable Type"],["len","Length"],["spd","Speed Rating"],["ca","Connector A"],["cb","Connector B"]],
  studio:      [["watt","Wattage"],["ct","Color Temp"],["mnt","Mount Type"],["beam","Beam Angle"]],
  networking:  [["ports","Ports"],["spd","Network Speed"],["wifi","WiFi Standard"],["ff","Form Factor"]],
};

// ─── Asset status config ──────────────────────────────────────────────────────
export const ST_CFG = {
  active:    { l:"Active",     c:"#10B981", bg:"#10B98115" },
  in_use:    { l:"In Use",     c:"#FBBF24", bg:"#FBBF2415" },
  in_repair: { l:"In Repair",  c:"#FB923C", bg:"#FB923C15" },
  retired:   { l:"Retired",    c:"#64748B", bg:"#64748B15" },
  lost:      { l:"Lost",       c:"#EF4444", bg:"#EF444415" },
};

// ─── Colour palette ───────────────────────────────────────────────────────────
export const C = {
  // Light theme — matches the Unico Sales / Cost Estimator dashboards.
  bg:"#F3F5F8",   // page base (a warm→cool radial glow sits on <body> in index.css)
  sf:"#FFFFFF",   // cards / surfaces
  el:"#F1F3F7",   // subtle fills: chips, hover, secondary controls
  br:"#E9ECF1",   // hairline borders
  ac:"#FFD200",   // brand yellow (fills, borders, tints)
  acTx:"#0F1115", // text/icon on a solid-yellow fill
  acD:"#A16207",  // dark gold — accent TEXT/links/icons that stay readable on light
  ac2:"#F59E0B",  // amber — secondary accent (overhead, expiring)
  ok:"#059669",   // green — success / positive
  err:"#DC2626",  // red — danger / alerts
  tx:"#0F1115",   // primary text (near-black)
  mu:"#6B7280",   // muted text
  mu2:"#9AA1AE",  // faint text / captions
  // Extras for the light system
  ink:"#0F1115",  // deep card (the dark accent summary card)
  glow:"#FFF6CC", // warm top-glow tint
  shadow:"0 1px 2px rgba(15,17,21,0.04), 0 4px 16px rgba(15,17,21,0.05)",
  shadowLg:"0 8px 30px rgba(15,17,21,0.10)",
};

// ─── Vendor categories ────────────────────────────────────────────────────────
export const VENDOR_CATS = [
  "Online Marketplace","Retail Store","Direct Brand",
  "Importer","Distributor","Service Provider","Other",
];

// ─── Payment modes ────────────────────────────────────────────────────────────
export const PAYMENT_MODES = ["Cash","Card","NEFT","UPI","Cheque","Other"];

// ─── Service log types ────────────────────────────────────────────────────────
export const SERVICE_TYPES = ["Repair","Maintenance","Replacement Part","Inspection","Software Update","Other"];

// ─── Checkout purposes ────────────────────────────────────────────────────────
export const CHECKOUT_PURPOSES = ["Office Use","Shoot","Client Visit","WFH","Repair","Event","Other"];

// ─── Disposal methods ────────────────────────────────────────────────────────
export const DISPOSAL_METHODS = [
  { v:"sold",       l:"Sold" },
  { v:"scrapped",   l:"Scrapped" },
  { v:"donated",    l:"Donated" },
  { v:"lost",       l:"Lost / Stolen" },
  { v:"written_off",l:"Written Off" },
];

// ─── Audit scope options ──────────────────────────────────────────────────────
export const AUDIT_SCOPE = [
  { v:"all",      l:"All Assets" },
  { v:"category", l:"By Category" },
  { v:"location", l:"By Location" },
];

// ─── Initial seed data ────────────────────────────────────────────────────────
export const INIT = [
  { id:"a1",  code:"UNQ-CPT-0001", name:'MacBook Pro 14" M3 Pro',           cat:"computing",   make:"Apple",      model:"MacBook Pro 14 (M3 Pro)",  serial:"C02ZK3MDMD6M", color:"Space Black", cond:"Excellent", status:"active",  loc:"Edit Desk 1",        assignTo:"Sharath D.",  pDate:"2024-01-15", vendor:"iStore Bangalore",        price:199900, wEnd:"2027-01-15", wType:"Apple Care+",  specs:{cpu:"M3 Pro",ram:"18GB",storage:"512GB SSD",os:"macOS Sonoma",screen:'14.2" Liquid Retina XDR',gpu:"18-core GPU"}, notes:"Primary editing machine." },
  { id:"a2",  code:"UNQ-CPT-0002", name:'Dell UltraSharp 27" 4K',           cat:"computing",   make:"Dell",       model:"U2723DE",                   serial:"CN0R7T3P2847", color:"Silver",      cond:"Good",      status:"active",  loc:"Edit Desk 1",        assignTo:"Sharath D.",  pDate:"2023-08-10", vendor:"Dell India Online",       price:52000,  wEnd:"2026-08-10", wType:"On-Site 3yr",  specs:{screen:'27" 4K IPS',iface:"USB-C / HDMI"}, notes:"Secondary monitor." },
  { id:"a3",  code:"UNQ-STU-0001", name:"Sony A7 IV Body",                  cat:"studio",      make:"Sony",       model:"ILCE-7M4",                  serial:"5087453",      color:"Black",       cond:"Excellent", status:"in_use", loc:"Studio Cabinet",     assignTo:"Shoot Team",  pDate:"2023-04-05", vendor:"Vijay Sales Bangalore",   price:249000, wEnd:"2025-04-05", wType:"Brand 2yr",    specs:{watt:"N/A"}, notes:"Main camera body." },
  { id:"a4",  code:"UNQ-STU-0002", name:"Aputure 600D Pro",                 cat:"studio",      make:"Aputure",    model:"LS 600D Pro",               serial:"AP60D2305088", color:"Black",       cond:"Good",      status:"active",  loc:"Studio Light Rack",  assignTo:"Common Pool", pDate:"2022-11-20", vendor:"Import via B&H Photo",    price:95000,  wEnd:"2024-11-20", wType:"Brand 2yr",    specs:{watt:"600W",ct:"5600K",mnt:"Bowens",beam:"Variable"}, notes:"Key light. Warranty expired." },
  { id:"a5",  code:"UNQ-STG-0001", name:"Samsung T7 Shield 2TB",            cat:"storage",     make:"Samsung",    model:"MU-PC2T0H/WW",              serial:"S6XSNS0T211783",color:"Blue",       cond:"Good",      status:"active",  loc:"Common Pool",        assignTo:"Common Pool", pDate:"2024-03-01", vendor:"Amazon India",            price:14500,  wEnd:"2027-03-01", wType:"Brand 3yr",    specs:{cap:"2TB",iface:"USB 3.2 Gen2",rspd:"1050MB/s",wspd:"1000MB/s",ff:"Portable SSD"}, notes:"Project backup drive." },
  { id:"a6",  code:"UNQ-PRP-0001", name:"Logitech MX Master 3S",            cat:"peripherals", make:"Logitech",   model:"MX Master 3S",              serial:"2211LZ37LJ45", color:"Graphite",    cond:"Good",      status:"active",  loc:"Edit Desk 1",        assignTo:"Sharath D.",  pDate:"2023-06-15", vendor:"Amazon India",            price:9995,   wEnd:"2025-06-15", wType:"Brand 2yr",    specs:{iface:"USB-C",dpi:"8000 DPI",conn:"Bluetooth 5"}, notes:"" },
  { id:"a7",  code:"UNQ-CBL-0001", name:"Apple Thunderbolt 4 Pro Cable 1.8m",cat:"cables",    make:"Apple",      model:"MWP02ZM/A",                 serial:"N/A",          color:"Black",       cond:"Good",      status:"active",  loc:"Edit Desk Drawer",   assignTo:"Common Pool", pDate:"2024-01-15", vendor:"iStore Bangalore",        price:8900,   wEnd:"N/A",        wType:"N/A",          specs:{ct:"Thunderbolt 4",len:"1.8m",spd:"40 Gbps",ca:"USB-C",cb:"USB-C"}, notes:"For MBP to Dell." },
  { id:"a8",  code:"UNQ-NET-0001", name:"TP-Link Deco XE75 (2-pack)",       cat:"networking",  make:"TP-Link",    model:"Deco XE75",                 serial:"2210DA004782", color:"White",       cond:"Good",      status:"active",  loc:"Router / Server",    assignTo:"Common Pool", pDate:"2023-02-28", vendor:"Amazon India",            price:18500,  wEnd:"2026-02-28", wType:"Brand 3yr",    specs:{ports:"3× Gigabit",spd:"AXE5400",wifi:"802.11ax",ff:"Mesh Unit"}, notes:"Main office mesh router." },
  { id:"a9",  code:"UNQ-STU-0003", name:"Manfrotto 055XPRO3 Tripod",        cat:"studio",      make:"Manfrotto",  model:"055XPRO3 + 498RC4",         serial:"MF2208417",    color:"Black",       cond:"Good",      status:"active",  loc:"Studio Cabinet",     assignTo:"Common Pool", pDate:"2022-06-10", vendor:"Foto Rieselfeld",         price:32000,  wEnd:"N/A",        wType:"N/A",          specs:{watt:"N/A",ct:"N/A",mnt:"Ball Head",beam:"N/A"}, notes:"Main tripod." },
  { id:"a10", code:"UNQ-PRP-0002", name:"Keychron K3 Pro Keyboard",         cat:"peripherals", make:"Keychron",   model:"K3 Pro (Brown)",            serial:"KC3P2209041",  color:"Grey",        cond:"Excellent", status:"active",  loc:"Edit Desk 1",        assignTo:"Sharath D.",  pDate:"2023-09-01", vendor:"Keychron.com",            price:7500,   wEnd:"2024-09-01", wType:"Brand 1yr",    specs:{iface:"USB-C",conn:"Bluetooth / Wired"}, notes:"75% layout." },
];
