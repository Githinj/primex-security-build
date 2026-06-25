import React, { useState } from "react";
import {
  Shield, AlertTriangle, Camera, MapPin, Bell, Users, ChevronRight,
  Search, Filter, Plus, Check, Clock, Radio, Navigation, CheckCircle2, Circle,
  Eye, Settings, Phone, FileText, X, Send, Upload, ArrowRight, ArrowLeft,
  Wifi, WifiOff, Wrench, Home, LayoutDashboard, Briefcase, ClipboardList,
  BarChart3, ChevronDown, Pencil, ArrowUpRight, Building, User as UserIcon,
  Download, Mail, MessageSquare, Lock, CreditCard, Sparkles, Zap, Cpu, Video,
  Calendar, HelpCircle, BookOpen, ExternalLink, Play, Cctv, Activity,
  MoreHorizontal, Power, Trash2, UserPlus, Ban, Store, AlertCircle,
} from "lucide-react";

/* ============================================================
   PRIMEX SECURITY SYSTEM
   Editorial-Enterprise · Stripe × The Economist
   All tabs functional · Landing matches screenshots
   Scope dropdown: Super-Admin only · No auth buttons inside app
   ============================================================ */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&display=swap');
`;

const T = {
  bg: "#F8FAFC", surface: "#FFFFFF", surfaceSubtle: "#F1F5F9",
  navy: "#0B1220", navyDarker: "#060B14", navyTile: "#111A2E",
  border: "#E2E8F0", borderStrong: "#CBD5E1",
  ink: "#0F172A", ink2: "#334155", ink3: "#64748B", ink4: "#94A3B8",
  blue: "#1E5BFF", blueHover: "#1747CC", blueSoft: "#EEF3FF", blueSofter: "#F5F8FF",
  red: "#DC2626", redSoft: "#FEE2E2",
  amber: "#D97706", amberSoft: "#FEF3C7",
  green: "#16A34A", greenSoft: "#DCFCE7",
  gray: "#64748B", graySoft: "#F1F5F9",
};

const sans = "Inter, -apple-system, system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";

// ---------------- mock data ----------------
const COMPANIES = [
  { id: "c1", name: "Sunset Liquor Group", type: "Retail", sites: 4, users: 9, status: "Active" },
  { id: "c2", name: "Northgate Security Co.", type: "Security Firm", sites: 12, users: 24, status: "Active" },
  { id: "c3", name: "Verde Markets", type: "Grocery", sites: 7, users: 14, status: "Active" },
  { id: "c4", name: "Atlas Logistics", type: "Warehouse", sites: 3, users: 6, status: "Pending" },
];

const SITES = [
  { id: "s1", companyId: "c1", name: "Sunset Liquor — Main St", type: "Store", address: "412 Main St, Brooklyn NY", risk: "Medium", status: "Active", cameras: 6 },
  { id: "s2", companyId: "c1", name: "Sunset Liquor — Bay Ridge", type: "Store", address: "88 5th Ave, Brooklyn NY", risk: "High", status: "Active", cameras: 8 },
  { id: "s3", companyId: "c1", name: "Sunset Liquor — Astoria", type: "Store", address: "31-15 Steinway, Queens NY", risk: "Low", status: "Active", cameras: 4 },
  { id: "s4", companyId: "c2", name: "Northgate HQ", type: "Office", address: "200 Broadway, NYC", risk: "Low", status: "Active", cameras: 12 },
  { id: "s5", companyId: "c3", name: "Verde — Park Slope", type: "Store", address: "655 7th Ave, Brooklyn NY", risk: "Medium", status: "Active", cameras: 10 },
  { id: "s6", companyId: "c3", name: "Verde — Williamsburg", type: "Store", address: "240 Bedford Ave, Brooklyn NY", risk: "Medium", status: "Maintenance", cameras: 9 },
];

const CAMERAS = [
  { id: "cam1", siteId: "s2", name: "Front Entrance", location: "Main door, interior", status: "Online", lastChecked: "2m ago", warning: null },
  { id: "cam2", siteId: "s2", name: "Cashier 1", location: "Register area", status: "Online", lastChecked: "1m ago", warning: null },
  { id: "cam3", siteId: "s2", name: "Beer Aisle", location: "Aisle 3, refrigerated", status: "Online", lastChecked: "3m ago", warning: null },
  { id: "cam4", siteId: "s2", name: "Back Storage", location: "Stockroom", status: "Offline", lastChecked: "47m ago", warning: "Signal lost · last frame 09:07" },
  { id: "cam5", siteId: "s2", name: "Parking Lot", location: "Exterior north", status: "Online", lastChecked: "1m ago", warning: null },
  { id: "cam6", siteId: "s2", name: "Loading Dock", location: "Exterior rear", status: "Maintenance", lastChecked: "2h ago", warning: "Scheduled maintenance window" },
  { id: "cam7", siteId: "s2", name: "Aisle 5 — Spirits", location: "High-value aisle", status: "Online", lastChecked: "2m ago", warning: null },
  { id: "cam8", siteId: "s2", name: "Restroom Hallway", location: "Interior corridor", status: "Unknown", lastChecked: "—", warning: "Configuration incomplete" },
];

const GUARDS = [
  { id: "g1", name: "Marcus Ellis", status: "Available", zone: "Bay Ridge zone", phone: "+1 (555) 204-9981", shifts: "Mon-Fri 6PM-2AM" },
  { id: "g2", name: "Diana Okafor", status: "On Incident", zone: "Main St zone", phone: "+1 (555) 318-2244", shifts: "Tue-Sat 2PM-10PM" },
  { id: "g3", name: "Rafael Cruz", status: "Available", zone: "Astoria zone", phone: "+1 (555) 661-7702", shifts: "Wed-Sun 10PM-6AM" },
  { id: "g4", name: "Priya Anand", status: "Off-duty", zone: "—", phone: "+1 (555) 442-1190", shifts: "Mon-Thu 8AM-4PM" },
];

const ALERTS = [
  { id: "a1", title: "Suspicious activity — Spirits aisle", siteId: "s2", cameraId: "cam7", severity: "Critical", status: "New", createdAt: "Just now", description: "Subject lingering near high-value shelf, appears to be concealing items. Repeated visits over 8 minutes.", source: "Manual — Dispatcher" },
  { id: "a2", title: "Camera offline — Back Storage", siteId: "s2", cameraId: "cam4", severity: "Warning", status: "Reviewing", createdAt: "12m ago", description: "Back Storage feed dropped. Last frame at 09:07 AM.", source: "System" },
  { id: "a3", title: "Door propped open", siteId: "s1", cameraId: null, severity: "Warning", status: "New", createdAt: "4m ago", description: "Rear loading door reported open by night staff.", source: "Guard report" },
  { id: "a4", title: "Glass break — front window", siteId: "s5", cameraId: null, severity: "Critical", status: "Escalated", createdAt: "22m ago", description: "Audio anomaly flagged near front window.", source: "AI" },
  { id: "a5", title: "After-hours motion", siteId: "s4", cameraId: null, severity: "Info", status: "Closed", createdAt: "1h ago", description: "Motion detected at HQ lobby — verified cleaning crew.", source: "Camera monitoring" },
  { id: "a6", title: "Unauthorized rear access attempt", siteId: "s2", cameraId: null, severity: "Critical", status: "Closed", createdAt: "Yesterday", description: "Failed entry attempt at rear door, deterred.", source: "Camera monitoring" },
];

const INCIDENTS = [
  { id: "i1", title: "Possible shoplifting — Spirits aisle", siteId: "s2", alertId: "a1", severity: "Critical", status: "In Progress", guardId: "g2", startedAt: "9:51 AM", notes: "Subject described: M, 30s, navy hoodie. Approaching from rear entrance." },
  { id: "i2", title: "Glass break investigation", siteId: "s5", alertId: "a4", severity: "Critical", status: "Dispatched", guardId: "g3", startedAt: "9:32 AM", notes: "Mobile patrol en route. ETA 6 min." },
  { id: "i3", title: "Camera maintenance check", siteId: "s2", alertId: "a2", severity: "Warning", status: "Open", guardId: null, startedAt: "9:42 AM", notes: "Awaiting technician assignment." },
  { id: "i4", title: "After-hours motion — resolved", siteId: "s4", alertId: "a5", severity: "Info", status: "Resolved", guardId: "g1", startedAt: "8:54 AM", notes: "Verified authorized cleaning. Logged and closed." },
  { id: "i5", title: "Rear door breach — deterred", siteId: "s2", alertId: "a6", severity: "Critical", status: "Closed", guardId: "g1", startedAt: "Yesterday 11:42 PM", notes: "Subject fled when motion-triggered light activated. NYPD notified." },
];

const ACTIVITY = [
  { who: "Diana Okafor", what: "Created alert", target: "Suspicious activity — Spirits aisle", when: "Just now", icon: Bell, tone: "red" },
  { who: "Diana Okafor", what: "Dispatched guard", target: "Marcus Ellis → Incident #i1", when: "2m ago", icon: Radio, tone: "blue" },
  { who: "System", what: "Camera went offline", target: "Back Storage (cam4)", when: "12m ago", icon: WifiOff, tone: "amber" },
  { who: "Marcus Ellis", what: "Marked en route", target: "Incident #i1", when: "4m ago", icon: Navigation, tone: "blue" },
  { who: "Rafael Cruz", what: "Resolved incident", target: "After-hours motion — Northgate HQ", when: "1h ago", icon: CheckCircle2, tone: "green" },
  { who: "Amar Zindani", what: "Added new site", target: "Sunset Liquor — Astoria", when: "2h ago", icon: Plus, tone: "gray" },
  { who: "Diana Okafor", what: "Closed alert", target: "False alarm — parking lot", when: "3h ago", icon: X, tone: "gray" },
  { who: "Priya Anand", what: "Started shift", target: "Mon 8AM-4PM rotation", when: "Earlier today", icon: UserIcon, tone: "blue" },
  { who: "System", what: "Generated monthly report", target: "April 2026 — Sunset Liquor", when: "Yesterday", icon: FileText, tone: "gray" },
  { who: "Amar Zindani", what: "Updated user role", target: "Diana Okafor → Dispatcher", when: "2 days ago", icon: Settings, tone: "gray" },
];

const REPORTS = [
  { id: "r1", name: "April 2026 — Monthly Summary", company: "Sunset Liquor Group", date: "May 1, 2026", type: "Monthly", incidents: 12, size: "1.4 MB" },
  { id: "r2", name: "Q1 2026 — Response Time Analysis", company: "All companies", date: "Apr 4, 2026", type: "Quarterly", incidents: 38, size: "3.2 MB" },
  { id: "r3", name: "March 2026 — Monthly Summary", company: "Sunset Liquor Group", date: "Apr 1, 2026", type: "Monthly", incidents: 9, size: "1.1 MB" },
  { id: "r4", name: "Bay Ridge — Site Activity Report", company: "Sunset Liquor Group", date: "Mar 22, 2026", type: "Site-level", incidents: 14, size: "890 KB" },
  { id: "r5", name: "February 2026 — Monthly Summary", company: "Sunset Liquor Group", date: "Mar 1, 2026", type: "Monthly", incidents: 11, size: "1.2 MB" },
];

const TEAM = [
  { name: "Amar Zindani", role: "Company Manager", email: "amar@sunsetliquor.com", lastActive: "Now", status: "Active" },
  { name: "Diana Okafor", role: "Dispatcher", email: "diana@sunsetliquor.com", lastActive: "Now", status: "Active" },
  { name: "Marcus Ellis", role: "Guard", email: "marcus@sunsetliquor.com", lastActive: "2m ago", status: "Active" },
  { name: "Rafael Cruz", role: "Guard", email: "rafael@sunsetliquor.com", lastActive: "8m ago", status: "Active" },
  { name: "Priya Anand", role: "Guard", email: "priya@sunsetliquor.com", lastActive: "Today", status: "Active" },
  { name: "Sam Liu", role: "Site Manager", email: "sam@sunsetliquor.com", lastActive: "Yesterday", status: "Active" },
  { name: "Robin Park", role: "Dispatcher", email: "robin@sunsetliquor.com", lastActive: "3 days ago", status: "Inactive" },
];

const ROLES_PERMS = [
  { role: "Super Admin", count: 1, perms: "Full platform access · all companies" },
  { role: "Company Manager", count: 4, perms: "Own company only · users, sites, settings" },
  { role: "Dispatcher", count: 6, perms: "Alerts, incidents, dispatch for assigned companies" },
  { role: "Guard / Responder", count: 23, perms: "Own assignments only · mobile-focused" },
  { role: "Business Client", count: 12, perms: "Own site, alerts, reports — read-only" },
];

const ROLES = [
  { id: "landing", label: "Landing" },
  { id: "login", label: "Sign in" },
  { id: "admin", label: "Super Admin" },
  { id: "dispatcher", label: "Dispatcher" },
  { id: "guard", label: "Guard (mobile)" },
  { id: "company", label: "Company Manager" },
  { id: "client", label: "Business Client" },
];

// =========================================================
// PRIMITIVES
// =========================================================
function Pill({ tone = "gray", children, dot = true, size = "md" }) {
  const map = {
    red: { fg: T.red, bg: T.redSoft }, amber: { fg: T.amber, bg: T.amberSoft },
    green: { fg: T.green, bg: T.greenSoft }, blue: { fg: T.blue, bg: T.blueSoft },
    gray: { fg: T.gray, bg: T.graySoft }, navy: { fg: "#fff", bg: T.navy },
  };
  const c = map[tone];
  const s = size === "sm"
    ? { padding: "2px 8px", fontSize: 11, gap: 5, dotSize: 5 }
    : { padding: "3px 10px", fontSize: 11.5, gap: 6, dotSize: 6 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: s.gap,
      padding: s.padding, borderRadius: 999, fontSize: s.fontSize,
      fontWeight: 500, fontFamily: sans, color: c.fg, background: c.bg,
      letterSpacing: 0.1,
    }}>
      {dot && <span style={{ width: s.dotSize, height: s.dotSize, borderRadius: 999, background: c.fg }} />}
      {children}
    </span>
  );
}

function PhaseTag({ children = "Phase 2" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 999, fontSize: 10,
      fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
      color: T.blue, background: T.blueSoft, fontFamily: sans,
      border: `1px solid ${T.blueSoft}`,
    }}>
      <Sparkles size={9} />
      {children}
    </span>
  );
}

const sevTone = (s) => s === "Critical" ? "red" : s === "Warning" ? "amber" : s === "Info" ? "blue" : "gray";
const incTone = (s) => ["Resolved", "Closed"].includes(s) ? "green" : ["In Progress", "Dispatched"].includes(s) ? "amber" : "gray";
const camTone = (s) => s === "Online" ? "green" : s === "Offline" ? "red" : s === "Maintenance" ? "amber" : "gray";

function Btn({ children, variant = "primary", icon: Icon, onClick, full, size = "md", style: extra }) {
  const sizes = {
    sm: { padding: "6px 11px", fontSize: 12.5, iconSize: 13 },
    md: { padding: "9px 15px", fontSize: 13.5, iconSize: 14 },
    lg: { padding: "12px 22px", fontSize: 14, iconSize: 15 },
  };
  const variants = {
    primary:   { bg: T.blue, fg: "#fff", border: T.blue },
    secondary: { bg: T.surface, fg: T.ink, border: T.border },
    ghost:     { bg: "transparent", fg: T.ink2, border: "transparent" },
    dark:      { bg: T.navy, fg: "#fff", border: T.navy },
    danger:    { bg: T.red, fg: "#fff", border: T.red },
    link:      { bg: "transparent", fg: T.blue, border: "transparent" },
    outlineWhite: { bg: "transparent", fg: "#fff", border: "#fff" },
  };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      borderRadius: 8, fontWeight: 500, cursor: "pointer",
      fontFamily: sans, padding: s.padding, fontSize: s.fontSize,
      width: full ? "100%" : "auto",
      transition: "background .15s, transform .08s",
      ...extra,
    }}
    onMouseEnter={e => { if (variant === "primary") e.currentTarget.style.background = T.blueHover; }}
    onMouseLeave={e => { if (variant === "primary") e.currentTarget.style.background = T.blue; }}>
      {Icon && <Icon size={s.iconSize} />}
      {children}
    </button>
  );
}

function Card({ children, padding = 20, style }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 12, padding, ...style,
    }}>{children}</div>
  );
}

function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: T.ink3, fontWeight: 600,
      letterSpacing: 1.2, textTransform: "uppercase",
      fontFamily: sans, ...style,
    }}>{children}</div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.ink3, fontFamily: sans }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={13} color={T.ink4} />}
          <span style={{ color: i === items.length - 1 ? T.ink : T.ink3, fontWeight: i === items.length - 1 ? 500 : 400 }}>{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function PageTitle({ title, sub, actions, phaseTag }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontFamily: serif, fontSize: 36, color: T.ink, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.15, margin: 0 }}>{title}</h1>
          {phaseTag && <PhaseTag>{phaseTag}</PhaseTag>}
        </div>
        {sub && <div style={{ fontSize: 14, color: T.ink3, marginTop: 8, fontFamily: sans, maxWidth: 720, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, supporting, accent }) {
  return (
    <Card padding={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <Label>{label}</Label>
        {Icon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blueSofter, display: "grid", placeItems: "center" }}>
            <Icon size={15} color={T.blue} />
          </div>
        )}
      </div>
      <div style={{ fontFamily: serif, fontSize: 42, color: accent || T.ink, fontWeight: 600, lineHeight: 1, marginTop: 14, letterSpacing: -1 }}>{value}</div>
      {supporting && <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>{supporting}</div>}
    </Card>
  );
}

function LiveDot({ color = T.red }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: color, opacity: 0.4, animation: "ping 1.4s cubic-bezier(0,0,.2,1) infinite" }} />
      <span style={{ position: "relative", borderRadius: 999, width: 8, height: 8, background: color }} />
    </span>
  );
}

function DataTable({ columns, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: sans, fontSize: 13 }}>
      <thead>
        <tr style={{ background: T.bg }}>
          {columns.map((c, i) => (
            <th key={i} style={{
              padding: "11px 22px", textAlign: i === columns.length - 1 ? "right" : "left",
              fontSize: 10.5, fontWeight: 600, color: T.ink3, letterSpacing: 1.2,
              textTransform: "uppercase", borderBottom: `1px solid ${T.border}`,
            }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "14px 22px", textAlign: j === row.length - 1 ? "right" : "left", verticalAlign: "middle" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Decorative fallback (used in tables without configured actions)
function RowActions() {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      {[Eye, Pencil, X].map((Icon, i) => (
        <button key={i} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: T.ink3 }}><Icon size={13} /></button>
      ))}
    </div>
  );
}

// =========================================================
// ACTION MENU — kebab dropdown for row-level actions
// =========================================================
function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{
        width: 28, height: 28, borderRadius: 6, border: `1px solid ${open ? T.border : "transparent"}`,
        background: open ? T.surface : "transparent", cursor: "pointer",
        display: "grid", placeItems: "center", color: T.ink2,
      }}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4,
            minWidth: 180, background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: 4, zIndex: 101,
            boxShadow: "0 12px 32px -8px rgba(11,18,32,0.18)",
            textAlign: "left",
          }}>
            {actions.map((a, i) => {
              if (a.divider) return <div key={i} style={{ height: 1, background: T.border, margin: "4px 0" }} />;
              const Icon = a.icon;
              const danger = a.tone === "danger";
              return (
                <button key={i} onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick && a.onClick(); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 11px", border: "none", borderRadius: 6,
                  background: "transparent", cursor: "pointer", textAlign: "left",
                  fontSize: 12.5, color: danger ? T.red : T.ink2, fontFamily: sans, fontWeight: 500,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = danger ? T.redSoft : T.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  {Icon && <Icon size={13} color={danger ? T.red : T.ink3} />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// =========================================================
// FORM PRIMITIVES — for modal forms
// =========================================================
function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: T.ink2, fontWeight: 600, display: "block", marginBottom: 6 }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.ink4, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function TextInput(props) {
  return (
    <input {...props} style={{
      width: "100%", padding: "9px 12px", borderRadius: 8,
      border: `1px solid ${T.border}`, background: T.surface,
      fontSize: 13.5, fontFamily: sans, color: T.ink, outline: "none",
      ...(props.style || {}),
    }} onFocus={(e) => e.target.style.borderColor = T.blue}
       onBlur={(e) => e.target.style.borderColor = T.border} />
  );
}

function TextArea(props) {
  return (
    <textarea {...props} style={{
      width: "100%", padding: "9px 12px", borderRadius: 8,
      border: `1px solid ${T.border}`, background: T.surface, minHeight: 70,
      fontSize: 13.5, fontFamily: sans, color: T.ink, outline: "none", resize: "vertical",
      ...(props.style || {}),
    }} onFocus={(e) => e.target.style.borderColor = T.blue}
       onBlur={(e) => e.target.style.borderColor = T.border} />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} style={{
        width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8,
        border: `1px solid ${T.border}`, background: T.surface,
        fontSize: 13.5, fontFamily: sans, color: value ? T.ink : T.ink4, outline: "none",
        appearance: "none", cursor: "pointer",
      }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} color={T.ink3} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

// =========================================================
// MODAL WRAPPER
// =========================================================
function Modal({ open, onClose, children, width = 540 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,18,32,0.42)",
      display: "grid", placeItems: "center", padding: 24, zIndex: 200,
      backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "auto", border: `1px solid ${T.border}`,
        fontFamily: sans, boxShadow: "0 24px 64px -16px rgba(11,18,32,0.28)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, onClose, eyebrow }) {
  return (
    <div style={{ padding: "26px 28px 18px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          {eyebrow && <Label style={{ marginBottom: 6 }}>{eyebrow}</Label>}
          <h2 style={{ fontFamily: serif, fontSize: 24, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: 0, lineHeight: 1.2 }}>{title}</h2>
          {sub && <div style={{ fontSize: 13, color: T.ink3, marginTop: 8, lineHeight: 1.55 }}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: T.bg, cursor: "pointer", display: "grid", placeItems: "center", color: T.ink2, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function ModalBody({ children }) {
  return <div style={{ padding: "22px 28px" }}>{children}</div>;
}

function ModalFooter({ children }) {
  return (
    <div style={{ padding: "16px 28px", borderTop: `1px solid ${T.border}`, background: T.bg, display: "flex", justifyContent: "flex-end", gap: 10 }}>
      {children}
    </div>
  );
}

function SuccessState({ title, sub, onClose }) {
  return (
    <div style={{ padding: "40px 28px", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 999, background: T.greenSoft, display: "grid", placeItems: "center", margin: "0 auto" }}>
        <CheckCircle2 size={30} color={T.green} />
      </div>
      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: "16px 0 6px" }}>{title}</h2>
      <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.55, maxWidth: 360, margin: "0 auto" }}>{sub}</div>
      <Btn onClick={onClose} style={{ marginTop: 18 }}>Done</Btn>
    </div>
  );
}

function InfoBox({ children, tone = "blue" }) {
  const tones = {
    blue: { bg: T.blueSoft, fg: T.blue },
    amber: { bg: T.amberSoft, fg: T.amber },
    green: { bg: T.greenSoft, fg: T.green },
  };
  const c = tones[tone];
  return (
    <div style={{
      padding: "10px 12px", background: c.bg, borderRadius: 8,
      fontSize: 12.5, color: c.fg, lineHeight: 1.55, fontWeight: 500,
      display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

// =========================================================
// INVITE COMPANY MODAL (Super Admin)
// =========================================================
function InviteCompanyModal({ open, onClose }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Retail", contactName: "", contactEmail: "", plan: "Professional" });
  const handleClose = () => { setDone(false); setForm({ name: "", type: "Retail", contactName: "", contactEmail: "", plan: "Professional" }); onClose(); };
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState
          title="Invite sent."
          sub={<>An invitation email has been sent to <strong style={{ color: T.ink }}>{form.contactEmail}</strong>. They'll set up their password and configure their first site.</>}
          onClose={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Super Admin · Invite"
            title="Invite a new company"
            sub="Add a new tenant. They'll receive an email invitation to join Primex and set up their organization."
            onClose={handleClose}
          />
          <ModalBody>
            <Field label="Company name" required>
              <TextInput placeholder="e.g. Sunset Liquor Group" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </Field>
            <Field label="Company type" required>
              <Select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
                options={[
                  {value: "Retail", label: "Retail"}, {value: "Security Firm", label: "Security Firm"},
                  {value: "Grocery", label: "Grocery"}, {value: "Warehouse", label: "Warehouse"},
                  {value: "Office", label: "Office"}, {value: "Other", label: "Other"},
                ]} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Primary contact name" required>
                <TextInput placeholder="e.g. Amar Zindani" value={form.contactName} onChange={(e) => setForm({...form, contactName: e.target.value})} />
              </Field>
              <Field label="Contact email" required hint="Invitation will be sent here">
                <TextInput type="email" placeholder="owner@company.com" value={form.contactEmail} onChange={(e) => setForm({...form, contactEmail: e.target.value})} />
              </Field>
            </div>
            <Field label="Initial plan">
              <Select value={form.plan} onChange={(e) => setForm({...form, plan: e.target.value})}
                options={[
                  {value: "Starter", label: "Starter — up to 3 sites"},
                  {value: "Professional", label: "Professional — up to 25 sites"},
                  {value: "Enterprise", label: "Enterprise — unlimited"},
                ]} />
            </Field>
            <InfoBox>The contact will receive an email with a secure link to set their password, configure 2FA, and create their first site.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn icon={Send} onClick={() => setDone(true)}>Send invitation</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// COMPANY DETAILS MODAL (View + Edit) — Super Admin
// =========================================================
function CompanyDetailsModal({ open, onClose, company, mode = "view" }) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [done, setDone] = useState(false);
  if (!company) return null;
  const handleClose = () => { setEditMode(mode === "edit"); setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState title="Saved." sub="Company details updated." onClose={handleClose} />
      ) : (
        <>
          <ModalHeader
            eyebrow={editMode ? "Edit company" : "Company details"}
            title={company.name}
            sub={editMode ? "Update tenant information. Changes apply immediately." : null}
            onClose={handleClose}
          />
          <ModalBody>
            {editMode ? (
              <>
                <Field label="Company name" required><TextInput defaultValue={company.name} /></Field>
                <Field label="Company type" required>
                  <Select value={company.type} onChange={() => {}}
                    options={[{value: company.type, label: company.type}, {value: "Retail", label: "Retail"}, {value: "Security Firm", label: "Security Firm"}, {value: "Grocery", label: "Grocery"}, {value: "Warehouse", label: "Warehouse"}]} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Primary contact"><TextInput defaultValue="Amar Zindani" /></Field>
                  <Field label="Contact email"><TextInput defaultValue="owner@company.com" /></Field>
                </div>
                <Field label="Plan">
                  <Select value="Professional" onChange={() => {}}
                    options={[{value: "Starter", label: "Starter"}, {value: "Professional", label: "Professional"}, {value: "Enterprise", label: "Enterprise"}]} />
                </Field>
              </>
            ) : (
              <>
                <KV k="Name" v={company.name} />
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Type" v={company.type} /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Sites" v={`${company.sites} active`} /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Users" v={company.users} /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Status" v={<Pill tone={company.status === "Active" ? "green" : "amber"}>{company.status}</Pill>} /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Primary contact" v="Amar Zindani" /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Contact email" v="owner@company.com" /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Plan" v="Professional" /></div>
                <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Joined" v="Jan 4, 2026" /></div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Close</Btn>
            {editMode ? (
              <Btn onClick={() => setDone(true)}>Save changes</Btn>
            ) : (
              <Btn icon={Pencil} onClick={() => setEditMode(true)}>Edit</Btn>
            )}
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// SUSPEND COMPANY CONFIRM
// =========================================================
function SuspendCompanyModal({ open, onClose, company }) {
  const [done, setDone] = useState(false);
  if (!company) return null;
  const isSuspended = company.status === "Suspended";
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title={isSuspended ? "Company restored." : "Company suspended."}
          sub={isSuspended ? `${company.name} now has access again.` : `${company.name} can no longer log in. All data is preserved.`}
          onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Super Admin · Confirm"
            title={isSuspended ? `Restore ${company.name}?` : `Suspend ${company.name}?`}
            onClose={handleClose} />
          <ModalBody>
            <InfoBox tone={isSuspended ? "green" : "amber"}>
              {isSuspended
                ? "Users will regain access immediately. Cameras and alerts will resume normal operation."
                : "All users of this company will lose access. Alerts and incidents stop generating. No data is deleted — you can restore at any time."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant={isSuspended ? "primary" : "danger"} icon={isSuspended ? Power : Ban} onClick={() => setDone(true)}>
              {isSuspended ? "Restore access" : "Suspend company"}
            </Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// ADD SITE MODAL — admin (any company) or company manager (locked)
// =========================================================
function AddSiteModal({ open, onClose, lockedCompany }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    company: lockedCompany?.id || "",
    name: "", type: "Store", address: "", risk: "Medium",
    clientName: "", clientEmail: "",
  });
  const handleClose = () => { setDone(false); setForm({ company: lockedCompany?.id || "", name: "", type: "Store", address: "", risk: "Medium", clientName: "", clientEmail: "" }); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={620}>
      {done ? (
        <SuccessState
          title="Site created."
          sub={<>{form.name} is live. An invitation has been sent to <strong style={{ color: T.ink }}>{form.clientEmail}</strong> so the business owner can access their portal.</>}
          onClose={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow={lockedCompany ? "Company Manager · New site" : "Super Admin · New site"}
            title="Add a new site"
            sub={lockedCompany ? `New site under ${lockedCompany.name}.` : "Create a site under any company and invite the on-site business owner."}
            onClose={handleClose}
          />
          <ModalBody>
            {!lockedCompany && (
              <Field label="Company" required>
                <Select value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="Select a company"
                  options={COMPANIES.map(c => ({ value: c.id, label: c.name }))} />
              </Field>
            )}
            {lockedCompany && (
              <div style={{ marginBottom: 14, padding: "10px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <Building size={14} color={T.ink3} />
                <span style={{ fontSize: 13, color: T.ink2 }}>Adding site to <strong style={{ color: T.ink, fontWeight: 600 }}>{lockedCompany.name}</strong></span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
              <Field label="Site name" required>
                <TextInput placeholder="e.g. Sunset Liquor — Bay Ridge" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
                  options={[{value: "Store", label: "Store"}, {value: "Office", label: "Office"}, {value: "Warehouse", label: "Warehouse"}, {value: "Other", label: "Other"}]} />
              </Field>
            </div>
            <Field label="Street address" required>
              <TextInput placeholder="e.g. 88 5th Ave, Brooklyn NY" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
            </Field>
            <Field label="Risk level" hint="Used to prioritize alerts and response time">
              <Select value={form.risk} onChange={(e) => setForm({...form, risk: e.target.value})}
                options={[{value: "Low", label: "Low"}, {value: "Medium", label: "Medium"}, {value: "High", label: "High"}]} />
            </Field>

            <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
              <Label style={{ marginBottom: 4 }}>Business Client</Label>
              <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 14, lineHeight: 1.55 }}>
                The on-site owner or manager who'll access the Business Client portal for this site.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Full name" required>
                  <TextInput placeholder="e.g. Maria Chen" value={form.clientName} onChange={(e) => setForm({...form, clientName: e.target.value})} />
                </Field>
                <Field label="Email" required hint="Portal invite sent here">
                  <TextInput type="email" placeholder="owner@store.com" value={form.clientEmail} onChange={(e) => setForm({...form, clientEmail: e.target.value})} />
                </Field>
              </div>
              <InfoBox>An invite to the Business Client portal will be sent to this email. They'll see only this site's alerts, incidents, and reports.</InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn icon={Plus} onClick={() => setDone(true)}>Create site & invite client</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// SITE TOGGLE / DELETE (admin)
// =========================================================
function SiteToggleModal({ open, onClose, site }) {
  const [done, setDone] = useState(false);
  if (!site) return null;
  const isActive = site.status === "Active";
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title={isActive ? "Site deactivated." : "Site activated."}
          sub={isActive ? `${site.name} won't generate alerts until reactivated.` : `${site.name} is back online.`}
          onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Confirm"
            title={isActive ? `Deactivate ${site.name}?` : `Activate ${site.name}?`}
            onClose={handleClose} />
          <ModalBody>
            <InfoBox tone={isActive ? "amber" : "green"}>
              {isActive ? "Cameras at this site stop generating alerts. Existing incidents stay open. You can reactivate anytime." : "Cameras resume status monitoring and alerts can be created again."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant={isActive ? "danger" : "primary"} icon={Power} onClick={() => setDone(true)}>
              {isActive ? "Deactivate site" : "Activate site"}
            </Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function DeleteSiteModal({ open, onClose, site }) {
  const [done, setDone] = useState(false);
  if (!site) return null;
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title="Site deleted." sub={`${site.name} and all its cameras have been removed.`} onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Super Admin · Permanent action"
            title={`Delete ${site.name}?`}
            onClose={handleClose} />
          <ModalBody>
            <InfoBox tone="amber">This will remove the site, all of its cameras, and disable Business Client access. Past alerts and incidents stay in your records for audit.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => setDone(true)}>Delete site</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// ADD CAMERA MODAL — Super Admin (any company / any site)
// =========================================================
function AddCameraModal({ open, onClose }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ company: "", site: "", name: "", location: "", initialStatus: "Online" });
  const handleClose = () => { setDone(false); setForm({ company: "", site: "", name: "", location: "", initialStatus: "Online" }); onClose(); };
  const sitesForCompany = form.company ? SITES.filter(s => s.companyId === form.company) : [];
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState title="Camera added." sub={`${form.name} is now monitored. Status checks will run every 60 seconds.`} onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Super Admin · New camera"
            title="Add a camera"
            sub="Register a camera under any company and site. Phase 1 monitors status; streaming is Phase 2."
            onClose={handleClose} />
          <ModalBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Company" required>
                <Select value={form.company} onChange={(e) => setForm({...form, company: e.target.value, site: ""})} placeholder="Select a company"
                  options={COMPANIES.map(c => ({ value: c.id, label: c.name }))} />
              </Field>
              <Field label="Site" required>
                <Select value={form.site} onChange={(e) => setForm({...form, site: e.target.value})} placeholder={form.company ? "Select a site" : "Choose a company first"}
                  options={sitesForCompany.map(s => ({ value: s.id, label: s.name }))} />
              </Field>
            </div>
            <Field label="Camera name" required>
              <TextInput placeholder="e.g. Front Entrance" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </Field>
            <Field label="Location" hint="Where in the site is this camera positioned?">
              <TextInput placeholder="e.g. Main door, interior" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} />
            </Field>
            <Field label="Initial status">
              <Select value={form.initialStatus} onChange={(e) => setForm({...form, initialStatus: e.target.value})}
                options={[{value: "Online", label: "Online"}, {value: "Maintenance", label: "Maintenance"}, {value: "Unknown", label: "Unknown"}]} />
            </Field>
            <InfoBox>Stream URL and AI configuration fields are reserved for Phase 2 (RTSP streaming + AI detection).</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn icon={Plus} onClick={() => setDone(true)}>Add camera</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function RemoveCameraModal({ open, onClose, camera }) {
  const [done, setDone] = useState(false);
  if (!camera) return null;
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title="Camera removed." sub={`${camera.name} is no longer monitored.`} onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Confirm" title={`Remove ${camera.name}?`} onClose={handleClose} />
          <ModalBody>
            <InfoBox tone="amber">The camera is unregistered from Primex. Status checks stop and past alerts linked to it stay in records.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => setDone(true)}>Remove camera</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// CREATE ALERT MODAL — admin / company / dispatcher
