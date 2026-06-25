-- ============================================================
-- Primex Security: Seed Data
-- ============================================================
-- Deterministic UUIDs for reproducible dev/test environments
-- Password for all users: testpass123
-- ============================================================

-- Enable pgcrypto for crypt() / gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Deterministic UUID mapping ────────────────────────────
-- Companies:  c01-c04   00000000-0000-0000-0000-00000000c001
-- Users:      u01-u09   00000000-0000-0000-0000-00000000u001
-- Sites:      s01-s06   00000000-0000-0000-0000-000000000s01
-- Cameras:    ca01-ca08 00000000-0000-0000-0000-0000000ca001
-- Alerts:     a01-a06   00000000-0000-0000-0000-00000000a001
-- Incidents:  i01-i05   00000000-0000-0000-0000-00000000i001
-- Reports:    r01-r05   00000000-0000-0000-0000-00000000r001

-- ===================  1. COMPANIES  ========================

INSERT INTO companies (id, name, type, sites, users, status) VALUES
  ('00000000-0000-0000-0000-000000000c01', 'Apex Retail Group',  'Retail',     12, 34, 'Active'),
  ('00000000-0000-0000-0000-000000000c02', 'Nexus Logistics',    'Logistics',   7, 18, 'Active'),
  ('00000000-0000-0000-0000-000000000c03', 'Orion Healthcare',   'Healthcare',  4, 22, 'Pending'),
  ('00000000-0000-0000-0000-000000000c04', 'Pinnacle Finance',   'Finance',     3,  9, 'Suspended');


-- ===================  2. AUTH USERS  ========================
-- Insert directly into auth.users (Supabase auth schema)
-- All users get password: testpass123

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
) VALUES
  -- u01: Jordan Blake - super_admin
  (
    '00000000-0000-0000-0000-000000000u01',
    '00000000-0000-0000-0000-000000000000',
    'jordan@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jordan Blake","role":"super_admin"}',
    'authenticated', 'authenticated'
  ),
  -- u02: Samira Osei - dispatcher
  (
    '00000000-0000-0000-0000-000000000u02',
    '00000000-0000-0000-0000-000000000000',
    'samira@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Samira Osei","role":"dispatcher"}',
    'authenticated', 'authenticated'
  ),
  -- u03: Tom Nguyen - dispatcher
  (
    '00000000-0000-0000-0000-000000000u03',
    '00000000-0000-0000-0000-000000000000',
    'tom@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Tom Nguyen","role":"dispatcher"}',
    'authenticated', 'authenticated'
  ),
  -- u04: Claire Mackay - company_manager (Apex Retail)
  (
    '00000000-0000-0000-0000-000000000u04',
    '00000000-0000-0000-0000-000000000000',
    'claire@apexretail.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Claire Mackay","role":"company_manager"}',
    'authenticated', 'authenticated'
  ),
  -- u05: Marcus Webb - guard (Apex Retail / Westfield)
  (
    '00000000-0000-0000-0000-000000000u05',
    '00000000-0000-0000-0000-000000000000',
    'marcus@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Marcus Webb","role":"guard"}',
    'authenticated', 'authenticated'
  ),
  -- u06: Priya Nair - guard (Nexus Logistics / Warehouse A)
  (
    '00000000-0000-0000-0000-000000000u06',
    '00000000-0000-0000-0000-000000000000',
    'priya@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Nair","role":"guard"}',
    'authenticated', 'authenticated'
  ),
  -- u07: Damien Frost - guard (Apex Retail / Bondi)
  (
    '00000000-0000-0000-0000-000000000u07',
    '00000000-0000-0000-0000-000000000000',
    'damien@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Damien Frost","role":"guard"}',
    'authenticated', 'authenticated'
  ),
  -- u08: Leila Santos - guard (Orion Healthcare / Clinic)
  (
    '00000000-0000-0000-0000-000000000u08',
    '00000000-0000-0000-0000-000000000000',
    'leila@primexsecurity.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Leila Santos","role":"guard"}',
    'authenticated', 'authenticated'
  ),
  -- u09: Brett Collins - client (Nexus Logistics)
  (
    '00000000-0000-0000-0000-000000000u09',
    '00000000-0000-0000-0000-000000000000',
    'brett@nexuslogistics.com.au',
    crypt('testpass123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Brett Collins","role":"client"}',
    'authenticated', 'authenticated'
  );


-- ===================  3. AUTH IDENTITIES  ===================
-- Required for signInWithPassword to work in Supabase

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000u01', '00000000-0000-0000-0000-000000000u01',
   '{"sub":"00000000-0000-0000-0000-000000000u01","email":"jordan@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u01', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u02', '00000000-0000-0000-0000-000000000u02',
   '{"sub":"00000000-0000-0000-0000-000000000u02","email":"samira@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u02', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u03', '00000000-0000-0000-0000-000000000u03',
   '{"sub":"00000000-0000-0000-0000-000000000u03","email":"tom@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u03', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u04', '00000000-0000-0000-0000-000000000u04',
   '{"sub":"00000000-0000-0000-0000-000000000u04","email":"claire@apexretail.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u04', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u05', '00000000-0000-0000-0000-000000000u05',
   '{"sub":"00000000-0000-0000-0000-000000000u05","email":"marcus@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u05', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u06', '00000000-0000-0000-0000-000000000u06',
   '{"sub":"00000000-0000-0000-0000-000000000u06","email":"priya@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u06', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u07', '00000000-0000-0000-0000-000000000u07',
   '{"sub":"00000000-0000-0000-0000-000000000u07","email":"damien@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u07', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u08', '00000000-0000-0000-0000-000000000u08',
   '{"sub":"00000000-0000-0000-0000-000000000u08","email":"leila@primexsecurity.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u08', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000u09', '00000000-0000-0000-0000-000000000u09',
   '{"sub":"00000000-0000-0000-0000-000000000u09","email":"brett@nexuslogistics.com.au"}',
   'email', '00000000-0000-0000-0000-000000000u09', now(), now(), now());


