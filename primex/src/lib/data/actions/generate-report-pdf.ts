'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface GenerateReportPdfParams {
  reportId: string
}

export async function generateReportPdf({ reportId }: GenerateReportPdfParams): Promise<string> {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client')

  const supabase = await createServerSupabaseClient()

  // Fetch report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, companies(name)')
    .eq('id', reportId)
    .single()

  if (reportError || !report) throw new Error('Report not found')

  const companyName = (report as any).companies?.name ?? 'Unknown'

  // Fetch incidents for this company in the report's date range
  const reportDate = new Date(report.date)
  const monthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1).toISOString()
  const monthEnd = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0, 23, 59, 59).toISOString()

  // RLS handles company scoping automatically
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*, sites(name)')
    .gte('started_at', monthStart)
    .lte('started_at', monthEnd)
    .order('started_at', { ascending: false })
    .limit(50)

  // Fetch alerts for the same period
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .order('created_at', { ascending: false })
    .limit(50)

  // ── Build PDF ──────────────────────────────────────────

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('PRIMEX SECURITY', 15, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('Security Operations Report', 15, y)
  y += 12

  // Report info box
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, y, pageWidth - 30, 28, 3, 3, 'FD')

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(report.name, 20, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Company: ${companyName}`, 20, y + 15)
  doc.text(`Type: ${report.type}`, 100, y + 15)
  doc.text(`Date: ${new Date(report.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`, 150, y + 15)
  doc.text(`Incidents: ${report.incidents ?? 0}`, 20, y + 22)
  y += 36

  // Summary stats
  const totalAlerts = alerts?.length ?? 0
  const totalIncidents = incidents?.length ?? 0
  const resolved = incidents?.filter((i: any) => i.status === 'Resolved' || i.status === 'Closed').length ?? 0
  const resolutionRate = totalIncidents > 0 ? Math.round((resolved / totalIncidents) * 100) : 0
  const criticalCount = alerts?.filter((a: any) => a.severity === 'Critical').length ?? 0
  const aiAlerts = alerts?.filter((a: any) => a.source?.includes('AI')).length ?? 0

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Summary', 15, y)
  y += 7

  const statsData = [
    ['Total Alerts', String(totalAlerts)],
    ['Total Incidents', String(totalIncidents)],
    ['Critical Alerts', String(criticalCount)],
    ['AI-Detected Alerts', String(aiAlerts)],
    ['Resolved/Closed', String(resolved)],
    ['Resolution Rate', `${resolutionRate}%`],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [17, 26, 46], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
    margin: { left: 15, right: 15 },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  // Incidents table
  if (incidents && incidents.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Incidents', 15, y)
    y += 7

    const incidentRows = incidents.map((inc: any) => [
      inc.title?.substring(0, 40) ?? '',
      (inc as any).sites?.name ?? '—',
      inc.severity ?? '',
      inc.status ?? '',
      inc.guard_id ? 'Assigned' : 'Unassigned',
      new Date(inc.started_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Incident', 'Site', 'Severity', 'Status', 'Guard', 'Started']],
      body: incidentRows,
      theme: 'striped',
      headStyles: { fillColor: [17, 26, 46], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    })

    y = (doc as any).lastAutoTable.finalY + 12
  }

  // Alerts table
  if (alerts && alerts.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Alerts', 15, y)
    y += 7

    const alertRows = alerts.slice(0, 30).map((a: any) => [
      a.title?.substring(0, 40) ?? '',
      a.severity ?? '',
      a.status ?? '',
      a.source ?? '',
      new Date(a.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Alert', 'Severity', 'Status', 'Source', 'Created']],
      body: alertRows,
      theme: 'striped',
      headStyles: { fillColor: [17, 26, 46], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    })
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Primex Security — ${report.name} — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
  }

  // Return as base64 data URI
  return doc.output('datauristring')
}