// =========================================================
function CreateAlertModal({ open, onClose, mode = "admin", lockedCompany }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    company: lockedCompany?.id || "",
    site: "", camera: "", severity: "Warning", title: "", description: "",
  });
  const handleClose = () => { setDone(false); setForm({ company: lockedCompany?.id || "", site: "", camera: "", severity: "Warning", title: "", description: "" }); onClose(); };
  const sitesForCompany = form.company ? SITES.filter(s => s.companyId === form.company) : [];
  const camsForSite = form.site ? CAMERAS.filter(c => c.siteId === form.site) : [];
  const eyebrow = mode === "admin" ? "Super Admin · New alert" : mode === "company" ? "Company Manager · New alert" : "Dispatcher · New alert";
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState
          title="Alert created & incident opened."
          sub={<>"{form.title}" is now in the dispatcher's queue, with a linked incident in the Open column ready to assign.</>}
          onClose={handleClose}
        />
      ) : (
        <>
          <ModalHeader eyebrow={eyebrow}
            title="Create alert"
            sub="Creating an alert automatically opens a linked incident and notifies the on-duty dispatcher."
            onClose={handleClose} />
          <ModalBody>
            {mode === "admin" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Company" required>
                  <Select value={form.company} onChange={(e) => setForm({...form, company: e.target.value, site: "", camera: ""})} placeholder="Select a company"
                    options={COMPANIES.map(c => ({ value: c.id, label: c.name }))} />
                </Field>
                <Field label="Site" required>
                  <Select value={form.site} onChange={(e) => setForm({...form, site: e.target.value, camera: ""})} placeholder={form.company ? "Select a site" : "Choose a company first"}
                    options={sitesForCompany.map(s => ({ value: s.id, label: s.name }))} />
                </Field>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14, padding: "10px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Building size={14} color={T.ink3} />
                  <span style={{ fontSize: 13, color: T.ink2 }}>Scoped to <strong style={{ color: T.ink, fontWeight: 600 }}>{lockedCompany?.name}</strong></span>
                </div>
                <Field label="Site" required>
                  <Select value={form.site} onChange={(e) => setForm({...form, site: e.target.value, camera: ""})} placeholder="Select a site"
                    options={sitesForCompany.map(s => ({ value: s.id, label: s.name }))} />
                </Field>
              </>
            )}
            <Field label="Camera (optional)" hint="Link the alert to a specific camera if relevant">
              <Select value={form.camera} onChange={(e) => setForm({...form, camera: e.target.value})} placeholder={form.site ? "None / select a camera" : "Select a site first"}
                options={camsForSite.map(c => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Severity" required>
              <Select value={form.severity} onChange={(e) => setForm({...form, severity: e.target.value})}
                options={[{value: "Critical", label: "Critical — immediate dispatch"}, {value: "Warning", label: "Warning — review & decide"}, {value: "Info", label: "Info — log only"}]} />
            </Field>
            <Field label="Title" required>
              <TextInput placeholder="e.g. Suspicious activity — Spirits aisle" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
            </Field>
            <Field label="Description" required hint="Plain-language summary — this is what the dispatcher and guard see">
              <TextArea placeholder="What did you see? Where? Any subject description?" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
            </Field>
            <InfoBox>Submitting this form creates the alert and automatically opens a linked incident — ready to dispatch a guard.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn icon={AlertTriangle} onClick={() => setDone(true)}>Create alert & open incident</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// =========================================================
// INVITE TEAM MEMBER MODAL — Company Manager
// =========================================================
function InviteTeamMemberModal({ open, onClose }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "Dispatcher", phone: "" });
  const handleClose = () => { setDone(false); setForm({ name: "", email: "", role: "Dispatcher", phone: "" }); onClose(); };
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState
          title="Invite sent."
          sub={<>An invitation has been emailed to <strong style={{ color: T.ink }}>{form.email}</strong>. They'll appear in your team list once they accept.</>}
          onClose={handleClose}
        />
      ) : (
        <>
          <ModalHeader eyebrow="Company Manager · Invite"
            title="Invite a team member"
            sub="Add someone to your company. They'll get an email to set their password and join your team."
            onClose={handleClose} />
          <ModalBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Full name" required>
                <TextInput placeholder="e.g. Diana Okafor" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </Field>
              <Field label="Email" required>
                <TextInput type="email" placeholder="name@company.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </Field>
            </div>
            <Field label="Role" required hint="What can they do in Primex?">
              <Select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
                options={[
                  {value: "Company Manager", label: "Company Manager — full company access"},
                  {value: "Dispatcher", label: "Dispatcher — alerts, incidents, dispatch"},
                  {value: "Site Manager", label: "Site Manager — one site only"},
                  {value: "Guard", label: "Guard / Responder — mobile-focused"},
                ]} />
            </Field>
            <Field label="Phone (optional)" hint="For guards — used for tap-to-call from dispatch">
              <TextInput placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
            </Field>
            <InfoBox>The invitation link expires in 7 days. You can resend or revoke from the team list.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn icon={Send} onClick={() => setDone(true)}>Send invitation</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function EditTeamMemberModal({ open, onClose, member }) {
  const [done, setDone] = useState(false);
  if (!member) return null;
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState title="Saved." sub="Team member details updated." onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Edit member" title={member.name} onClose={handleClose} />
          <ModalBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Full name"><TextInput defaultValue={member.name} /></Field>
              <Field label="Email"><TextInput defaultValue={member.email} /></Field>
            </div>
            <Field label="Role">
              <Select value={member.role} onChange={() => {}}
                options={[
                  {value: "Company Manager", label: "Company Manager"},
                  {value: "Dispatcher", label: "Dispatcher"},
                  {value: "Site Manager", label: "Site Manager"},
                  {value: "Guard", label: "Guard / Responder"},
                ]} />
            </Field>
            <Field label="Phone"><TextInput defaultValue="+1 (555) 000-0000" /></Field>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn onClick={() => setDone(true)}>Save changes</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function ToggleMemberModal({ open, onClose, member }) {
  const [done, setDone] = useState(false);
  if (!member) return null;
  const isActive = member.status === "Active";
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title={isActive ? "Account deactivated." : "Account reactivated."}
          sub={isActive ? `${member.name} can no longer sign in.` : `${member.name} can sign in again.`}
          onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Confirm"
            title={isActive ? `Deactivate ${member.name}?` : `Reactivate ${member.name}?`}
            onClose={handleClose} />
          <ModalBody>
            <InfoBox tone={isActive ? "amber" : "green"}>
              {isActive ? "They keep their account and history, but can't sign in. Reactivate anytime." : "They'll regain access on their next sign-in. Notifications will resume."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant={isActive ? "danger" : "primary"} icon={Power} onClick={() => setDone(true)}>
              {isActive ? "Deactivate" : "Reactivate"}
            </Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function DeleteMemberModal({ open, onClose, member }) {
  const [done, setDone] = useState(false);
  if (!member) return null;
  const handleClose = () => { setDone(false); onClose(); };
  return (
    <Modal open={open} onClose={handleClose} width={460}>
      {done ? (
        <SuccessState title="Member removed." sub={`${member.name} has been removed from the team.`} onClose={handleClose} />
      ) : (
        <>
          <ModalHeader eyebrow="Remove member" title={`Remove ${member.name}?`} onClose={handleClose} />
          <ModalBody>
            <InfoBox tone="amber">Soft delete — the user is hidden from your team list and can't sign in. Their actions stay in the audit log. Admins can restore within 30 days.</InfoBox>
          </ModalBody>
          <ModalFooter>
            <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => setDone(true)}>Remove from team</Btn>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function SearchInput({ placeholder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 320, padding: "7px 12px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface }}>
      <Search size={13} color={T.ink4} />
      <input placeholder={placeholder} style={{ border: "none", outline: "none", flex: 1, background: "transparent", fontSize: 13, fontFamily: sans, color: T.ink }} />
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 13 }}>
      <span style={{ color: T.ink3 }}>{k}</span>
      <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

// =========================================================
// TOP BAR (prototype preview switcher)
// =========================================================
function TopBar({ role, setRole }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(248,250,252,0.92)",
      backdropFilter: "saturate(180%) blur(12px)",
      borderBottom: `1px solid ${T.border}`,
      padding: "10px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontFamily: sans, fontSize: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: T.navy, display: "grid", placeItems: "center" }}>
            <Shield size={14} color="#fff" />
          </div>
          <div style={{ fontFamily: serif, fontSize: 18, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Primex</div>
        </div>
        <div style={{ height: 18, width: 1, background: T.border }} />
        <span style={{ color: T.ink3, fontSize: 11.5 }}>Interactive prototype</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: T.ink3, marginRight: 8, fontSize: 11.5 }}>Preview</span>
        {ROLES.map(r => {
          const active = role === r.id;
          return (
            <button key={r.id} onClick={() => setRole(r.id)} style={{
              padding: "5px 10px", borderRadius: 7,
              background: active ? T.navy : "transparent",
              color: active ? "#fff" : T.ink2,
              border: `1px solid ${active ? T.navy : "transparent"}`,
              fontWeight: 500, cursor: "pointer", fontSize: 11.5, fontFamily: sans,
            }}>{r.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================
// SIDEBAR — scope dropdown for admin only
// =========================================================
function Sidebar({ items, active, setActive, user, scope, scopeIsAdmin = false }) {
  const [scopeOpen, setScopeOpen] = useState(false);
  return (
    <aside style={{
      width: 240, background: T.surface, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      fontFamily: sans, padding: "20px 14px",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 18px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.navy, display: "grid", placeItems: "center" }}>
            <Shield size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 18, color: T.ink, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1 }}>Primex</div>
            <div style={{ fontSize: 9.5, color: T.ink4, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 3, fontWeight: 500 }}>Security System</div>
          </div>
        </div>

        <div style={{ padding: "0 4px 14px", position: "relative" }}>
          <div style={{ fontSize: 10, color: T.ink4, letterSpacing: 1.3, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, paddingLeft: 6 }}>
            {scopeIsAdmin ? "Client Scope" : "Organization"}
          </div>
          {scopeIsAdmin ? (
            <>
              <button onClick={() => setScopeOpen(!scopeOpen)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 7,
                background: T.bg, border: `1px solid ${T.border}`,
                cursor: "pointer", fontFamily: sans, fontSize: 12.5, color: T.ink, fontWeight: 500,
              }}>
                <Building size={13} color={T.ink3} />
                <span style={{ flex: 1, textAlign: "left" }}>{scope}</span>
                <ChevronDown size={13} color={T.ink3} style={{ transform: scopeOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform .15s" }} />
              </button>
              {scopeOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 4, right: 4, marginTop: 4,
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: 4, zIndex: 30,
                  boxShadow: "0 8px 24px -8px rgba(11,18,32,0.15)",
                }}>
                  <button style={{ width: "100%", padding: "8px 10px", border: "none", background: scope === "All Companies" ? T.blueSoft : "transparent", borderRadius: 6, fontSize: 12.5, color: scope === "All Companies" ? T.blue : T.ink, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: sans }}>All Companies</button>
                  {COMPANIES.map(c => (
                    <button key={c.id} style={{ width: "100%", padding: "8px 10px", border: "none", background: "transparent", borderRadius: 6, fontSize: 12.5, color: T.ink2, cursor: "pointer", textAlign: "left", fontFamily: sans, display: "flex", alignItems: "center", gap: 8 }}>
                      <Building size={11} color={T.ink4} /> {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 7,
              background: T.surfaceSubtle,
              fontFamily: sans, fontSize: 12.5, color: T.ink, fontWeight: 600,
            }}>
              <Building size={13} color={T.ink3} />
              <span style={{ flex: 1 }}>{scope}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map(it => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button key={it.id} onClick={() => setActive(it.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 11px", borderRadius: 7,
                background: isActive ? T.blueSoft : "transparent",
                border: "none",
                color: isActive ? T.blue : T.ink2,
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                cursor: "pointer", textAlign: "left", fontFamily: sans,
              }}>
                <Icon size={14} color={isActive ? T.blue : T.ink3} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.count != null && (
                  <span style={{
                    fontSize: 10.5, color: isActive ? T.blue : T.ink3,
                    background: isActive ? "#fff" : T.graySoft,
                    padding: "1px 7px", borderRadius: 999, fontWeight: 600,
                  }}>{it.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 11px", background: T.greenSoft,
          borderRadius: 999, fontSize: 11.5, color: T.green,
          fontWeight: 600, marginBottom: 10,
        }}>
          <LiveDot color={T.green} />
          <span style={{ flex: 1 }}>All systems operational</span>
          <span style={{ color: T.ink3, fontSize: 10.5, fontWeight: 500 }}>09:53</span>
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>
              {user.name.split(" ").map(p=>p[0]).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: T.ink, fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 10.5, color: T.ink3 }}>{user.role}</div>
            </div>
            <Settings size={13} color={T.ink4} />
          </div>
        )}
      </div>
    </aside>
  );
}

// =========================================================
// PAGE STRIP — breadcrumb only (no auth buttons inside app)
// =========================================================
function PageStrip({ trail }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 36px", borderBottom: `1px solid ${T.border}`,
      fontFamily: sans, background: T.surface,
    }}>
      <Breadcrumb items={trail} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: T.ink3 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Calendar size={12} /> Wed · May 13, 2026
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Bell size={12} />
          <span style={{
            position: "relative", top: -1,
            display: "inline-grid", placeItems: "center",
            width: 16, height: 16, borderRadius: 999, background: T.red, color: "#fff",
            fontSize: 9, fontWeight: 700,
          }}>3</span>
        </span>
      </div>
    </div>
  );
}

// =========================================================
// LANDING PAGE
// =========================================================
function LandingNav({ goLogin }) {
  const links = [
    { label: "Product", href: "#product" },
    { label: "Solutions", href: "#solutions" },
    { label: "Customers", href: "#customers" },
    { label: "Pricing", href: "#pricing" },
    { label: "Resources", href: "#resources" },
  ];
  return (
    <nav style={{
      position: "sticky", top: 49, zIndex: 40,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "saturate(180%) blur(12px)",
      borderBottom: `1px solid ${T.border}`,
      padding: "18px 48px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontFamily: sans,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.navy, display: "grid", placeItems: "center" }}>
            <Shield size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, letterSpacing: -0.4 }}>
            Primex Security System
          </span>
        </a>
        <div style={{ display: "flex", gap: 28, fontSize: 13.5, color: T.ink2, fontWeight: 500 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} style={{ cursor: "pointer", color: T.ink2, textDecoration: "none" }}>{l.label}</a>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <a style={{ fontSize: 13.5, color: T.ink2, fontWeight: 500, cursor: "pointer", padding: "0 8px" }} onClick={goLogin}>Log in</a>
        <Btn variant="primary" onClick={goLogin}>Sign Up</Btn>
      </div>
    </nav>
  );
}

function LandingPage({ goLogin }) {
  return (
    <div id="top" style={{ background: T.bg, fontFamily: sans }}>
      <LandingNav goLogin={goLogin} />

      {/* HERO */}
      <div style={{ padding: "32px 48px" }}>
        <div style={{
          background: T.navy, borderRadius: 16, padding: "80px 48px 88px",
          color: "#fff", position: "relative", overflow: "hidden", textAlign: "center",
        }}>
          <svg style={{ position: "absolute", inset: 0, opacity: 0.05 }} width="100%" height="100%">
            <defs>
              <pattern id="hgrid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#fff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hgrid)" />
          </svg>

          <div style={{ position: "relative", maxWidth: 920, margin: "0 auto" }}>
            <h1 style={{
              fontFamily: serif, fontSize: 56, lineHeight: 1.1, fontWeight: 700,
              letterSpacing: -1.2, margin: 0, color: "#fff",
            }}>
              When Seconds Matter, Primex Responds
            </h1>
            <p style={{
              fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,0.65)",
              marginTop: 22, fontFamily: sans, maxWidth: 620, margin: "22px auto 0",
            }}>
              Turn AI alerts into structured incidents and dispatch the right team in under 60 seconds.
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18,
              marginTop: 52, maxWidth: 880, margin: "52px auto 0",
            }}>
              <HeroTile value="4 min" label="Average dispatch time" />
              <HeroTile value="1,248" label="Incidents resolved last month" />
              <HeroTile value="32+" label="Live sites monitored" />
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards (Product) */}
      <div id="product" style={{ padding: "32px 48px 56px", scrollMarginTop: 130 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          <FeatureCard icon={Video} title="Smart Cameras"
            body="Connect your existing CCTV or IP cameras with secure, encrypted streaming." phase />
          <FeatureCard icon={Cpu} title="Real-Time AI Detection"
            body="Detect people, vehicles, motion, and suspicious activity automatically." phase />
          <FeatureCard icon={Shield} title="Rapid Guard Dispatch"
            body="Dispatch guards or responders with location and incident details in seconds." />
        </div>
      </div>

      {/* NEW SECTIONS */}
      <SolutionsSection />
      <CustomersSection />
      <PricingSection goLogin={goLogin} />

      {/* Bottom dark CTA */}
      <div style={{ padding: "56px 48px 56px" }}>
        <div style={{
          background: T.navy, borderRadius: 16, padding: "60px 48px 64px",
          color: "#fff", textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <svg style={{ position: "absolute", inset: 0, opacity: 0.04 }} width="100%" height="100%">
            <defs>
              <pattern id="hgrid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hgrid2)" />
          </svg>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 30 }}>
              <Btn variant="primary" size="lg" onClick={goLogin}>Get Started</Btn>
              <Btn variant="outlineWhite" size="lg" icon={Play}>Watch Demo</Btn>
            </div>
            <h2 style={{
              fontFamily: serif, fontSize: 52, fontWeight: 700, letterSpacing: -1.2,
              lineHeight: 1.1, margin: 0, color: "#fff",
            }}>
              Primex Security System
            </h2>
            <div style={{ fontFamily: serif, fontSize: 22, color: "#fff", fontWeight: 600, marginTop: 12, letterSpacing: -0.2 }}>
              AI-Powered Security Monitoring & Dispatch
            </div>
            <p style={{
              fontSize: 15.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
              marginTop: 14, maxWidth: 560, margin: "14px auto 0", fontFamily: sans,
            }}>
              24/7 live camera monitoring, instant threat detection, and rapid guard dispatch for commercial properties.
            </p>
          </div>
        </div>
      </div>

      {/* Footer (Resources anchor lives here) */}
      <div id="resources" style={{
        padding: "32px 48px", borderTop: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", color: T.ink3, fontSize: 12,
        background: T.surface, scrollMarginTop: 130,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={14} color={T.ink3} /> © 2026 Primex Security Systems
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <a style={{ color: T.ink3, cursor: "pointer" }}>Status</a>
          <a style={{ color: T.ink3, cursor: "pointer" }}>Docs</a>
          <a style={{ color: T.ink3, cursor: "pointer" }}>Privacy</a>
          <a style={{ color: T.ink3, cursor: "pointer" }}>Terms</a>
          <a style={{ color: T.ink3, cursor: "pointer" }}>Contact</a>
        </div>
      </div>
    </div>
  );
}

function HeroTile({ value, label }) {
  return (
    <div style={{
      background: T.navyDarker, borderRadius: 14, padding: "32px 24px",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontFamily: serif, fontSize: 48, color: "#fff", fontWeight: 700, letterSpacing: -1.2, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 12, fontFamily: sans }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, phase }) {
  return (
    <Card padding={26}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "grid", placeItems: "center" }}>
          <Icon size={20} color={T.blue} />
        </div>
        {phase && <PhaseTag />}
      </div>
      <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3, marginTop: 22 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.6, marginTop: 10 }}>{body}</div>
    </Card>
  );
}

// =========================================================
// SOLUTIONS SECTION — interactive tabs by vertical
// =========================================================
function SolutionsSection() {
  const [active, setActive] = useState("retail");
  const solutions = {
    retail: {
      label: "Retail & Convenience",
      icon: Store,
      tagline: "When every minute the door is closed costs money.",
      blurb: "Liquor stores, mini-markets, and 24-hour convenience operators handle high-value goods and frequent theft attempts. Primex turns alerts into dispatched response in under 60 seconds — without a security firm on retainer.",
      bullets: [
        "Manual + AI-flagged alerts (Phase 2) routed to one dispatcher",
        "Tap-to-call guards in the right zone",
        "Business owners see only their store, not yours",
        "Audit-grade logs for insurance claims",
      ],
      stat: { value: "9 min", label: "Average dispatch in retail" },
      live: "Operating",
    },
    security: {
      label: "Security Firms",
      icon: Shield,
      tagline: "Manage every client from one console.",
      blurb: "Your firm protects many businesses. Primex's strict per-tenant isolation lets your dispatchers handle multiple companies without ever leaking data across them.",
      bullets: [
        "Strict company-level isolation built in",
        "One dispatch board across all your clients",
        "Per-client reports your customers love",
        "Custom roles for account managers (Phase 2)",
      ],
      stat: { value: "32+", label: "Companies on Primex" },
      live: "Active dispatch",
    },
    multisite: {
      label: "Multi-site Operators",
      icon: Building,
      tagline: "Your district manager finally has one view.",
      blurb: "Restaurant groups, retail chains, and franchise operators with 5+ locations get a single dashboard that surfaces what needs attention — and lets each store owner see only theirs.",
      bullets: [
        "Roll up alerts across every site",
        "Filter by region, risk, or hours",
        "Per-site business client portals",
        "Drag-and-drop dispatch board (Phase 2)",
      ],
      stat: { value: "240+", label: "Sites monitored today" },
      live: "Rolling up",
    },
    warehouse: {
      label: "Warehouses & Logistics",
      icon: ClipboardList,
      tagline: "After-hours patrols that don't depend on a phone tree.",
      blurb: "Loading bays, cold storage, and yard perimeters generate alerts at 2 AM. Primex hands them off to the right guard with location, notes, and a clean status flow.",
      bullets: [
        "Geo-tagged dispatch with directions",
        "Guard mobile app — accept → en route → arrived",
        "Photo + note attachments on resolution",
        "AWS Kinesis integration (Phase 2)",
      ],
      stat: { value: "98%", label: "Resolution rate" },
      live: "Night shift",
    },
  };
  const sol = solutions[active];
  const Icon = sol.icon;
  return (
    <section id="solutions" style={{
      padding: "96px 48px", scrollMarginTop: 130,
      background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 44, maxWidth: 720 }}>
          <Label>Solutions</Label>
          <h2 style={{ fontFamily: serif, fontSize: 44, color: T.ink, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, margin: "10px 0 0" }}>
            Built for the way you <span style={{ fontStyle: "italic", fontWeight: 400 }}>actually</span> operate.
          </h2>
          <p style={{ fontSize: 17, color: T.ink3, marginTop: 16, lineHeight: 1.55 }}>
            Every business is different. Primex adapts to retail floors, multi-site groups, security firms, and yards.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 44, gap: 4, flexWrap: "wrap" }}>
          {Object.entries(solutions).map(([key, s]) => {
            const isActive = key === active;
            const TIcon = s.icon;
            return (
              <button key={key} onClick={() => setActive(key)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 18px", background: "transparent",
                border: "none", borderBottom: `2px solid ${isActive ? T.blue : "transparent"}`,
                cursor: "pointer", color: isActive ? T.ink : T.ink3,
                fontFamily: sans, fontWeight: isActive ? 600 : 500, fontSize: 14,
                marginBottom: -1, transition: "color .15s",
              }}>
                <TIcon size={15} color={isActive ? T.blue : T.ink3} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: T.blueSoft, borderRadius: 999, marginBottom: 22 }}>
              <Icon size={13} color={T.blue} />
              <span style={{ fontSize: 11.5, color: T.blue, fontWeight: 600, letterSpacing: 0.2 }}>{sol.label}</span>
            </div>
            <div style={{ fontFamily: serif, fontSize: 34, color: T.ink, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2, fontStyle: "italic" }}>
              {sol.tagline}
            </div>
            <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.7, marginTop: 18 }}>
              {sol.blurb}
            </p>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {sol.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 999, background: T.blueSoft, display: "grid", placeItems: "center", marginTop: 1, flexShrink: 0 }}>
                    <Check size={11} color={T.blue} />
                  </div>
                  <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right visual — navy stat card with grid */}
          <div style={{
            background: T.navy, borderRadius: 14, padding: 32, color: "#fff",
            position: "relative", overflow: "hidden", aspectRatio: "4/3", minHeight: 320,
          }}>
            <svg style={{ position: "absolute", inset: 0, opacity: 0.05 }} width="100%" height="100%">
              <defs><pattern id={`solgrid-${active}`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1" /></pattern></defs>
              <rect width="100%" height="100%" fill={`url(#solgrid-${active})`} />
            </svg>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: 1.3, textTransform: "uppercase", fontWeight: 600 }}>
                  Operator view
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  <LiveDot color="#fff" /> {sol.live}
                </div>
              </div>
              <div style={{ fontFamily: serif, fontSize: 64, color: "#fff", fontWeight: 700, letterSpacing: -1.6, lineHeight: 1, marginTop: 20 }}>
                {sol.stat.value}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 10 }}>
                {sol.stat.label}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.1)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { l: "Uptime", v: "99.4%" },
                  { l: "SLA", v: "< 10 min" },
                  { l: "Today", v: "9 ops" },
                ].map((m, i) => (
                  <div key={i}>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>{m.l}</div>
                    <div style={{ marginTop: 6, color: "#fff", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =========================================================
// CUSTOMERS SECTION — stats, logo strip, testimonials
// =========================================================
function CustomersSection() {
  const stats = [
    { v: "32+", l: "Companies on Primex" },
    { v: "240+", l: "Sites monitored daily" },
    { v: "1.2k+", l: "Incidents resolved in 2025" },
    { v: "99.4%", l: "System uptime" },
  ];
  const logos = [
    { name: "Sunset Liquor", icon: Store },
    { name: "Northgate", icon: Shield },
    { name: "Verde Markets", icon: Briefcase },
    { name: "Atlas Logistics", icon: ClipboardList },
    { name: "Riverline Stores", icon: Home },
    { name: "Hudson Mini", icon: MapPin },
  ];
  const testimonials = [
    {
      quote: "Primex took our dispatch from spreadsheets and group texts to a single console our guards actually want to use.",
      name: "Marcus Reyes", role: "Director of Operations", co: "Northgate Security Co.",
    },
    {
      quote: "Three liquor stores, one screen. We catch issues before the next shift comes on. The portal my store managers see — that alone justified switching.",
      name: "Amar Zindani", role: "Owner", co: "Sunset Liquor Group",
    },
    {
      quote: "I'm not a security person. I just want to know my store is safe. Primex tells me in plain English. When something's wrong, a guard shows up.",
      name: "Maria Chen", role: "Owner", co: "Sunset Liquor — Bay Ridge",
    },
  ];
  return (
    <section id="customers" style={{ padding: "96px 48px", scrollMarginTop: 130, background: T.bg }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, maxWidth: 720 }}>
          <Label>Customers</Label>
          <h2 style={{ fontFamily: serif, fontSize: 44, color: T.ink, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, margin: "10px 0 0" }}>
            Operators trust Primex to be there <span style={{ fontStyle: "italic", fontWeight: 400 }}>at 2 AM.</span>
          </h2>
          <p style={{ fontSize: 17, color: T.ink3, marginTop: 16, lineHeight: 1.55 }}>
            From single liquor stores to security firms managing dozens of clients, the operators below run their security on Primex.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          padding: "36px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: "0 32px", borderLeft: i > 0 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontFamily: serif, fontSize: 46, color: T.ink, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 13, color: T.ink3, marginTop: 10 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Logo strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 28,
          padding: "44px 0 56px", alignItems: "center",
        }}>
          {logos.map((co, i) => {
            const Ic = co.icon;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, color: T.ink3, opacity: 0.7 }}>
                <Ic size={18} />
                <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, letterSpacing: -0.3, whiteSpace: "nowrap" }}>{co.name}</span>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {testimonials.map((t, i) => (
            <Card key={i} padding={28}>
              <div style={{ fontFamily: serif, fontSize: 48, color: T.blue, lineHeight: 0.7, fontWeight: 700, height: 28 }}>"</div>
              <div style={{ fontFamily: serif, fontSize: 18, color: T.ink, fontStyle: "italic", lineHeight: 1.5, fontWeight: 400, marginTop: 10, letterSpacing: -0.2 }}>
                {t.quote}
              </div>
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>
                  {t.name.split(" ").map(p => p[0]).join("")}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: T.ink3 }}>{t.role} · {t.co}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// =========================================================
// PRICING SECTION — three-tier with featured middle
// =========================================================
function PricingSection({ goLogin }) {
  const plans = [
    {
      name: "Starter",
      price: "$399",
      period: "/ month",
      tagline: "For single-location operators.",
      features: [
        "Up to 3 sites",
        "Up to 24 cameras",
        "5 team members",
        "Email & web support",
        "Monthly PDF reports",
        "Email + push notifications",
      ],
      cta: "Start free trial",
      featured: false,
    },
    {
      name: "Professional",
      price: "$1,499",
      period: "/ month",
      tagline: "Growing multi-site operators.",
      features: [
        "Up to 25 sites",
        "Unlimited cameras",
        "Unlimited team members",
        "Priority chat support",
        "Custom roles (Phase 2)",
        "Real-time dispatch board",
        "SLA: under 10 min response",
        "API access",
      ],
      cta: "Start free trial",
      featured: true,
      badge: "Most popular",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      tagline: "Security firms & large estates.",
      features: [
        "Unlimited sites & cameras",
        "Dedicated success manager",
        "SSO + advanced auth",
        "Custom integrations",
        "24/7 on-call support",
        "Custom SLA",
        "White-label reports",
      ],
      cta: "Talk to sales",
      featured: false,
    },
  ];
  return (
    <section id="pricing" style={{
      padding: "96px 48px 56px", scrollMarginTop: 130,
      background: T.surface, borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64, maxWidth: 720, margin: "0 auto 64px" }}>
          <Label>Pricing</Label>
          <h2 style={{ fontFamily: serif, fontSize: 44, color: T.ink, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, margin: "10px 0 0" }}>
            Simple pricing. <span style={{ fontStyle: "italic", fontWeight: 400 }}>No surprises.</span>
          </h2>
          <p style={{ fontSize: 17, color: T.ink3, marginTop: 16, lineHeight: 1.55 }}>
            One flat monthly fee per company. Pause anytime. No setup costs, no per-camera charges.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, alignItems: "stretch" }}>
          {plans.map((p, i) => {
            const isFeatured = p.featured;
            return (
              <div key={i} style={{
                background: isFeatured ? T.navy : T.surface,
                color: isFeatured ? "#fff" : T.ink,
                border: `1px solid ${isFeatured ? T.navy : T.border}`,
                borderRadius: 14, padding: "32px 28px",
                position: "relative",
                transform: isFeatured ? "translateY(-12px)" : "none",
                boxShadow: isFeatured ? "0 24px 56px -16px rgba(11,18,32,0.25)" : "none",
                display: "flex", flexDirection: "column",
              }}>
                {p.badge && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: T.blue, color: "#fff", padding: "5px 14px", borderRadius: 999,
                    fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  }}>{p.badge}</div>
                )}
                <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, letterSpacing: -0.3, color: isFeatured ? "#fff" : T.ink }}>{p.name}</div>
                <div style={{ fontSize: 13, color: isFeatured ? "rgba(255,255,255,0.65)" : T.ink3, marginTop: 6, lineHeight: 1.5 }}>{p.tagline}</div>
                <div style={{ marginTop: 22, paddingBottom: 22, borderBottom: `1px solid ${isFeatured ? "rgba(255,255,255,0.12)" : T.border}`, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: serif, fontSize: 48, fontWeight: 700, letterSpacing: -1.4, color: isFeatured ? "#fff" : T.ink, lineHeight: 1 }}>{p.price}</span>
                  {p.period && <span style={{ fontSize: 13, color: isFeatured ? "rgba(255,255,255,0.65)" : T.ink3 }}>{p.period}</span>}
                </div>
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 11, marginBottom: 28, flex: 1 }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Check size={14} color={isFeatured ? "#fff" : T.green} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: 13.5, color: isFeatured ? "rgba(255,255,255,0.85)" : T.ink2, lineHeight: 1.5 }}>{f}</div>
                    </div>
                  ))}
                </div>
                <Btn variant={isFeatured ? "primary" : "secondary"} full onClick={p.cta === "Talk to sales" ? undefined : goLogin}>{p.cta}</Btn>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 44, fontSize: 13, color: T.ink3, fontFamily: sans }}>
          All plans include a 14-day free trial · No credit card required · Cancel anytime
        </div>
      </div>
    </section>
  );
}