-- ===================  4. PROFILE UPDATES  ===================
-- The handle_new_user trigger created skeleton profiles; now enrich them

UPDATE profiles SET
  company_id  = NULL,
  last_active = '2025-06-14T08:05:00Z',
  status      = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u01'; -- Jordan Blake (super_admin, no company)

UPDATE profiles SET
  company_id  = NULL,
  last_active = '2025-06-14T07:58:00Z',
  status      = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u02'; -- Samira Osei (dispatcher)

UPDATE profiles SET
  company_id  = NULL,
  last_active = '2025-06-13T23:10:00Z',
  status      = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u03'; -- Tom Nguyen (dispatcher)

UPDATE profiles SET
  company_id  = '00000000-0000-0000-0000-000000000c01',
  last_active = '2025-06-14T06:30:00Z',
  status      = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u04'; -- Claire Mackay (company_manager, Apex)

UPDATE profiles SET
  company_id   = '00000000-0000-0000-0000-000000000c01',
  phone        = '0412 111 222',
  zone         = 'Westfield — Car Park',
  shifts       = 'Mon–Fri 18:00–06:00',
  guard_status = 'On Incident',
  last_active  = '2025-06-14T02:22:00Z',
  status       = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u05'; -- Marcus Webb (guard, Apex/Westfield)

UPDATE profiles SET
  company_id   = '00000000-0000-0000-0000-000000000c02',
  phone        = '0412 333 444',
  zone         = 'Nexus Warehouse A',
  shifts       = 'Mon–Sat 06:00–18:00',
  guard_status = 'Available',
  last_active  = '2025-06-14T07:50:00Z',
  status       = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u06'; -- Priya Nair (guard, Nexus/Warehouse A)

UPDATE profiles SET
  company_id   = '00000000-0000-0000-0000-000000000c01',
  phone        = '0412 555 666',
  zone         = 'Bondi Retail',
  shifts       = 'Wed–Sun 12:00–24:00',
  guard_status = 'Available',
  last_active  = '2025-06-14T12:52:00Z',
  status       = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u07'; -- Damien Frost (guard, Apex/Bondi)