// =========================================================
// LOGIN
// =========================================================
function LoginPage({ onContinue }) {
  return (
    <div style={{ minHeight: "calc(100vh - 49px)", background: T.bg, display: "grid", placeItems: "center", padding: 40, fontFamily: sans }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, maxWidth: 1000, width: "100%", background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "56px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.navy, display: "grid", placeItems: "center" }}>
              <Shield size={15} color="#fff" />
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Primex Security System</div>
          </div>
          <Label>Sign in</Label>
          <h1 style={{ fontFamily: serif, fontSize: 36, color: T.ink, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginTop: 8, marginBottom: 8 }}>Welcome back.</h1>
          <p style={{ fontSize: 14, color: T.ink3, lineHeight: 1.6, marginBottom: 32 }}>Access your security operations console. Your view adapts to your role.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Work email</label>
              <input defaultValue="amar@sunsetliquor.com" style={inputCss} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Password</label>
              <input type="password" defaultValue="••••••••••" style={inputCss} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <label style={{ fontSize: 12.5, color: T.ink3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" defaultChecked /> Keep me signed in
              </label>
              <a style={{ fontSize: 12.5, color: T.blue, fontWeight: 500, cursor: "pointer" }}>Forgot password?</a>
            </div>
            <Btn size="lg" full icon={ArrowRight} onClick={() => onContinue("admin")}>Continue</Btn>
            <div style={{ fontSize: 12, color: T.ink3, textAlign: "center", marginTop: 8 }}>
              Don't have an account? <span style={{ color: T.blue, fontWeight: 500, cursor: "pointer" }}>Request access</span>
            </div>
          </div>
        </div>
        <div style={{ background: T.navy, padding: "56px 48px", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <svg style={{ position: "absolute", inset: 0, opacity: 0.06 }} width="100%" height="100%">
            <defs><pattern id="lgrid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#fff" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#lgrid)" />
          </svg>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
            <LiveDot color="#fff" /> Live · 32 companies
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.35, fontStyle: "italic", color: "rgba(255,255,255,0.88)", marginBottom: 24 }}>
              "Primex took our dispatch from spreadsheets and group texts to a single console our guards actually want to use."
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Marcus Reyes</div>
              Director of Operations · Northgate Security Co.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCss = {
  width: "100%", padding: "10px 13px", borderRadius: 8,
  border: `1px solid ${T.border}`, background: T.surface, marginTop: 6,
  fontSize: 14, fontFamily: sans, color: T.ink, outline: "none",
};

// =========================================================
// ADMIN VIEW
// =========================================================
function AdminView() {
  const [section, setSection] = useState("dashboard");
  const items = [
    { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
    { id: "companies",  label: "Companies",  icon: Briefcase, count: COMPANIES.length },
    { id: "sites",      label: "Sites",      icon: MapPin, count: SITES.length },
    { id: "cameras",    label: "Cameras",    icon: Camera, count: 86 },
    { id: "alerts",     label: "Alerts",     icon: Bell, count: 4 },
    { id: "incidents",  label: "Incidents",  icon: AlertTriangle, count: 3 },
    { id: "guards",     label: "Guards",     icon: Users, count: GUARDS.length },
    { id: "reports",    label: "Reports",    icon: BarChart3 },
    { id: "audit",      label: "Audit log",  icon: ClipboardList },
    { id: "settings",   label: "Settings",   icon: Settings },
  ];
  const labels = { dashboard: "Dashboard", companies: "Companies", sites: "Sites", cameras: "Cameras", alerts: "Alerts", incidents: "Incidents", guards: "Guards", reports: "Reports", audit: "Audit log", settings: "Settings" };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 49px)" }}>
      <Sidebar items={items} active={section} setActive={setSection}
        user={{ name: "Amar Zindani", role: "Super Admin" }}
        scope="All Companies" scopeIsAdmin={true} />
      <main style={{ flex: 1, background: T.bg, overflow: "auto" }}>
        <PageStrip trail={["Primex", labels[section]]} />
        <div style={{ padding: "32px 36px" }}>
          {section === "dashboard" && <AdminDashboard />}
          {section === "companies" && <CompaniesPage />}
          {section === "sites" && <SitesPage />}
          {section === "cameras" && <CamerasPage />}
          {section === "alerts" && <AlertsPage />}
          {section === "incidents" && <IncidentsPage />}
          {section === "guards" && <GuardsPage />}
          {section === "reports" && <ReportsPage />}
          {section === "audit" && <AuditLogPage />}
          {section === "settings" && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

function AdminDashboard() {
  return (
    <>
      <PageTitle title="Operational overview"
        sub="A live view across every company, site, and camera on Primex."
        actions={<><Btn variant="secondary" size="sm" icon={Filter}>Last 24 hours</Btn><Btn variant="primary" size="sm" icon={Plus}>New company</Btn></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        <StatCard label="Companies" value="4" icon={Briefcase}
          supporting={<><Pill tone="green">3 active</Pill><Pill tone="amber">1 pending</Pill></>} />
        <StatCard label="Active sites" value="23" icon={MapPin}
          supporting={<><Pill tone="green">21 active</Pill><Pill tone="amber">2 maintenance</Pill></>} />
        <StatCard label="Cameras online" value="78/86" icon={Camera}
          supporting={<><Pill tone="green">78 online</Pill><Pill tone="red">6 offline</Pill></>} />
        <StatCard label="Open alerts" value="3" accent={T.red} icon={Bell}
          supporting={<><Pill tone="red">2 critical</Pill><Pill tone="amber">1 warning</Pill></>} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        <StatCard label="Active incidents" value="3" icon={AlertTriangle}
          supporting={<><Pill tone="amber">1 in progress</Pill><Pill tone="amber">1 dispatched</Pill></>} />
        <StatCard label="Avg response" value="9m" icon={Clock}
          supporting={<><Pill tone="green">↓ 2m vs avg</Pill></>} />
        <StatCard label="Resolved today" value="9" icon={CheckCircle2}
          supporting={<><Pill tone="green">9 closed</Pill></>} />
        <StatCard label="Guards on duty" value="3/4" icon={Users}
          supporting={<><Pill tone="green">2 available</Pill><Pill tone="amber">1 on incident</Pill></>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Recent active incidents</div>
              <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Live · all companies</div>
            </div>
            <Btn variant="link" size="sm" icon={ArrowUpRight}>View all</Btn>
          </div>
          <DataTable
            columns={["Incident", "Site", "Severity", "Status", "Guard", "Started", ""]}
            rows={INCIDENTS.slice(0, 4).map(inc => {
              const site = SITES.find(s => s.id === inc.siteId);
              const guard = GUARDS.find(g => g.id === inc.guardId);
              return [
                <span style={{ color: T.ink, fontWeight: 500 }}>{inc.title}</span>,
                <span style={{ color: T.ink2 }}>{site?.name}</span>,
                <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>,
                <Pill tone={incTone(inc.status)}>{inc.status}</Pill>,
                guard ? <span style={{ color: T.ink2 }}>{guard.name}</span> : <span style={{ color: T.ink4 }}>Unassigned</span>,
                <span style={{ color: T.ink3, fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>{inc.startedAt}</span>,
                <RowActions />,
              ];
            })}
          />
        </Card>

        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3, display: "inline-flex", alignItems: "center", gap: 10 }}>
              <LiveDot /> Critical alerts
            </div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Need review now</div>
          </div>
          {ALERTS.filter(a => a.severity === "Critical" && a.status !== "Closed").map(a => {
            const site = SITES.find(s => s.id === a.siteId);
            return (
              <div key={a.id} style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12 }}>
                <div style={{ width: 3, alignSelf: "stretch", background: T.red, borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{site?.name} · {a.createdAt}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <Pill tone="red">Critical</Pill>
                    <Pill tone="gray">{a.status}</Pill>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: "14px 22px" }}>
            <Btn variant="link" size="sm" icon={ArrowRight}>Open dispatcher console</Btn>
          </div>
        </Card>
      </div>

      <Card padding={0} style={{ marginTop: 20 }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Camera status by company</div>
            <PhaseTag>Live streaming · Phase 2</PhaseTag>
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Phase 1 — status monitoring only (Online · Offline · Maintenance · Unknown)</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {COMPANIES.map((co, i) => {
            const sample = co.id === "c1" ? { on: 16, off: 1, mt: 1 } : co.id === "c2" ? { on: 11, off: 0, mt: 0 } : co.id === "c3" ? { on: 17, off: 0, mt: 1 } : { on: 0, off: 0, mt: 0 };
            return (
              <div key={co.id} style={{ padding: 22, borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600 }}>{co.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{co.type}</div>
                  </div>
                  <Pill tone={co.status === "Active" ? "green" : "amber"}>{co.status}</Pill>
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
                  <CamMini label="Online" v={sample.on} tone="green" />
                  <CamMini label="Offline" v={sample.off} tone="red" />
                  <CamMini label="Maint." v={sample.mt} tone="amber" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function CamMini({ label, v, tone }) {
  const c = tone === "green" ? T.green : tone === "red" ? T.red : T.amber;
  return (
    <div>
      <div style={{ fontFamily: serif, fontSize: 28, color: c, fontWeight: 700, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 11, color: T.ink3, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function CompaniesPage() {
  const [invite, setInvite] = useState(false);
  const [details, setDetails] = useState({ open: false, company: null, mode: "view" });
  const [suspend, setSuspend] = useState({ open: false, company: null });
  return (
    <>
      <PageTitle title="Companies" sub="Every company is a hard data boundary. Sites, users, alerts and incidents are scoped per company. Only Super Admin can invite new companies."
        actions={<><Btn variant="secondary" size="sm" icon={Filter}>Status</Btn><Btn variant="primary" size="sm" icon={UserPlus} onClick={() => setInvite(true)}>Invite company</Btn></>} />
      <Card padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${T.border}` }}>
          <SearchInput placeholder="Search companies…" />
        </div>
        <DataTable
          columns={["Company", "Type", "Sites", "Users", "Status", ""]}
          rows={COMPANIES.map(c => [
            <span style={{ color: T.ink, fontWeight: 500 }}>{c.name}</span>,
            <span style={{ color: T.ink2 }}>{c.type}</span>,
            <span style={{ color: T.ink2 }}>{c.sites}</span>,
            <span style={{ color: T.ink2 }}>{c.users}</span>,
            <Pill tone={c.status === "Active" ? "green" : c.status === "Suspended" ? "red" : "amber"}>{c.status}</Pill>,
            <ActionMenu actions={[
              { label: "View details", icon: Eye, onClick: () => setDetails({ open: true, company: c, mode: "view" }) },
              { label: "Edit company", icon: Pencil, onClick: () => setDetails({ open: true, company: c, mode: "edit" }) },
              { divider: true },
              { label: c.status === "Suspended" ? "Restore access" : "Suspend company",
                icon: c.status === "Suspended" ? Power : Ban,
                tone: c.status === "Suspended" ? undefined : "danger",
                onClick: () => setSuspend({ open: true, company: c }) },
            ]} />,
          ])}
        />
      </Card>
      <InviteCompanyModal open={invite} onClose={() => setInvite(false)} />
      <CompanyDetailsModal open={details.open} company={details.company} mode={details.mode} onClose={() => setDetails({ open: false, company: null, mode: "view" })} />
      <SuspendCompanyModal open={suspend.open} company={suspend.company} onClose={() => setSuspend({ open: false, company: null })} />
    </>
  );
}

function SitesPage() {
  const [addSite, setAddSite] = useState(false);
  const [toggle, setToggle] = useState({ open: false, site: null });
  const [del, setDel] = useState({ open: false, site: null });
  return (
    <>
      <PageTitle title="Sites" sub="Each site belongs to one company and carries its own cameras, alerts, and incidents. Super Admin can create or delete sites on behalf of any company."
        actions={<><Btn variant="secondary" size="sm" icon={Filter}>Risk</Btn><Btn variant="primary" size="sm" icon={Plus} onClick={() => setAddSite(true)}>Add site</Btn></>} />
      <Card padding={0}>
        <DataTable
          columns={["Site", "Company", "Type", "Risk", "Cameras", "Status", ""]}
          rows={SITES.map(s => {
            const co = COMPANIES.find(c => c.id === s.companyId);
            const isActive = s.status === "Active";
            return [
              <div>
                <div style={{ color: T.ink, fontWeight: 500 }}>{s.name}</div>
                <div style={{ color: T.ink4, fontSize: 11.5, marginTop: 2 }}>{s.address}</div>
              </div>,
              <span style={{ color: T.ink2 }}>{co?.name}</span>,
              <span style={{ color: T.ink2 }}>{s.type}</span>,
              <Pill tone={s.risk === "High" ? "red" : s.risk === "Medium" ? "amber" : "green"}>{s.risk}</Pill>,
              <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{s.cameras}</span>,
              <Pill tone={s.status === "Active" ? "green" : "amber"}>{s.status}</Pill>,
              <ActionMenu actions={[
                { label: "View site", icon: Eye },
                { label: "Edit site", icon: Pencil },
                { divider: true },
                { label: isActive ? "Deactivate site" : "Activate site", icon: Power, onClick: () => setToggle({ open: true, site: s }) },
                { label: "Delete site", icon: Trash2, tone: "danger", onClick: () => setDel({ open: true, site: s }) },
              ]} />,
            ];
          })}
        />
      </Card>
      <AddSiteModal open={addSite} onClose={() => setAddSite(false)} />
      <SiteToggleModal open={toggle.open} site={toggle.site} onClose={() => setToggle({ open: false, site: null })} />
      <DeleteSiteModal open={del.open} site={del.site} onClose={() => setDel({ open: false, site: null })} />
    </>
  );
}

function CamerasPage() {
  const [addCam, setAddCam] = useState(false);
  const [remove, setRemove] = useState({ open: false, camera: null });
  return (
    <>
      <PageTitle title="Cameras & devices" phaseTag="RTSP streaming · Phase 2"
        sub="Phase 1 shows status only. Super Admin can add or remove cameras from any company site."
        actions={<Btn variant="primary" size="sm" icon={Plus} onClick={() => setAddCam(true)}>Add camera</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Online" value="78" accent={T.green} icon={Wifi} />
        <StatCard label="Offline" value="6" accent={T.red} icon={WifiOff} />
        <StatCard label="Maintenance" value="2" accent={T.amber} icon={Wrench} />
        <StatCard label="Unknown" value="0" icon={Circle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CAMERAS.map(c => (
          <CameraTile key={c.id} c={c} site={SITES.find(s => s.id === c.siteId)}
            menu={<ActionMenu actions={[
              { label: "View camera", icon: Eye },
              { label: "Edit camera", icon: Pencil },
              { divider: true },
              { label: "Remove camera", icon: Trash2, tone: "danger", onClick: () => setRemove({ open: true, camera: c }) },
            ]} />} />
        ))}
      </div>
      <AddCameraModal open={addCam} onClose={() => setAddCam(false)} />
      <RemoveCameraModal open={remove.open} camera={remove.camera} onClose={() => setRemove({ open: false, camera: null })} />
    </>
  );
}

function CameraTile({ c, site, menu }) {
  return (
    <Card padding={14}>
      <div style={{ aspectRatio: "16/9", borderRadius: 8, background: T.navy, position: "relative", overflow: "hidden", marginBottom: 12 }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: c.status === "Online" ? 0.12 : 0.05 }}>
          <defs><pattern id={`gr${c.id}`} width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.5" fill="#fff" /></pattern></defs>
          <rect width="100%" height="100%" fill={`url(#gr${c.id})`} />
        </svg>
        {c.status === "Online" ? (
          <>
            <div style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 4, background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#fff" }} /> Live
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: sans, fontVariantNumeric: "tabular-nums", fontWeight: 500, background: "rgba(0,0,0,0.4)", padding: "2px 7px", borderRadius: 4 }}>09:53:42</div>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.25 }}><Camera size={32} color="#fff" /></div>
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
            <div>
              {c.status === "Offline" && <WifiOff size={26} />}
              {c.status === "Maintenance" && <Wrench size={26} />}
              {c.status === "Unknown" && <Circle size={26} />}
              <div style={{ fontSize: 11, marginTop: 8, fontWeight: 500, letterSpacing: 0.5 }}>{c.status.toUpperCase()}</div>
            </div>
          </div>
        )}
        {c.warning && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: T.amberSoft, color: T.amber, fontSize: 10.5, padding: "5px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${T.amber}` }}>
            <AlertTriangle size={11} /> {c.warning}
          </div>
        )}
        <div style={{ position: "absolute", bottom: c.warning ? 32 : 10, right: 10 }}><Pill tone={camTone(c.status)} size="sm">{c.status}</Pill></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{c.name}</div>
          <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 3 }}>{c.location}</div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 3 }}>{site?.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.ink4, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c.lastChecked}</span>
          {menu}
        </div>
      </div>
    </Card>
  );
}

function AlertsPage() {
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageTitle title="Alerts" sub="Every signal across all companies. Manual creation only in Phase 1 — each alert automatically opens a linked incident."
        actions={<><Btn variant="secondary" size="sm" icon={Filter}>Filter</Btn><Btn variant="primary" size="sm" icon={Plus} onClick={() => setCreate(true)}>Create alert</Btn></>} />
      <Card padding={0}>
        <DataTable
          columns={["Alert", "Site", "Severity", "Status", "Source", "Time", ""]}
          rows={ALERTS.map(a => {
            const site = SITES.find(s => s.id === a.siteId);
            return [
              <span style={{ color: T.ink, fontWeight: 500 }}>{a.title}</span>,
              <span style={{ color: T.ink2 }}>{site?.name}</span>,
              <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>,
              <Pill tone="gray">{a.status}</Pill>,
              <span style={{ color: T.ink2, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {a.source}
                {a.source.includes("AI") && <PhaseTag>AI · Phase 2</PhaseTag>}
              </span>,
              <span style={{ color: T.ink3, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{a.createdAt}</span>,
              <ActionMenu actions={[
                { label: "View alert", icon: Eye },
                { label: "Open incident", icon: ArrowUpRight },
                { divider: true },
                { label: "Close alert", icon: X, tone: "danger" },
              ]} />,
            ];
          })}
        />
      </Card>
      <CreateAlertModal open={create} onClose={() => setCreate(false)} mode="admin" />
    </>
  );
}

function IncidentsPage() {
  return (
    <>
      <PageTitle title="Incidents" sub="Open → Dispatched → In Progress → Resolved → Closed. Full audit trail per incident."
        actions={<Btn variant="secondary" size="sm" icon={Filter}>Status</Btn>} />
      <Card padding={0}>
        <DataTable
          columns={["Incident", "Site", "Severity", "Status", "Guard", "Started", ""]}
          rows={INCIDENTS.map(inc => {
            const site = SITES.find(s => s.id === inc.siteId);
            const guard = GUARDS.find(g => g.id === inc.guardId);
            return [
              <span style={{ color: T.ink, fontWeight: 500 }}>{inc.title}</span>,
              <span style={{ color: T.ink2 }}>{site?.name}</span>,
              <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>,
              <Pill tone={incTone(inc.status)}>{inc.status}</Pill>,
              guard ? <span style={{ color: T.ink2 }}>{guard.name}</span> : <span style={{ color: T.ink4 }}>Unassigned</span>,
              <span style={{ color: T.ink3, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{inc.startedAt}</span>,
              <RowActions />,
            ];
          })}
        />
      </Card>
    </>
  );
}

function GuardsPage() {
  return (
    <>
      <PageTitle title="Guards" sub="Field responders across all zones. Status updates from the mobile app in real-time."
        actions={<Btn variant="primary" size="sm" icon={Plus}>Add guard</Btn>} />
      <Card padding={0}>
        <DataTable
          columns={["Guard", "Zone", "Phone", "Shifts", "Status", ""]}
          rows={GUARDS.map(g => [
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>{g.name.split(" ").map(p=>p[0]).join("")}</div>
              <span style={{ color: T.ink, fontWeight: 500 }}>{g.name}</span>
            </div>,
            <span style={{ color: T.ink2 }}>{g.zone}</span>,
            <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>{g.phone}</span>,
            <span style={{ color: T.ink3, fontSize: 12 }}>{g.shifts}</span>,
            <Pill tone={g.status === "Available" ? "green" : g.status === "Off-duty" ? "gray" : "amber"}>{g.status}</Pill>,
            <RowActions />,
          ])}
        />
      </Card>
    </>
  );
}

// ===== Reports =====
function ReportsPage() {
  return (
    <>
      <PageTitle title="Reports" phaseTag="AI insights · Phase 3"
        sub="Monthly summaries, response-time analytics, and site-level reports. Downloadable as PDF or CSV."
        actions={<><Btn variant="secondary" size="sm" icon={Calendar}>Date range</Btn><Btn variant="primary" size="sm" icon={Download}>Generate new report</Btn></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Reports generated" value="47" icon={FileText} supporting={<><Pill tone="blue">12 this month</Pill></>} />
        <StatCard label="Avg incidents/month" value="11.4" icon={AlertTriangle} supporting={<><Pill tone="green">↓ 8% vs Q4</Pill></>} />
        <StatCard label="Avg response time" value="9m" icon={Clock} supporting={<><Pill tone="green">↓ 2m vs avg</Pill></>} />
        <StatCard label="Resolution rate" value="96%" icon={CheckCircle2} supporting={<><Pill tone="green">+3% vs avg</Pill></>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Incidents over time</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Last 6 months · all companies</div>
          </div>
          <div style={{ padding: 24 }}>
            <SimpleBarChart data={[
              { label: "Dec", value: 8 }, { label: "Jan", value: 11 },
              { label: "Feb", value: 13 }, { label: "Mar", value: 9 },
              { label: "Apr", value: 12 }, { label: "May", value: 9 },
            ]} />
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Top incident types</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Apr 2026</div>
          </div>
          <div style={{ padding: 22 }}>
            {[
              { name: "Suspicious activity", count: 14, pct: 78 },
              { name: "Door / access events", count: 9, pct: 50 },
              { name: "Camera offline", count: 8, pct: 44 },
              { name: "After-hours motion", count: 6, pct: 33 },
              { name: "Other", count: 3, pct: 17 },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.ink2, marginBottom: 5 }}>
                  <span>{r.name}</span>
                  <span style={{ fontWeight: 600, color: T.ink }}>{r.count}</span>
                </div>
                <div style={{ height: 6, background: T.surfaceSubtle, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: T.blue, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding={0}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Recent reports</div>
        </div>
        <DataTable
          columns={["Report", "Scope", "Type", "Incidents", "Date", "Size", ""]}
          rows={REPORTS.map(r => [
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.blueSoft, display: "grid", placeItems: "center" }}><FileText size={13} color={T.blue} /></div>
              <span style={{ color: T.ink, fontWeight: 500 }}>{r.name}</span>
            </div>,
            <span style={{ color: T.ink2 }}>{r.company}</span>,
            <Pill tone="gray">{r.type}</Pill>,
            <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{r.incidents}</span>,
            <span style={{ color: T.ink3, fontSize: 12.5 }}>{r.date}</span>,
            <span style={{ color: T.ink4, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{r.size}</span>,
            <Btn variant="ghost" size="sm" icon={Download}>Download</Btn>,
          ])}
        />
      </Card>
    </>
  );
}

function SimpleBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, paddingTop: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{
              height: `${(d.value / max) * 100}%`,
              background: i === data.length - 1 ? T.blue : T.blueSoft,
              borderRadius: "6px 6px 0 0",
              position: "relative",
              transition: "all .3s",
            }}>
              <div style={{
                position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums",
              }}>{d.value}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.ink3, fontWeight: 500 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ===== Audit log =====
function AuditLogPage() {
  return (
    <>
      <PageTitle title="Audit log"
        sub="Every action across the platform — who did what, when. Tamper-evident, retained for 12 months."
        actions={<><Btn variant="secondary" size="sm" icon={Filter}>Filter</Btn><Btn variant="secondary" size="sm" icon={Download}>Export CSV</Btn></>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Events today" value="247" icon={Activity} />
        <StatCard label="Unique actors" value="18" icon={Users} />
        <StatCard label="Critical actions" value="9" icon={AlertTriangle} accent={T.amber} />
        <StatCard label="System events" value="84" icon={Cpu} />
      </div>

      <Card padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <SearchInput placeholder="Search by actor, action, or target…" />
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {["All", "Today", "This week", "This month"].map((f, i) => (
              <button key={f} style={{
                padding: "5px 11px", borderRadius: 999, fontSize: 11.5,
                border: `1px solid ${i === 1 ? T.navy : T.border}`,
                background: i === 1 ? T.navy : T.surface,
                color: i === 1 ? "#fff" : T.ink2,
                fontWeight: 500, cursor: "pointer", fontFamily: sans,
              }}>{f}</button>
            ))}
          </div>
        </div>
        <div>
          {ACTIVITY.map((a, i) => {
            const Icon = a.icon;
            const colors = { red: { bg: T.redSoft, fg: T.red }, amber: { bg: T.amberSoft, fg: T.amber }, green: { bg: T.greenSoft, fg: T.green }, blue: { bg: T.blueSoft, fg: T.blue }, gray: { bg: T.graySoft, fg: T.gray } };
            const c = colors[a.tone];
            return (
              <div key={i} style={{
                display: "flex", gap: 14, padding: "16px 22px",
                borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: c.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon size={15} color={c.fg} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: T.ink }}>
                    <span style={{ fontWeight: 600 }}>{a.who}</span>
                    <span style={{ color: T.ink3 }}> · {a.what} · </span>
                    <span style={{ color: T.ink2 }}>{a.target}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{a.when}</div>
                </div>
                <button style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: T.ink4 }}><Eye size={13} /></button>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ===== Settings =====
function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "roles", label: "Roles & permissions", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Zap },
    { id: "billing", label: "Billing & plans", icon: CreditCard },
  ];

  return (
    <>
      <PageTitle title="Settings" sub="Manage your platform configuration." />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, background: active ? T.surface : "transparent",
                border: `1px solid ${active ? T.border : "transparent"}`,
                color: active ? T.ink : T.ink2, fontSize: 13,
                fontWeight: active ? 600 : 500, cursor: "pointer", textAlign: "left", fontFamily: sans,
              }}>
                <Icon size={14} color={active ? T.blue : T.ink3} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div>
          {tab === "profile" && <SettingsProfile />}
          {tab === "roles" && <SettingsRoles />}
          {tab === "notifications" && <SettingsNotifications />}
          {tab === "integrations" && <SettingsIntegrations />}
          {tab === "billing" && <SettingsBilling />}
        </div>
      </div>
    </>
  );
}

function SettingsSection({ title, sub, children }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: serif, fontSize: 19, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{sub}</div>}
      </div>
      {children}
    </Card>
  );
}

function SettingsProfile() {
  return (
    <>
      <SettingsSection title="Profile" sub="Your personal information and account preferences.">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, fontFamily: sans }}>AZ</div>
          <div>
            <Btn variant="secondary" size="sm">Upload photo</Btn>
            <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 6 }}>JPG, PNG up to 2MB</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Full name</label><input defaultValue="Amar Zindani" style={inputCss} /></div>
          <div><label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Email</label><input defaultValue="amar@sunsetliquor.com" style={inputCss} /></div>
          <div><label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Phone</label><input defaultValue="+1 (555) 000-0420" style={inputCss} /></div>
          <div><label style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>Time zone</label><input defaultValue="(UTC-05:00) Eastern Time" style={inputCss} /></div>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary">Cancel</Btn>
          <Btn>Save changes</Btn>
        </div>
      </SettingsSection>

      <SettingsSection title="Password & security" sub="Update your password and enable two-factor authentication.">
        <KV k="Password" v={<Btn variant="secondary" size="sm">Change password</Btn>} />
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <KV k="Two-factor authentication" v={<Pill tone="green">Enabled</Pill>} />
        </div>
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <KV k="Active sessions" v={<span style={{ color: T.ink2 }}>3 devices</span>} />
        </div>
      </SettingsSection>
    </>
  );
}

function SettingsRoles() {
  return (
    <SettingsSection title="Roles & permissions" sub="Built-in role definitions across your organization.">
      <Card padding={0} style={{ marginTop: 0 }}>
        <DataTable
          columns={["Role", "Users", "Permissions", ""]}
          rows={ROLES_PERMS.map(r => [
            <span style={{ color: T.ink, fontWeight: 600 }}>{r.role}</span>,
            <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{r.count}</span>,
            <span style={{ color: T.ink3, fontSize: 12.5 }}>{r.perms}</span>,
            <Btn variant="ghost" size="sm" icon={Pencil}>Edit</Btn>,
          ])}
        />
      </Card>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <Btn variant="secondary" size="sm" icon={Plus}>Create custom role</Btn>
        <PhaseTag>Custom roles · Phase 2</PhaseTag>
      </div>
    </SettingsSection>
  );
}

function SettingsNotifications() {
  const rows = [
    { event: "New critical alert", channels: ["Email", "Push"], on: true },
    { event: "Incident assigned", channels: ["Email", "Push"], on: true },
    { event: "Incident resolved", channels: ["Email"], on: true },
    { event: "Camera offline", channels: ["Email"], on: true },
    { event: "Weekly summary", channels: ["Email"], on: true },
    { event: "SMS notifications", channels: ["SMS"], on: false, phase: true },
  ];
  return (
    <SettingsSection title="Notifications" sub="Choose how and when you're notified.">
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 500 }}>{r.event}</span>
              {r.phase && <PhaseTag />}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {r.channels.map(ch => <Pill key={ch} tone="gray">{ch}</Pill>)}
            </div>
          </div>
          <Toggle on={r.on} />
        </div>
      ))}
    </SettingsSection>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 999,
      background: on ? T.blue : T.borderStrong, position: "relative", cursor: "pointer",
      transition: "background .15s",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: 999, background: "#fff",
        transition: "left .15s",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}

function SettingsIntegrations() {
  const list = [
    { name: "SendGrid", desc: "Transactional emails for alerts and reports", connected: true, icon: Mail },
    { name: "Slack", desc: "Real-time alerts to your team channels", connected: true, icon: MessageSquare },
    { name: "Twilio", desc: "SMS notifications and voice calls", connected: false, phase: true, icon: Phone },
    { name: "Stripe", desc: "Subscription billing and invoicing", connected: false, phase: true, icon: CreditCard },
    { name: "Webhooks", desc: "Push events to your own systems", connected: false, icon: Zap },
    { name: "AWS Kinesis", desc: "Stream camera feeds for AI processing", connected: false, phase: true, icon: Cctv },
  ];
  return (
    <SettingsSection title="Integrations" sub="Connect Primex to your existing tools.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        {list.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} style={{ padding: 16, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: T.blueSoft, display: "grid", placeItems: "center" }}><Icon size={16} color={T.blue} /></div>
                  <div>
                    <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{it.desc}</div>
                  </div>
                </div>
                {it.phase && <PhaseTag />}
              </div>
              <div style={{ marginTop: 12 }}>
                {it.connected ? <Pill tone="green">Connected</Pill> : <Btn variant="secondary" size="sm">Connect</Btn>}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}

function SettingsBilling() {
  return (
    <SettingsSection title="Billing & plans" sub="Manage your subscription and payment methods.">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 18, background: T.bg, borderRadius: 10, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700 }}>Professional</div>
            <PhaseTag>Stripe billing · Phase 2</PhaseTag>
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 4 }}>23 active sites · 86 cameras · unlimited users</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: serif, fontSize: 26, color: T.ink, fontWeight: 700 }}>$1,840 <span style={{ fontSize: 13, color: T.ink3, fontWeight: 400 }}>/mo</span></div>
          <Btn variant="secondary" size="sm" style={{ marginTop: 8 }}>Upgrade plan</Btn>
        </div>
      </div>

      <KV k="Next invoice" v="June 1, 2026" />
      <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Payment method" v={<span>Visa •••• 4242 <a style={{ color: T.blue, marginLeft: 8, cursor: "pointer" }}>Update</a></span>} /></div>
      <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Billing email" v="billing@sunsetliquor.com" /></div>
      <div style={{ borderTop: `1px solid ${T.border}` }}><KV k="Tax ID" v="—" /></div>
    </SettingsSection>
  );
}

// =========================================================
// DISPATCHER CONSOLE
// =========================================================
function DispatcherView() {
  const [section, setSection] = useState("queue");
  const items = [
    { id: "queue", label: "Alert queue", icon: Bell, count: 4 },
    { id: "incidents", label: "Open incidents", icon: AlertTriangle, count: 3 },
    { id: "dispatch", label: "Dispatch board", icon: Radio, count: 2 },
    { id: "guards", label: "Guards on duty", icon: Users, count: 3 },
    { id: "activity", label: "Activity log", icon: ClipboardList },
  ];
  const labels = { queue: "Alert queue", incidents: "Open incidents", dispatch: "Dispatch board", guards: "Guards on duty", activity: "Activity log" };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 49px)" }}>
      <Sidebar items={items} active={section} setActive={setSection}
        user={{ name: "Diana Okafor", role: "Dispatcher · Shift A" }}
        scope="Sunset Liquor" />
      <main style={{ flex: 1, background: T.bg, display: "flex", flexDirection: "column" }}>
        <PageStrip trail={["Primex", "Dispatcher", labels[section]]} />
        {section === "queue" && <DispatcherQueue />}
        {section === "incidents" && <div style={{ padding: "32px 36px" }}><OpenIncidents /></div>}
        {section === "dispatch" && <div style={{ padding: "32px 36px" }}><DispatchBoard /></div>}
        {section === "guards" && <div style={{ padding: "32px 36px" }}><GuardsOnDuty /></div>}
        {section === "activity" && <div style={{ padding: "32px 36px" }}><DispatcherActivity /></div>}
      </main>
    </div>
  );
}

function DispatcherQueue() {
  const [selectedId, setSelectedId] = useState("a1");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = ALERTS.filter(a => filter === "All" ? true : a.severity === filter);
  const selected = ALERTS.find(a => a.id === selectedId);
  const site = selected && SITES.find(s => s.id === selected.siteId);
  const camera = selected && CAMERAS.find(c => c.id === selected.cameraId);
  const dispatcherCompany = COMPANIES.find(c => c.id === "c1");

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", flex: 1, minHeight: 0 }}>
        <div style={{ borderRight: `1px solid ${T.border}`, background: T.surface, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <Label>Live queue</Label>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 26, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: 0 }}>Alerts</h2>
                  <span style={{ color: T.ink4, fontFamily: serif, fontStyle: "italic", fontSize: 22 }}>· {filtered.length}</span>
                </div>
              </div>
              <Btn size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>Create alert</Btn>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              {["All", "Critical", "Warning", "Info"].map(f => {
                const active = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "4px 11px", borderRadius: 999, fontSize: 11.5,
                    border: `1px solid ${active ? T.navy : T.border}`,
                    background: active ? T.navy : T.surface,
                    color: active ? "#fff" : T.ink2,
                    fontWeight: 500, cursor: "pointer", fontFamily: sans,
                  }}>{f}</button>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.map(a => {
              const st = SITES.find(s => s.id === a.siteId);
              const isSel = a.id === selectedId;
              const sevColor = a.severity === "Critical" ? T.red : a.severity === "Warning" ? T.amber : T.blue;
              return (
                <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "16px 22px", display: "flex", gap: 12,
                  background: isSel ? T.blueSofter : T.surface,
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${isSel ? sevColor : "transparent"}`,
                  fontFamily: sans,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{a.title}</div>
                      {a.status === "New" && a.severity === "Critical" && <LiveDot />}
                    </div>
                    <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{st?.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>
                      <Pill tone="gray">{a.status}</Pill>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: T.ink4, fontVariantNumeric: "tabular-nums" }}>{a.createdAt}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflow: "auto" }}>
          {selected && (
            <div style={{ padding: "32px 36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                    <Pill tone={sevTone(selected.severity)}>{selected.severity}</Pill>
                    <Pill tone="gray">{selected.status}</Pill>
                    <span style={{ fontSize: 12, color: T.ink3 }}>· {selected.source} · {selected.createdAt}</span>
                  </div>
                  <h1 style={{ fontFamily: serif, fontSize: 32, color: T.ink, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.15, margin: 0 }}>{selected.title}</h1>
                  <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 13, color: T.ink2 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} color={T.ink3}/> {site?.name}</span>
                    {camera && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Camera size={13} color={T.ink3}/> {camera.name}</span>}
                  </div>
                </div>
                <Btn variant="ghost" size="sm" icon={X}>Dismiss</Btn>
              </div>

              <div style={{ marginTop: 24 }}>
                <CameraTile c={camera || { id: "preview", name: site?.name || "Site overview", location: "Live feed", status: "Online", lastChecked: "Just now", warning: null }} site={site} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 22 }}>
                <Card>
                  <Label style={{ marginBottom: 12 }}>Description</Label>
                  <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.65 }}>{selected.description}</div>
                  <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                    <Label style={{ marginBottom: 12 }}>Timeline</Label>
                    <Timeline events={[
                      { t: selected.createdAt, label: "Alert created", by: selected.source },
                      { t: "2m ago", label: "Reviewed by dispatcher", by: "Diana Okafor" },
                    ]} />
                  </div>
                </Card>
                <Card>
                  <Label style={{ marginBottom: 12 }}>Actions</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Btn icon={AlertTriangle} full onClick={() => setModal(true)}>Convert to incident</Btn>
                    <Btn variant="secondary" icon={ArrowUpRight} full>Escalate</Btn>
                    <Btn variant="secondary" icon={Check} full>Close alert</Btn>
                  </div>
                  <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                    <Label style={{ marginBottom: 12 }}>Site context</Label>
                    <KV k="Risk level" v={<Pill tone={site?.risk === "High" ? "red" : "amber"}>{site?.risk}</Pill>} />
                    <KV k="Type" v={site?.type} />
                    <KV k="Cameras" v={`${site?.cameras} configured`} />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      {modal && <AssignModal onClose={() => setModal(false)} alert={selected} />}
      <CreateAlertModal open={createOpen} onClose={() => setCreateOpen(false)} mode="dispatcher" lockedCompany={dispatcherCompany} />
    </>
  );
}

function OpenIncidents() {
  const open = INCIDENTS.filter(i => !["Resolved", "Closed"].includes(i.status));
  return (
    <>
      <PageTitle title="Open incidents" sub="All incidents currently active in your scope. Click an incident to view full details and timeline." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {open.map(inc => {
          const site = SITES.find(s => s.id === inc.siteId);
          const guard = GUARDS.find(g => g.id === inc.guardId);
          return (
            <Card key={inc.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>
                <Pill tone={incTone(inc.status)}>{inc.status}</Pill>
              </div>
              <div style={{ fontFamily: serif, fontSize: 19, color: T.ink, fontWeight: 700, letterSpacing: -0.3, marginTop: 14, lineHeight: 1.2 }}>{inc.title}</div>
              <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={11}/> {site?.name}</div>
              <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 12, lineHeight: 1.5 }}>{inc.notes}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11.5, color: T.ink3 }}>
                  {guard ? <span><strong style={{ color: T.ink, fontWeight: 600 }}>{guard.name}</strong> · {inc.startedAt}</span> : <span style={{ color: T.ink4 }}>Unassigned · {inc.startedAt}</span>}
                </div>
                <Btn variant="ghost" size="sm" icon={ArrowRight}>Open</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function DispatchBoard() {
  const cols = [
    { title: "Open", status: ["Open"], tone: "gray" },
    { title: "Dispatched", status: ["Dispatched"], tone: "amber" },
    { title: "In Progress", status: ["In Progress"], tone: "blue" },
    { title: "Resolved / Closed", status: ["Resolved", "Closed"], tone: "green" },
  ];
  return (
    <>
      <PageTitle title="Dispatch board" phaseTag="Drag & drop · Phase 2"
        sub="A Kanban view of every incident moving through the pipeline." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {cols.map(col => {
          const items = INCIDENTS.filter(i => col.status.includes(i.status));
          return (
            <div key={col.title}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: col.tone === "gray" ? T.gray : col.tone === "amber" ? T.amber : col.tone === "blue" ? T.blue : T.green }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{col.title}</span>
                </div>
                <span style={{ fontSize: 11.5, color: T.ink3, fontWeight: 600, background: T.surfaceSubtle, padding: "1px 8px", borderRadius: 999 }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.length === 0 ? (
                  <div style={{ padding: 22, border: `1px dashed ${T.border}`, borderRadius: 10, textAlign: "center", fontSize: 12, color: T.ink4 }}>No incidents</div>
                ) : items.map(inc => {
                  const site = SITES.find(s => s.id === inc.siteId);
                  const guard = GUARDS.find(g => g.id === inc.guardId);
                  return (
                    <Card key={inc.id} padding={14}>
                      <Pill tone={sevTone(inc.severity)} size="sm">{inc.severity}</Pill>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 10, lineHeight: 1.3 }}>{inc.title}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 6 }}>{site?.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.ink4 }}>
                        <span>{guard?.name || "Unassigned"}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{inc.startedAt}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function GuardsOnDuty() {
  return (
    <>
      <PageTitle title="Guards on duty" sub="Live status of every guard in your scope. Tap to view their current assignment or call directly." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {GUARDS.map(g => {
          const incident = INCIDENTS.find(i => i.guardId === g.id && !["Resolved", "Closed"].includes(i.status));
          return (
            <Card key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>{g.name.split(" ").map(p=>p[0]).join("")}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: serif, letterSpacing: -0.2 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{g.zone} · {g.phone}</div>
                </div>
                <Pill tone={g.status === "Available" ? "green" : g.status === "Off-duty" ? "gray" : "amber"}>{g.status}</Pill>
              </div>
              {incident && (
                <div style={{ marginTop: 14, padding: 12, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Current incident</div>
                  <div style={{ fontSize: 13, color: T.ink, fontWeight: 500, marginTop: 4 }}>{incident.title}</div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 4 }}>Started {incident.startedAt}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Btn variant="secondary" size="sm" icon={Phone}>Call</Btn>
                <Btn variant="secondary" size="sm" icon={MessageSquare}>Message</Btn>
                <Btn variant="secondary" size="sm" icon={Eye}>View profile</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function DispatcherActivity() {
  return (
    <>
      <PageTitle title="Activity log" sub="Every action taken in your dispatch scope today." />
      <Card padding={0}>
        {ACTIVITY.slice(0, 8).map((a, i, arr) => {
          const Icon = a.icon;
          const colors = { red: { bg: T.redSoft, fg: T.red }, amber: { bg: T.amberSoft, fg: T.amber }, green: { bg: T.greenSoft, fg: T.green }, blue: { bg: T.blueSoft, fg: T.blue }, gray: { bg: T.graySoft, fg: T.gray } };
          const c = colors[a.tone];
          return (
            <div key={i} style={{ display: "flex", gap: 14, padding: "16px 22px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: c.bg, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={15} color={c.fg} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: T.ink }}>
                  <span style={{ fontWeight: 600 }}>{a.who}</span>
                  <span style={{ color: T.ink3 }}> · {a.what} · </span>
                  <span style={{ color: T.ink2 }}>{a.target}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 3 }}>{a.when}</div>
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}

function Timeline({ events }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 9, height: 9, borderRadius: 999, background: i === 0 ? T.red : T.ink4, marginTop: 4 }} />
            {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4 }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{e.label}</div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{e.t} · {e.by}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignModal({ onClose, alert }) {
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [done, setDone] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,18,32,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 200, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", border: `1px solid ${T.border}`, fontFamily: sans, boxShadow: "0 24px 64px -16px rgba(11,18,32,0.25)" }}>
        {!done ? (
          <>
            <Label>Step 1 of 2 · Assign guard</Label>
            <h2 style={{ fontFamily: serif, fontSize: 26, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: "6px 0 6px" }}>Dispatch a responder</h2>
            <div style={{ fontSize: 13, color: T.ink3 }}>An incident will be created and linked to: <span style={{ color: T.ink, fontWeight: 500 }}>{alert?.title}</span></div>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              {GUARDS.filter(g => g.status !== "Off-duty").map(g => (
                <button key={g.id} onClick={() => setSelectedGuard(g.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px solid ${selectedGuard === g.id ? T.blue : T.border}`, background: selectedGuard === g.id ? T.blueSofter : T.surface, borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: sans }}>
                  <div style={{ width: 34, height: 34, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>{g.name.split(" ").map(p=>p[0]).join("")}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3 }}>{g.zone}</div>
                  </div>
                  <Pill tone={g.status === "Available" ? "green" : "amber"}>{g.status}</Pill>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn icon={Send} onClick={() => setDone(true)}>Send dispatch</Btn>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 8px" }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, background: T.greenSoft, display: "grid", placeItems: "center", margin: "0 auto" }}><CheckCircle2 size={30} color={T.green} /></div>
            <h2 style={{ fontFamily: serif, fontSize: 26, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: "16px 0 6px" }}>Dispatched.</h2>
            <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.55, maxWidth: 360, margin: "0 auto" }}>Incident created and sent to <span style={{ color: T.ink, fontWeight: 600 }}>{GUARDS.find(g => g.id === selectedGuard)?.name}</span>. They'll receive a push notification and email.</div>
            <Btn onClick={onClose} style={{ marginTop: 18 }}>Done</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// GUARD MOBILE
// =========================================================
function GuardView() {
  const [view, setView] = useState("list");
  const [status, setStatus] = useState("assigned");
  const incident = INCIDENTS[0];
  const site = SITES.find(s => s.id === incident.siteId);
  return (
    <div style={{ minHeight: "calc(100vh - 49px)", background: T.bg, fontFamily: sans, display: "grid", placeItems: "center", padding: "40px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 60, alignItems: "center", maxWidth: 1180, width: "100%" }}>
        <div>
          <Label>Field operations</Label>
          <h2 style={{ fontFamily: serif, fontSize: 38, color: T.ink, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1, margin: "8px 0 14px" }}>Mobile-first by design.</h2>
          <p style={{ fontSize: 14, color: T.ink3, lineHeight: 1.65, maxWidth: 380 }}>
            Guards open Primex on their phone. They see <span style={{ color: T.ink, fontWeight: 600 }}>only their own assignments</span> — no other companies, no admin tools, no clutter.
          </p>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <BulletLine text="Cards instead of tables — no squeezed text on small screens" />
            <BulletLine text="Accept → En route → Arrived → Resolved status flow" />
            <BulletLine text="Tap-to-call site contact, navigate, upload notes & photos" />
            <BulletLine text="Strict isolation: scoped to their company & assignments only" />
          </div>
        </div>
        <div style={{ width: 348, height: 720, background: T.ink, borderRadius: 48, padding: 10, boxShadow: "0 40px 80px -24px rgba(11,18,32,0.4), 0 12px 32px -8px rgba(11,18,32,0.25)" }}>
          <div style={{ background: T.bg, width: "100%", height: "100%", borderRadius: 40, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 26, background: T.ink, borderRadius: "0 0 18px 18px", zIndex: 10 }} />
            <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", fontSize: 11.5, fontFamily: sans, fontWeight: 600, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>
              <span>9:53</span>
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>● ● ●</span>
            </div>
            {view === "list" ? (
              <MobileList incident={incident} site={site} onOpen={() => setView("detail")} />
            ) : (
              <MobileDetail incident={incident} site={site} status={status} setStatus={setStatus} onBack={() => setView("list")} />
            )}
          </div>
        </div>
        <div>
          <Label>Walk the flow</Label>
          <h3 style={{ fontFamily: serif, fontSize: 24, color: T.ink, fontWeight: 700, letterSpacing: -0.4, margin: "8px 0 16px" }}>Tap through a live dispatch.</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { n: "1", label: "Open assignments list", when: () => view === "list", act: () => setView("list") },
              { n: "2", label: "Tap an incident card", when: () => view === "detail" && status === "assigned", act: () => { setView("detail"); setStatus("assigned"); } },
              { n: "3", label: "Accept the dispatch", when: () => status === "accepted", act: () => { setView("detail"); setStatus("accepted"); } },
              { n: "4", label: "Mark en route", when: () => status === "enroute", act: () => { setView("detail"); setStatus("enroute"); } },
              { n: "5", label: "Check in on arrival", when: () => status === "arrived", act: () => { setView("detail"); setStatus("arrived"); } },
              { n: "6", label: "Resolve & close", when: () => status === "resolved", act: () => { setView("detail"); setStatus("resolved"); } },
            ].map((s, i) => {
              const active = s.when();
              return (
                <button key={i} onClick={s.act} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: active ? T.surface : "transparent", border: `1px solid ${active ? T.border : "transparent"}`, cursor: "pointer", textAlign: "left", fontFamily: sans }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: active ? T.blue : T.surfaceSubtle, color: active ? "#fff" : T.ink3, display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700 }}>{s.n}</div>
                  <span style={{ fontSize: 13, color: active ? T.ink : T.ink2, fontWeight: active ? 500 : 400 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BulletLine({ text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 18, height: 18, borderRadius: 999, background: T.blueSoft, display: "grid", placeItems: "center", marginTop: 1, flexShrink: 0 }}>
        <Check size={11} color={T.blue} />
      </div>
      <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function MobileList({ incident, site, onOpen }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "10px 18px 28px" }}>
      <div style={{ marginTop: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 10.5, color: T.ink4, letterSpacing: 1.3, textTransform: "uppercase", fontWeight: 600 }}>Wed · May 13</div>
        <div style={{ fontFamily: serif, fontSize: 26, color: T.ink, fontWeight: 700, letterSpacing: -0.5, marginTop: 4, lineHeight: 1.15 }}>
          Hi Diana<span style={{ color: T.ink3, fontWeight: 400, fontStyle: "italic" }}> · 2 assignments</span>
        </div>
      </div>
      <button onClick={onOpen} style={{ width: "100%", textAlign: "left", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, background: T.surface, cursor: "pointer", fontFamily: sans }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Pill tone="red">Critical</Pill>
          <LiveDot />
        </div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: T.ink, marginTop: 12, lineHeight: 1.3, letterSpacing: -0.2 }}>{incident.title}</div>
        <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={11} /> {site?.name}</div>
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 11, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: T.ink3 }}>
          <span>Dispatched {incident.startedAt}</span>
          <span style={{ color: T.blue, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>Open <ChevronRight size={13} /></span>
        </div>
      </button>
      <div style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, background: T.surface, marginTop: 12, opacity: 0.65 }}>
        <Pill tone="amber">Warning</Pill>
        <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: T.ink, marginTop: 12, lineHeight: 1.3, letterSpacing: -0.2 }}>Camera check — Back Storage</div>
        <div style={{ fontSize: 12, color: T.ink3, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={11} /> Sunset Liquor — Bay Ridge</div>
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 11, display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.ink3 }}><span>Queued</span><span>Later today</span></div>
      </div>
    </div>
  );
}

function MobileDetail({ incident, site, status, setStatus, onBack }) {
  const stages = [
    { key: "assigned", label: "Accept dispatch", next: "accepted", icon: Check },
    { key: "accepted", label: "Mark en route", next: "enroute", icon: Navigation },
    { key: "enroute", label: "Check in (arrived)", next: "arrived", icon: MapPin },
    { key: "arrived", label: "Mark resolved", next: "resolved", icon: CheckCircle2 },
  ];
  const current = stages.find(s => s.key === status);
  const label = { assigned: "Assigned to you", accepted: "Accepted", enroute: "En route", arrived: "On site", resolved: "Resolved" }[status];
  const tone = status === "resolved" ? "green" : status === "assigned" ? "amber" : "blue";
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "10px 18px 28px", fontFamily: sans }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 0, background: "transparent", border: "none", color: T.ink2, fontSize: 12.5, cursor: "pointer", marginTop: 8, marginBottom: 14, fontFamily: sans, fontWeight: 500 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <Pill tone="red">Critical</Pill>
      <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, marginTop: 10 }}>{incident.title}</div>
      <div style={{ marginTop: 16, padding: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Your status</Label>
          <Pill tone={tone}>{label}</Pill>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={15} color={T.ink3} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{site?.name}</div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{site?.address}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn variant="secondary" size="sm" icon={Navigation}>Directions</Btn>
          <Btn variant="secondary" size="sm" icon={Phone}>Call site</Btn>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <Label style={{ marginBottom: 6 }}>Dispatcher notes</Label>
        <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55 }}>{incident.notes}</div>
      </div>
      {status !== "resolved" && (
        <>
          <div style={{ marginTop: 12, padding: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <Label style={{ marginBottom: 8 }}>Your notes</Label>
            <textarea placeholder="Type what you're seeing…" style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: sans, resize: "none", outline: "none", background: T.bg, color: T.ink, marginBottom: 8 }} />
            <Btn variant="secondary" size="sm" icon={Upload} full>Attach photo</Btn>
          </div>
          {current && (
            <div style={{ marginTop: 16 }}>
              <Btn size="lg" full icon={current.icon} onClick={() => setStatus(current.next)}>{current.label}</Btn>
            </div>
          )}
        </>
      )}
      {status === "resolved" && (
        <div style={{ marginTop: 18, padding: 22, background: T.greenSoft, borderRadius: 14, textAlign: "center" }}>
          <CheckCircle2 size={28} color={T.green} style={{ margin: "0 auto" }} />
          <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 8, letterSpacing: -0.3 }}>Incident resolved.</div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 4 }}>Dispatcher notified. Logged at 9:58 AM.</div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// COMPANY MANAGER
// =========================================================
function CompanyView() {
  const [section, setSection] = useState("sites");
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sites", label: "My sites", icon: MapPin, count: 3 },
    { id: "cameras", label: "Cameras", icon: Camera, count: 18 },
    { id: "alerts", label: "Alerts", icon: Bell, count: 2 },
    { id: "incidents", label: "Incidents", icon: AlertTriangle, count: 2 },
    { id: "team", label: "Team", icon: Users, count: TEAM.length },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];
  const labels = { dashboard: "Dashboard", sites: "My sites", cameras: "Cameras", alerts: "Alerts", incidents: "Incidents", team: "Team", reports: "Reports" };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 49px)" }}>
      <Sidebar items={items} active={section} setActive={setSection}
        user={{ name: "Amar Zindani", role: "Company Manager" }} scope="Sunset Liquor Group" />
      <main style={{ flex: 1, background: T.bg, overflow: "auto" }}>
        <PageStrip trail={["Primex", "Sunset Liquor Group", labels[section]]} />
        <div style={{ padding: "32px 36px" }}>
          {section === "dashboard" && <CompanyDashboard />}
          {section === "sites" && <CompanySites />}
          {section === "cameras" && <CompanyCameras />}
          {section === "alerts" && <CompanyAlerts />}
          {section === "incidents" && <CompanyIncidents />}
          {section === "team" && <CompanyTeam />}
          {section === "reports" && <CompanyReports />}
        </div>
      </main>
    </div>
  );
}