UPDATE profiles SET
  company_id   = '00000000-0000-0000-0000-000000000c03',
  phone        = '0412 777 888',
  zone         = 'Orion Clinic',
  shifts       = 'Mon–Fri 08:00–20:00',
  guard_status = 'Off-duty',
  last_active  = '2025-06-13T16:00:00Z',
  status       = 'Active'
WHERE id = '00000000-0000-0000-0000-000000000u08'; -- Leila Santos (guard, Orion/Clinic)

UPDATE profiles SET
  company_id  = '00000000-0000-0000-0000-000000000c02',
  last_active = '2025-06-10T11:00:00Z',
  status      = 'Inactive'
WHERE id = '00000000-0000-0000-0000-000000000u09'; -- Brett Collins (client, Nexus)


-- ===================  5. SITES  =============================

INSERT INTO sites (id, company_id, name, type, address, risk, status, cameras) VALUES
  ('00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-000000000c01',
   'Apex Retail — Westfield', 'Retail', '123 Westfield Blvd, Sydney NSW', 'High', 'Active', 24),
  ('00000000-0000-0000-0000-000000000s02', '00000000-0000-0000-0000-000000000c01',
   'Apex Retail — Bondi', 'Retail', '45 Campbell Pde, Bondi Beach NSW', 'Medium', 'Active', 16),
  ('00000000-0000-0000-0000-000000000s03', '00000000-0000-0000-0000-000000000c02',
   'Nexus Warehouse A', 'Warehouse', '9 Industrial Dr, Prestons NSW', 'Medium', 'Active', 32),
  ('00000000-0000-0000-0000-000000000s04', '00000000-0000-0000-0000-000000000c02',
   'Nexus Warehouse B', 'Warehouse', '14 Commerce Rd, Moorebank NSW', 'Low', 'Maintenance', 28),
  ('00000000-0000-0000-0000-000000000s05', '00000000-0000-0000-0000-000000000c03',
   'Orion Clinic — Parramatta', 'Healthcare', '78 Church St, Parramatta NSW', 'Low', 'Active', 10),
  ('00000000-0000-0000-0000-000000000s06', '00000000-0000-0000-0000-000000000c04',
   'Pinnacle HQ', 'Office', '1 Martin Pl, Sydney NSW', 'High', 'Inactive', 18);


-- ===================  6. CAMERAS  ===========================

INSERT INTO cameras (id, site_id, name, location, status, last_checked, warning) VALUES
  ('00000000-0000-0000-0000-0000000ca001', '00000000-0000-0000-0000-000000000s01',
   'CAM-01', 'Main Entrance', 'Online', '2025-06-14T08:00:00Z', NULL),
  ('00000000-0000-0000-0000-0000000ca002', '00000000-0000-0000-0000-000000000s01',
   'CAM-02', 'Car Park Level 1', 'Online', '2025-06-14T08:00:00Z', NULL),
  ('00000000-0000-0000-0000-0000000ca003', '00000000-0000-0000-0000-000000000s01',
   'CAM-03', 'Loading Dock', 'Offline', '2025-06-13T22:15:00Z', 'No signal for 9 h'),
  ('00000000-0000-0000-0000-0000000ca004', '00000000-0000-0000-0000-000000000s02',
   'CAM-04', 'Storefront', 'Online', '2025-06-14T07:55:00Z', NULL),
  ('00000000-0000-0000-0000-0000000ca005', '00000000-0000-0000-0000-000000000s03',
   'CAM-05', 'Receiving Bay', 'Maintenance', '2025-06-12T10:00:00Z', 'Scheduled lens replacement'),
  ('00000000-0000-0000-0000-0000000ca006', '00000000-0000-0000-0000-000000000s03',
   'CAM-06', 'Racking Aisle 3', 'Online', '2025-06-14T08:01:00Z', NULL),
  ('00000000-0000-0000-0000-0000000ca007', '00000000-0000-0000-0000-000000000s05',
   'CAM-07', 'Reception', 'Online', '2025-06-14T08:00:00Z', NULL),
  ('00000000-0000-0000-0000-0000000ca008', '00000000-0000-0000-0000-000000000s06',
   'CAM-08', 'Server Room', 'Unknown', '2025-06-10T14:30:00Z', 'Site inactive — feed unavailable');