function CompanyDashboard() {
  return (
    <>
      <PageTitle title="Sunset Liquor — at a glance" sub="Your company's live snapshot. Only your data appears here." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Active sites" value="3" icon={MapPin} supporting={<><Pill tone="green">All active</Pill></>} />
        <StatCard label="Cameras online" value="17/18" icon={Camera} supporting={<><Pill tone="green">94%</Pill><Pill tone="red">1 offline</Pill></>} />
        <StatCard label="Open alerts" value="2" accent={T.amber} icon={Bell} />
        <StatCard label="Active incidents" value="2" accent={T.red} icon={AlertTriangle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>Recent incidents</div>
          </div>
          <DataTable
            columns={["Incident", "Site", "Severity", "Status", "Started"]}
            rows={INCIDENTS.filter(i => SITES.find(s => s.id === i.siteId)?.companyId === "c1").map(inc => {
              const site = SITES.find(s => s.id === inc.siteId);
              return [
                <span style={{ color: T.ink, fontWeight: 500 }}>{inc.title}</span>,
                <span style={{ color: T.ink2 }}>{site?.name}</span>,
                <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>,
                <Pill tone={incTone(inc.status)}>{inc.status}</Pill>,
                <span style={{ color: T.ink3, fontSize: 12.5 }}>{inc.startedAt}</span>,
              ];
            })}
          />
        </Card>
        <Card>
          <Label style={{ marginBottom: 12 }}>Today's response time</Label>
          <div style={{ fontFamily: serif, fontSize: 48, color: T.ink, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1 }}>8m <span style={{ fontSize: 16, color: T.green, fontFamily: sans, fontWeight: 600 }}>↓ 3m</span></div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 6 }}>Average across all incidents today</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            <KV k="Total this month" v="11 incidents" />
            <KV k="Resolved" v={<span style={{ color: T.green }}>9</span>} />
            <KV k="Open" v={<span style={{ color: T.amber }}>2</span>} />
          </div>
        </Card>
      </div>
    </>
  );
}

function CompanySites() {
  const [selectedSite, setSelectedSite] = useState("s2");
  const [addSite, setAddSite] = useState(false);
  const myCompany = COMPANIES.find(c => c.id === "c1");
  const companySites = SITES.filter(s => s.companyId === "c1");
  const site = SITES.find(s => s.id === selectedSite);
  const cameras = site ? CAMERAS.filter(c => c.siteId === site.id) : [];
  return (
    <>
      <PageTitle title="My sites" sub="You're viewing only your company's data. New sites you create belong to your company — and capture a Business Client for the site's portal."
        actions={<Btn variant="primary" size="sm" icon={Plus} onClick={() => setAddSite(true)}>Add site</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}><Label>{companySites.length} sites</Label></div>
          <div>
            {companySites.map(s => {
              const active = s.id === selectedSite;
              return (
                <button key={s.id} onClick={() => setSelectedSite(s.id)} style={{ width: "100%", textAlign: "left", border: "none", padding: "14px 18px", cursor: "pointer", background: active ? T.blueSofter : "transparent", borderLeft: `3px solid ${active ? T.blue : "transparent"}`, borderBottom: `1px solid ${T.border}`, fontFamily: sans }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 4 }}>{s.address}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <Pill tone={s.status === "Active" ? "green" : "amber"}>{s.status}</Pill>
                    <Pill tone="gray">{s.cameras} cameras</Pill>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <Label>{site?.type}</Label>
                <h2 style={{ fontFamily: serif, fontSize: 30, color: T.ink, fontWeight: 700, letterSpacing: -0.6, margin: "6px 0 6px" }}>{site?.name}</h2>
                <div style={{ fontSize: 13, color: T.ink3, display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={12} color={T.ink4} /> {site?.address}</div>
              </div>
              <Btn variant="secondary" size="sm" icon={Settings}>Manage site</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginTop: 22 }}>
              <Mini label="Risk" value={site?.risk} tone={site?.risk === "High" ? "red" : "amber"} />
              <Mini label="Cameras online" value={`${cameras.filter(c => c.status === "Online").length}/${cameras.length}`} />
              <Mini label="Open alerts" value="2" tone="amber" />
              <Mini label="Open incidents" value="1" tone="red" />
            </div>
          </Card>
          <div style={{ marginTop: 20 }}>
            <Label style={{ marginBottom: 10 }}>Cameras at this site</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {cameras.slice(0, 6).map(c => (
                <Card key={c.id} padding={14}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 3 }}>{c.location}</div>
                    </div>
                    <Pill tone={camTone(c.status)}>{c.status}</Pill>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AddSiteModal open={addSite} onClose={() => setAddSite(false)} lockedCompany={myCompany} />
    </>
  );
}

function Mini({ label, value, tone }) {
  const c = tone === "red" ? T.red : tone === "amber" ? T.amber : tone === "green" ? T.green : T.ink;
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ fontFamily: serif, fontSize: 26, color: c, fontWeight: 700, lineHeight: 1, marginTop: 6, letterSpacing: -0.4 }}>{value}</div>
    </div>
  );
}

function CompanyCameras() {
  return (
    <>
      <PageTitle title="Cameras" phaseTag="Live streaming · Phase 2" sub="All cameras across your sites." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CAMERAS.map(c => <CameraTile key={c.id} c={c} site={SITES.find(s => s.id === c.siteId)} />)}
      </div>
    </>
  );
}