-- ===================  7. ALERTS  ============================

INSERT INTO alerts (id, title, site_id, camera_id, severity, status, created_at, description, source) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'Perimeter breach detected',
   '00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-0000000ca003',
   'Critical', 'New', '2025-06-14T02:17:00Z',
   'Motion detected at Loading Dock outside business hours. Camera feed lost immediately after.',
   'AI Motion Detection'),
  ('00000000-0000-0000-0000-00000000a002', 'Unattended bag — Main Entrance',
   '00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-0000000ca001',
   'Warning', 'Reviewing', '2025-06-14T07:45:00Z',
   'Object left unattended for >5 minutes near turnstiles.',
   'AI Object Detection'),
  ('00000000-0000-0000-0000-00000000a003', 'After-hours access — Receiving Bay',
   '00000000-0000-0000-0000-000000000s03', '00000000-0000-0000-0000-0000000ca005',
   'Warning', 'Escalated', '2025-06-13T23:50:00Z',
   'Door access card used outside permitted hours.',
   'Access Control'),
  ('00000000-0000-0000-0000-00000000a004', 'Camera offline',
   '00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-0000000ca003',
   'Info', 'Reviewing', '2025-06-13T22:15:00Z',
   'CAM-03 at Loading Dock has lost network connectivity.',
   'System Monitor'),
  ('00000000-0000-0000-0000-00000000a005', 'Crowd density threshold exceeded',
   '00000000-0000-0000-0000-000000000s02', '00000000-0000-0000-0000-0000000ca004',
   'Warning', 'Closed', '2025-06-14T12:30:00Z',
   'Occupancy exceeded 95% capacity at Bondi storefront.',
   'AI Analytics'),
  ('00000000-0000-0000-0000-00000000a006', 'Fire panel fault',
   '00000000-0000-0000-0000-000000000s05', NULL,
   'Critical', 'New', '2025-06-14T06:05:00Z',
   'Zone 3 fire panel is reporting a fault condition.',
   'Building Management System');


-- ===================  8. INCIDENTS  =========================

INSERT INTO incidents (id, title, site_id, alert_id, severity, status, guard_id, started_at, notes) VALUES
  ('00000000-0000-0000-0000-00000000i001', 'Loading Dock perimeter breach',
   '00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-00000000a001',
   'Critical', 'Dispatched', '00000000-0000-0000-0000-000000000u05',
   '2025-06-14T02:20:00Z',
   'Guard Marcus Webb dispatched to Loading Dock. Awaiting on-site confirmation.'),
  ('00000000-0000-0000-0000-00000000i002', 'Unattended bag investigation',
   '00000000-0000-0000-0000-000000000s01', '00000000-0000-0000-0000-00000000a002',
   'Warning', 'In Progress', '00000000-0000-0000-0000-000000000u05',
   '2025-06-14T07:48:00Z',
   'Guard on scene. Bag identified as belonging to cleaning staff.'),
  ('00000000-0000-0000-0000-00000000i003', 'Receiving Bay after-hours access',
   '00000000-0000-0000-0000-000000000s03', '00000000-0000-0000-0000-00000000a003',
   'Warning', 'Open', NULL,
   '2025-06-13T23:55:00Z',
   'Access log pulled. Reviewing card holder identity.'),
  ('00000000-0000-0000-0000-00000000i004', 'Orion Clinic fire panel fault',
   '00000000-0000-0000-0000-000000000s05', '00000000-0000-0000-0000-00000000a006',
   'Critical', 'Open', NULL,
   '2025-06-14T06:10:00Z',
   'Maintenance contractor notified. Fire brigade on standby.'),
  ('00000000-0000-0000-0000-00000000i005', 'Bondi crowd density event',
   '00000000-0000-0000-0000-000000000s02', '00000000-0000-0000-0000-00000000a005',
   'Warning', 'Resolved', '00000000-0000-0000-0000-000000000u07',
   '2025-06-14T12:32:00Z',
   'Entry queue managed. Density returned to normal within 20 min.');