function CompanyAlerts() {
  const [create, setCreate] = useState(false);
  const myCompany = COMPANIES.find(c => c.id === "c1");
  const alerts = ALERTS.filter(a => SITES.find(s => s.id === a.siteId)?.companyId === "c1");
  return (
    <>
      <PageTitle title="Alerts" sub="All alerts from your sites in the last 7 days. Creating an alert automatically opens a linked incident."
        actions={<Btn variant="primary" size="sm" icon={Plus} onClick={() => setCreate(true)}>Create alert</Btn>} />
      <Card padding={0}>
        <DataTable
          columns={["Alert", "Site", "Severity", "Status", "Source", "Time"]}
          rows={alerts.map(a => {
            const site = SITES.find(s => s.id === a.siteId);
            return [
              <span style={{ color: T.ink, fontWeight: 500 }}>{a.title}</span>,
              <span style={{ color: T.ink2 }}>{site?.name}</span>,
              <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>,
              <Pill tone="gray">{a.status}</Pill>,
              <span style={{ color: T.ink2, fontSize: 12.5 }}>{a.source}</span>,
              <span style={{ color: T.ink3, fontSize: 12.5 }}>{a.createdAt}</span>,
            ];
          })}
        />
      </Card>
      <CreateAlertModal open={create} onClose={() => setCreate(false)} mode="company" lockedCompany={myCompany} />
    </>
  );
}