-- ===================  9. REPORTS  ===========================

INSERT INTO reports (id, name, company_id, date, type, incidents, size) VALUES
  ('00000000-0000-0000-0000-00000000r001', 'June 2025 — Apex Retail Monthly',
   '00000000-0000-0000-0000-000000000c01', '2025-06-01', 'Monthly', 14, '1.2 MB'),
  ('00000000-0000-0000-0000-00000000r002', 'May 2025 — Nexus Logistics Monthly',
   '00000000-0000-0000-0000-000000000c02', '2025-05-01', 'Monthly', 6, '890 KB'),
  ('00000000-0000-0000-0000-00000000r003', 'Q1 2025 — Apex Retail Quarterly',
   '00000000-0000-0000-0000-000000000c01', '2025-03-31', 'Quarterly', 38, '3.4 MB'),
  ('00000000-0000-0000-0000-00000000r004', 'Westfield Incident — 2025-06-14',
   '00000000-0000-0000-0000-000000000c01', '2025-06-14', 'Incident', 2, '420 KB'),
  ('00000000-0000-0000-0000-00000000r005', 'Orion Healthcare Onboarding Audit',
   '00000000-0000-0000-0000-000000000c03', '2025-06-10', 'Audit', 0, '210 KB');


-- ===================  10. ACTIVITY LOG  =====================

INSERT INTO activity_log (actor_id, actor_name, action, target, icon, tone, created_at) VALUES
  -- System: Critical alert raised
  (NULL, 'System', 'Critical alert raised', 'Loading Dock — Westfield',
   'Bell', 'red', '2025-06-14T02:17:00Z'),
  -- Samira: Dispatched guard
  ('00000000-0000-0000-0000-000000000u02', 'Samira Osei', 'Dispatched guard', 'Marcus Webb → Westfield',
   'Radio', 'amber', '2025-06-14T02:20:00Z'),
  -- System: Camera went offline
  (NULL, 'System', 'Camera went offline', 'CAM-03 — Loading Dock',
   'WifiOff', 'red', '2025-06-13T22:15:00Z'),
  -- Tom: Incident status updated
  ('00000000-0000-0000-0000-000000000u03', 'Tom Nguyen', 'Incident status updated', 'Receiving Bay after-hours → Open',
   'ClipboardList', 'amber', '2025-06-13T23:58:00Z'),
  -- System: Fire panel fault detected
  (NULL, 'System', 'Fire panel fault detected', 'Orion Clinic — Zone 3',
   'Bell', 'red', '2025-06-14T06:05:00Z'),
  -- Damien: Incident resolved
  ('00000000-0000-0000-0000-000000000u07', 'Damien Frost', 'Incident resolved', 'Bondi crowd density event',
   'CheckCircle', 'green', '2025-06-14T12:52:00Z'),
  -- Jordan: New company added
  ('00000000-0000-0000-0000-000000000u01', 'Jordan Blake', 'New company added', 'Orion Healthcare',
   'Building2', 'blue', '2025-06-10T09:00:00Z'),
  -- Claire: Report downloaded
  ('00000000-0000-0000-0000-000000000u04', 'Claire Mackay', 'Report downloaded', 'June 2025 — Apex Retail Monthly',
   'FileDown', 'gray', '2025-06-14T08:10:00Z'),
  -- Jordan: User account created
  ('00000000-0000-0000-0000-000000000u01', 'Jordan Blake', 'User account created', 'brett@nexuslogistics.com.au',
   'UserPlus', 'blue', '2025-06-09T14:20:00Z'),
  -- System: Site status changed
  (NULL, 'System', 'Site status changed', 'Pinnacle HQ → Inactive',
   'MapPin', 'gray', '2025-06-08T11:00:00Z');