function CompanyIncidents() {
  const incidents = INCIDENTS.filter(i => SITES.find(s => s.id === i.siteId)?.companyId === "c1");
  return (
    <>
      <PageTitle title="Incidents" sub="Your incidents from open through closed." />
      <Card padding={0}>
        <DataTable
          columns={["Incident", "Site", "Severity", "Status", "Guard", "Started"]}
          rows={incidents.map(inc => {
            const site = SITES.find(s => s.id === inc.siteId);
            const guard = GUARDS.find(g => g.id === inc.guardId);
            return [
              <span style={{ color: T.ink, fontWeight: 500 }}>{inc.title}</span>,
              <span style={{ color: T.ink2 }}>{site?.name}</span>,
              <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>,
              <Pill tone={incTone(inc.status)}>{inc.status}</Pill>,
              guard ? <span style={{ color: T.ink2 }}>{guard.name}</span> : <span style={{ color: T.ink4 }}>Unassigned</span>,
              <span style={{ color: T.ink3, fontSize: 12.5 }}>{inc.startedAt}</span>,
            ];
          })}
        />
      </Card>
    </>
  );
}

function CompanyTeam() {
  const [invite, setInvite] = useState(false);
  const [edit, setEdit] = useState({ open: false, member: null });
  const [toggle, setToggle] = useState({ open: false, member: null });
  const [del, setDel] = useState({ open: false, member: null });
  return (
    <>
      <PageTitle title="Team" sub="Everyone with access to your company's data. Invite new members, edit details, deactivate accounts, or soft-delete from your team."
        actions={<Btn variant="primary" size="sm" icon={UserPlus} onClick={() => setInvite(true)}>Invite member</Btn>} />
      <Card padding={0}>
        <DataTable
          columns={["Member", "Role", "Email", "Last active", "Status", ""]}
          rows={TEAM.map(m => [
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: T.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>{m.name.split(" ").map(p=>p[0]).join("")}</div>
              <span style={{ color: T.ink, fontWeight: 500 }}>{m.name}</span>
            </div>,
            <Pill tone="gray">{m.role}</Pill>,
            <span style={{ color: T.ink2, fontSize: 12.5 }}>{m.email}</span>,
            <span style={{ color: T.ink3, fontSize: 12.5 }}>{m.lastActive}</span>,
            <Pill tone={m.status === "Active" ? "green" : "gray"}>{m.status}</Pill>,
            <ActionMenu actions={[
              { label: "Edit member", icon: Pencil, onClick: () => setEdit({ open: true, member: m }) },
              { label: m.status === "Active" ? "Deactivate account" : "Reactivate account", icon: Power, onClick: () => setToggle({ open: true, member: m }) },
              { divider: true },
              { label: "Remove from team", icon: Trash2, tone: "danger", onClick: () => setDel({ open: true, member: m }) },
            ]} />,
          ])}
        />
      </Card>
      <InviteTeamMemberModal open={invite} onClose={() => setInvite(false)} />
      <EditTeamMemberModal open={edit.open} member={edit.member} onClose={() => setEdit({ open: false, member: null })} />
      <ToggleMemberModal open={toggle.open} member={toggle.member} onClose={() => setToggle({ open: false, member: null })} />
      <DeleteMemberModal open={del.open} member={del.member} onClose={() => setDel({ open: false, member: null })} />
    </>
  );
}

function CompanyReports() {
  return (
    <>
      <PageTitle title="Reports" sub="Your monthly summaries and analytics."
        actions={<Btn variant="primary" size="sm" icon={Download}>Generate report</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Incidents this month" value="11" icon={AlertTriangle} supporting={<><Pill tone="green">↓ 8% vs Apr</Pill></>} />
        <StatCard label="Avg response" value="8m" icon={Clock} supporting={<><Pill tone="green">↓ 3m vs avg</Pill></>} />
        <StatCard label="Resolution rate" value="98%" icon={CheckCircle2} supporting={<><Pill tone="green">+4% vs avg</Pill></>} />
      </div>
      <Card padding={0}>
        <DataTable
          columns={["Report", "Type", "Incidents", "Date", ""]}
          rows={REPORTS.filter(r => r.company.includes("Sunset") || r.company === "All companies").map(r => [
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.blueSoft, display: "grid", placeItems: "center" }}><FileText size={13} color={T.blue} /></div>
              <span style={{ color: T.ink, fontWeight: 500 }}>{r.name}</span>
            </div>,
            <Pill tone="gray">{r.type}</Pill>,
            <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{r.incidents}</span>,
            <span style={{ color: T.ink3, fontSize: 12.5 }}>{r.date}</span>,
            <Btn variant="ghost" size="sm" icon={Download}>Download</Btn>,
          ])}
        />
      </Card>
    </>
  );
}

// =========================================================
// BUSINESS CLIENT
// =========================================================
function ClientView() {
  const [section, setSection] = useState("home");
  const items = [
    { id: "home", label: "My business", icon: Home },
    { id: "alerts", label: "Recent alerts", icon: Bell, count: 2 },
    { id: "incidents", label: "Incident log", icon: AlertTriangle },
    { id: "reports", label: "My reports", icon: FileText },
    { id: "help", label: "Get help", icon: HelpCircle },
  ];
  const labels = { home: "My business", alerts: "Recent alerts", incidents: "Incident log", reports: "My reports", help: "Get help" };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 49px)" }}>
      <Sidebar items={items} active={section} setActive={setSection}
        user={{ name: "Maria Chen", role: "Business Owner" }} scope="Sunset Liquor — Bay Ridge" />
      <main style={{ flex: 1, background: T.bg, overflow: "auto" }}>
        <PageStrip trail={["Primex", "Sunset Liquor — Bay Ridge", labels[section]]} />
        <div style={{ padding: "32px 36px" }}>
          {section === "home" && <ClientHome />}
          {section === "alerts" && <ClientAlerts />}
          {section === "incidents" && <ClientIncidents />}
          {section === "reports" && <ClientReports />}
          {section === "help" && <ClientHelp />}
        </div>
      </main>
    </div>
  );
}

function ClientHome() {
  return (
    <>
      <PageTitle title="Your business at a glance" sub="A simple view of what's happening at your store. No technical jargon — just what you need to know." />
      <Card padding={28} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div>
            <Label>Status right now</Label>
            <h2 style={{ fontFamily: serif, fontSize: 32, color: T.ink, fontWeight: 700, letterSpacing: -0.6, margin: "6px 0 6px", lineHeight: 1.15 }}>
              Your store is <span style={{ color: T.green, fontStyle: "italic" }}>secure.</span>
            </h2>
            <div style={{ fontSize: 14, color: T.ink3 }}>6 of 8 cameras online · 1 incident being handled by your dispatcher</div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: T.greenSoft, display: "grid", placeItems: "center" }}>
            <Shield size={32} color={T.green} />
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <SimpleCard icon={Camera} label="Cameras" value="6 of 8 online" hint="2 need attention" />
        <SimpleCard icon={Bell} label="Alerts today" value="2 alerts" hint="Both being reviewed" />
        <SimpleCard icon={AlertTriangle} label="Active incidents" value="1 incident" hint="Guard responding" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>What happened recently</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Plain-language log of events at your store</div>
          </div>
          {[
            { time: "9:51 AM", title: "Suspicious activity in Spirits aisle", desc: "Dispatcher is reviewing now. A guard has been sent.", tone: "red", Icon: AlertTriangle },
            { time: "9:42 AM", title: "Back Storage camera went offline", desc: "Technician check scheduled. No security risk.", tone: "amber", Icon: Bell },
            { time: "Yesterday", title: "After-hours motion at entrance", desc: "Cleaning crew verified. Resolved.", tone: "green", Icon: CheckCircle2 },
            { time: "May 10", title: "Door propped open during closing", desc: "Closed and verified by manager.", tone: "green", Icon: CheckCircle2 },
          ].map((e, i, arr) => {
            const bgMap = { red: T.redSoft, amber: T.amberSoft, green: T.greenSoft };
            const fgMap = { red: T.red, amber: T.amber, green: T.green };
            return (
              <div key={i} style={{ display: "flex", gap: 14, padding: "16px 22px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: bgMap[e.tone], flexShrink: 0, display: "grid", placeItems: "center" }}>
                  <e.Icon size={16} color={fgMap[e.tone]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: T.ink4 }}>{e.time}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 4 }}>{e.desc}</div>
                </div>
              </div>
            );
          })}
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Label style={{ marginBottom: 10 }}>Need help?</Label>
            <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6 }}>If something doesn't look right or you need monitoring support, your security team is one tap away.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <Btn icon={Phone} full>Call dispatch</Btn>
              <Btn variant="secondary" icon={AlertTriangle} full>Report an issue</Btn>
            </div>
          </Card>
          <Card>
            <Label style={{ marginBottom: 10 }}>This month</Label>
            <KV k="Total incidents" v="4" />
            <KV k="Resolved" v={<span style={{ color: T.green }}>4</span>} />
            <KV k="Avg response" v="9 min" />
            <div style={{ marginTop: 10 }}><Btn variant="link" size="sm" icon={FileText}>Download monthly report</Btn></div>
          </Card>
        </div>
      </div>
    </>
  );
}

function SimpleCard({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <Label>{label}</Label>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blueSoft, display: "grid", placeItems: "center" }}><Icon size={15} color={T.blue} /></div>
      </div>
      <div style={{ fontFamily: serif, fontSize: 28, color: T.ink, fontWeight: 700, lineHeight: 1, marginTop: 14, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>{hint}</div>
    </Card>
  );
}

function ClientAlerts() {
  const myAlerts = ALERTS.filter(a => a.siteId === "s2");
  return (
    <>
      <PageTitle title="Recent alerts at your business" sub="Anything our system has flagged at your store. Plain language — no jargon." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {myAlerts.map(a => (
          <Card key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>
                  <Pill tone="gray">{a.status}</Pill>
                </div>
                <div style={{ fontFamily: serif, fontSize: 20, color: T.ink, fontWeight: 700, letterSpacing: -0.3 }}>{a.title}</div>
                <div style={{ fontSize: 13.5, color: T.ink2, marginTop: 8, lineHeight: 1.55 }}>{a.description}</div>
                <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 10 }}>Logged {a.createdAt} · Source: {a.source}</div>
              </div>
              <Btn variant="secondary" size="sm">View details</Btn>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function ClientIncidents() {
  const myInc = INCIDENTS.filter(i => i.siteId === "s2");
  return (
    <>
      <PageTitle title="Incident log" sub="Everything that has happened at your store, from initial alert to final resolution." />
      <Card padding={0}>
        <DataTable
          columns={["Incident", "Severity", "Status", "Guard", "Started", ""]}
          rows={myInc.map(inc => {
            const guard = GUARDS.find(g => g.id === inc.guardId);
            return [
              <div>
                <div style={{ color: T.ink, fontWeight: 500 }}>{inc.title}</div>
                <div style={{ color: T.ink4, fontSize: 11.5, marginTop: 2 }}>{inc.notes}</div>
              </div>,
              <Pill tone={sevTone(inc.severity)}>{inc.severity}</Pill>,
              <Pill tone={incTone(inc.status)}>{inc.status}</Pill>,
              guard ? <span style={{ color: T.ink2 }}>{guard.name}</span> : <span style={{ color: T.ink4 }}>—</span>,
              <span style={{ color: T.ink3, fontSize: 12.5 }}>{inc.startedAt}</span>,
              <Btn variant="ghost" size="sm" icon={Eye}>View</Btn>,
            ];
          })}
        />
      </Card>
    </>
  );
}

function ClientReports() {
  return (
    <>
      <PageTitle title="My reports" sub="Monthly summaries of activity at your business, downloadable as PDF." />
      <Card padding={0}>
        <DataTable
          columns={["Report", "Period", "Incidents", "Generated", ""]}
          rows={[
            { name: "April 2026 — Bay Ridge Summary", period: "Apr 1–30", incidents: 4, date: "May 1, 2026" },
            { name: "March 2026 — Bay Ridge Summary", period: "Mar 1–31", incidents: 6, date: "Apr 1, 2026" },
            { name: "February 2026 — Bay Ridge Summary", period: "Feb 1–28", incidents: 3, date: "Mar 1, 2026" },
            { name: "January 2026 — Bay Ridge Summary", period: "Jan 1–31", incidents: 5, date: "Feb 1, 2026" },
          ].map(r => [
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.blueSoft, display: "grid", placeItems: "center" }}><FileText size={13} color={T.blue} /></div>
              <span style={{ color: T.ink, fontWeight: 500 }}>{r.name}</span>
            </div>,
            <span style={{ color: T.ink2, fontSize: 12.5 }}>{r.period}</span>,
            <span style={{ color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{r.incidents}</span>,
            <span style={{ color: T.ink3, fontSize: 12.5 }}>{r.date}</span>,
            <Btn variant="ghost" size="sm" icon={Download}>PDF</Btn>,
          ])}
        />
      </Card>
    </>
  );
}

function ClientHelp() {
  return (
    <>
      <PageTitle title="Get help" sub="We're here when you need us." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "grid", placeItems: "center" }}><Phone size={20} color={T.blue} /></div>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 18, letterSpacing: -0.3 }}>Call dispatch</div>
          <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 8, lineHeight: 1.6 }}>Your dispatcher is available 24/7. Talk to a human in under 30 seconds.</div>
          <div style={{ fontFamily: serif, fontSize: 24, color: T.ink, fontWeight: 700, marginTop: 16 }}>+1 (888) 555-7100</div>
          <Btn icon={Phone} style={{ marginTop: 12 }}>Call now</Btn>
        </Card>
        <Card>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "grid", placeItems: "center" }}><AlertTriangle size={20} color={T.blue} /></div>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 18, letterSpacing: -0.3 }}>Report an incident</div>
          <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 8, lineHeight: 1.6 }}>See something wrong? Log it here and a dispatcher will follow up.</div>
          <Btn variant="secondary" icon={Plus} style={{ marginTop: 16 }}>New incident report</Btn>
        </Card>
        <Card>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "grid", placeItems: "center" }}><BookOpen size={20} color={T.blue} /></div>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 18, letterSpacing: -0.3 }}>Help center</div>
          <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 8, lineHeight: 1.6 }}>Setup guides, FAQs, and best practices for small business owners.</div>
          <Btn variant="secondary" icon={ExternalLink} style={{ marginTop: 16 }}>Open help center</Btn>
        </Card>
        <Card>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "grid", placeItems: "center" }}><Mail size={20} color={T.blue} /></div>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 18, letterSpacing: -0.3 }}>Email support</div>
          <div style={{ fontSize: 13.5, color: T.ink3, marginTop: 8, lineHeight: 1.6 }}>For non-urgent questions, write to our team. We respond within 4 hours.</div>
          <Btn variant="secondary" icon={Mail} style={{ marginTop: 16 }}>support@primex.com</Btn>
        </Card>
      </div>
    </>
  );
}

// =========================================================
// ROOT
// =========================================================
export default function App() {
  const [role, setRole] = useState("landing");
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: sans }}>
      <style>{FONTS}</style>
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.borderStrong}; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      <TopBar role={role} setRole={setRole} />
      {role === "landing"    && <LandingPage goLogin={() => setRole("login")} />}
      {role === "login"      && <LoginPage onContinue={setRole} />}
      {role === "admin"      && <AdminView />}
      {role === "dispatcher" && <DispatcherView />}
      {role === "guard"      && <GuardView />}
      {role === "company"    && <CompanyView />}
      {role === "client"     && <ClientView />}
    </div>
  );
}
