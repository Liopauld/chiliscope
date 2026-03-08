/**
 * Admin Analytics Export Utilities
 * Exports dashboard analytics data as PDF or Excel.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// ── Types ──
interface ExportData {
  stats: {
    totalUsers: number
    totalAnalyses: number
    avgAccuracy: number
    samplesToday: number
    samplesThisWeek: number
    activeUsers: number
    modelsDeployed: number
  }
  varietyDistribution: Record<string, number>   // raw counts
  heatDistribution: Record<string, number>      // raw counts
  usersByType: Record<string, number>
  recentActivity: { text: string; time: string; icon: string }[]
}

const fmtDate = () => {
  const d = new Date()
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

const fmtTimestamp = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Per-section AI interpretation block ──
interface SectionInsights {
  overview?: string
  variety?: string
  heat?: string
  users?: string
  recommendations?: string
}

/** Render a styled AI insight box below a section (no label, just interpretation text) */
function renderInsightBox(doc: jsPDF, text: string, yStart: number, pageW: number): number {
  let y = yStart
  const boxLeft = 14
  const boxWidth = pageW - 28
  const maxTextW = boxWidth - 12
  const lineH = 4.8

  // Wrap text first to compute height
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  const lines = doc.splitTextToSize(text, maxTextW) as string[]
  const blockH = 6 + lines.length * lineH + 6 // padding-top + text + padding-bottom

  // Page break check
  if (y + blockH > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    y = 16
  }

  // Light background box
  doc.setFillColor(254, 242, 242) // red-50
  doc.setDrawColor(252, 165, 165) // red-300
  doc.roundedRect(boxLeft, y, boxWidth, blockH, 2, 2, 'FD')

  // Body text (no label)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(75, 85, 99) // gray-600
  doc.text(lines, boxLeft + 5, y + 6)

  // Reset text color
  doc.setTextColor(31, 41, 55)
  return y + blockH + 6
}

// ── Chart helpers ──

type RGB = [number, number, number]

/** Draw a horizontal stacked bar chart with legend */
function drawStackedBar(
  doc: jsPDF,
  data: { label: string; value: number; color: RGB }[],
  x: number, y: number, width: number, barH: number,
): number {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return y + barH + 30

  let cx = x

  // Draw stacked bar segments
  for (const item of data) {
    const segW = (item.value / total) * width
    if (segW < 0.5) continue
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.roundedRect(cx, y, segW, barH, cx === x ? 2 : 0, cx === x ? 2 : 0, 'F')
    // Draw a clean rect over the rounded one for inner segments
    if (cx !== x) {
      doc.rect(cx, y, segW, barH, 'F')
    }
    cx += segW
  }

  // Draw right cap with rounding
  if (data.length > 0) {
    const lastItem = data[data.length - 1]
    const lastSegW = (lastItem.value / total) * width
    if (lastSegW > 2) {
      doc.setFillColor(lastItem.color[0], lastItem.color[1], lastItem.color[2])
      doc.roundedRect(cx - lastSegW, y, lastSegW, barH, 0, 2, 'F')
      if (lastSegW > 4) {
        doc.rect(cx - lastSegW, y, lastSegW - 2, barH, 'F')
      }
    }
  }

  // Legend below
  let ly = y + barH + 6
  let lx = x
  doc.setFontSize(8)
  for (const item of data) {
    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
    const labelText = `${item.label}: ${item.value.toLocaleString()} (${pct}%)`
    // Colored square
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.rect(lx, ly, 3, 3, 'F')
    // Text
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    doc.text(labelText, lx + 5, ly + 2.5)
    lx += doc.getTextWidth(labelText) + 14
    // Wrap to next line if too wide
    if (lx > x + width - 20) {
      lx = x
      ly += 7
    }
  }

  doc.setTextColor(31, 41, 55)
  return ly + 10
}

/** Draw a vertical bar chart with labels */
function drawBarChart(
  doc: jsPDF,
  data: { label: string; value: number; color: RGB }[],
  x: number, y: number, width: number, chartH: number,
): number {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barCount = data.length
  const gap = 8
  const barW = Math.min(30, (width - gap * (barCount + 1)) / barCount)
  const totalBarsW = barCount * barW + (barCount - 1) * gap
  const startX = x + (width - totalBarsW) / 2

  // Baseline
  doc.setDrawColor(229, 231, 235) // gray-200
  doc.setLineWidth(0.3)
  doc.line(x, y + chartH, x + width, y + chartH)

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const bx = startX + i * (barW + gap)
    const bh = maxVal > 0 ? (item.value / maxVal) * (chartH - 10) : 0
    const by = y + chartH - bh

    // Bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.roundedRect(bx, by, barW, bh, 1.5, 1.5, 'F')
    // Fix bottom corners (fill small rect)
    if (bh > 3) {
      doc.rect(bx, by + bh - 1.5, barW, 1.5, 'F')
    }

    // Value label above bar
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(item.color[0], item.color[1], item.color[2])
    doc.text(item.value.toLocaleString(), bx + barW / 2, by - 2, { align: 'center' })

    // Category label below
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(item.label, bx + barW / 2, y + chartH + 5, { align: 'center' })
  }

  doc.setTextColor(31, 41, 55)
  return y + chartH + 12
}

// ── Color maps ──
const varietyColors: Record<string, RGB> = {
  'Siling Haba': [34, 197, 94],     // green-500
  'Siling Labuyo': [249, 115, 22],   // orange-500
  'Siling Demonyo': [220, 38, 38],   // red-600
}

const heatColors: Record<string, RGB> = {
  'Mild': [34, 197, 94],       // green-500
  'Medium': [245, 158, 11],    // amber-500
  'Hot': [249, 115, 22],       // orange-500
  'Extra Hot': [220, 38, 38],  // red-600
}

const userColors: RGB[] = [
  [220, 38, 38],   // red-600 (admin)
  [59, 130, 246],  // blue-500 (researcher)
  [107, 114, 128], // gray-500 (user)
]

// ────────────────── PDF ──────────────────
export function exportAnalyticsPDF(data: ExportData, insights?: SectionInsights) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 16

  // ── Header ──
  doc.setFillColor(220, 38, 38) // red-600
  doc.rect(0, 0, pageW, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('ChiliScope — Analytics Report', 14, y + 6)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on ${fmtDate()}`, 14, y + 14)
  y = 46

  // ── Summary Stats (keep as table) ──
  doc.setTextColor(31, 41, 55) // gray-800
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Overview Statistics', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Users', data.stats.totalUsers.toLocaleString()],
      ['Active Users (30 days)', data.stats.activeUsers.toLocaleString()],
      ['Total Analyses', data.stats.totalAnalyses.toLocaleString()],
      ['Analyses Today', data.stats.samplesToday.toLocaleString()],
      ['Analyses This Week', data.stats.samplesThisWeek.toLocaleString()],
      ['Average Accuracy', `${data.stats.avgAccuracy}%`],
      ['Models Deployed', data.stats.modelsDeployed.toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // AI insight for Overview
  if (insights?.overview) {
    y = renderInsightBox(doc, insights.overview, y, pageW)
  } else {
    y += 6
  }

  // ── Variety Distribution (stacked bar chart) ──
  const varietyEntries = Object.entries(data.varietyDistribution)
  if (varietyEntries.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Variety Distribution', 14, y)
    y += 8

    const chartData = varietyEntries.map(([name, count]) => ({
      label: name,
      value: count,
      color: varietyColors[name] || [156, 163, 175] as RGB,
    }))

    y = drawStackedBar(doc, chartData, 14, y, pageW - 28, 14)

    // AI insight for Variety
    if (insights?.variety) {
      y = renderInsightBox(doc, insights.variety, y, pageW)
    } else {
      y += 6
    }
  }

  // ── Heat Level Distribution (vertical bar chart) ──
  const heatEntries = Object.entries(data.heatDistribution)
  if (heatEntries.length > 0) {
    if (y > 190) { doc.addPage(); y = 16 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Heat Level Distribution', 14, y)
    y += 8

    const chartData = heatEntries.map(([name, count]) => ({
      label: name,
      value: count,
      color: heatColors[name] || [156, 163, 175] as RGB,
    }))

    y = drawBarChart(doc, chartData, 14, y, pageW - 28, 50)

    // AI insight for Heat
    if (insights?.heat) {
      y = renderInsightBox(doc, insights.heat, y, pageW)
    } else {
      y += 6
    }
  }

  // ── User Distribution (stacked bar chart) ──
  const userEntries = Object.entries(data.usersByType)
  if (userEntries.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('User Distribution by Role', 14, y)
    y += 8

    const chartData = userEntries.map(([role, count], i) => ({
      label: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
      color: userColors[i] || [156, 163, 175] as RGB,
    }))

    y = drawStackedBar(doc, chartData, 14, y, pageW - 28, 14)

    // AI insight for Users
    if (insights?.users) {
      y = renderInsightBox(doc, insights.users, y, pageW)
    } else {
      y += 6
    }
  }

  // ── Recent Activity (keep as table) ──
  if (data.recentActivity.length > 0) {
    if (y > 220) { doc.addPage(); y = 16 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Recent Activity', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Activity', 'Time']],
      body: data.recentActivity.map((a) => [
        a.text,
        new Date(a.time).toLocaleString('en-PH'),
      ]),
      headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
      styles: { fontSize: 9, cellWidth: 'wrap' },
      columnStyles: { 0: { cellWidth: 120 } },
      margin: { left: 14, right: 14 },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // ── AI Recommendations (final section) ──
  if (insights?.recommendations) {
    if (y > 230) { doc.addPage(); y = 16 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('AI-Powered Recommendations', 14, y)
    y += 2

    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(156, 163, 175)
    doc.text('Generated by Google Gemini AI based on the analytics data above.', 14, y + 4)
    y += 10

    y = renderInsightBox(doc, insights.recommendations, y, pageW)
  }

  // ── Footer ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `ChiliScope Analytics Report — Page ${i} of ${totalPages} — © ${new Date().getFullYear()} TUP Taguig | Group 9`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    )
  }

  doc.save(`ChiliScope_Analytics_${fmtTimestamp()}.pdf`)
}


// ────────────────── EXCEL ──────────────────
export function exportAnalyticsExcel(data: ExportData) {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Overview ──
  const overviewRows = [
    ['ChiliScope Analytics Report'],
    [`Generated: ${fmtDate()}`],
    [],
    ['Metric', 'Value'],
    ['Total Users', data.stats.totalUsers],
    ['Active Users (30 days)', data.stats.activeUsers],
    ['Total Analyses', data.stats.totalAnalyses],
    ['Analyses Today', data.stats.samplesToday],
    ['Analyses This Week', data.stats.samplesThisWeek],
    ['Average Accuracy (%)', data.stats.avgAccuracy],
    ['Models Deployed', data.stats.modelsDeployed],
  ]
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows)
  wsOverview['!cols'] = [{ wch: 26 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview')

  // ── Sheet 2: Variety Distribution ──
  const varietyEntries = Object.entries(data.varietyDistribution)
  const totalV = varietyEntries.reduce((s, [, c]) => s + c, 0)
  const varietyRows = [
    ['Variety', 'Count', '% of Total'],
    ...varietyEntries.map(([name, count]) => [
      name,
      count,
      totalV > 0 ? Math.round((count / totalV) * 100) : 0,
    ]),
    [],
    ['Total', totalV, '100'],
  ]
  const wsVariety = XLSX.utils.aoa_to_sheet(varietyRows)
  wsVariety['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsVariety, 'Varieties')

  // ── Sheet 3: Heat Levels ──
  const heatEntries = Object.entries(data.heatDistribution)
  const totalH = heatEntries.reduce((s, [, c]) => s + c, 0)
  const heatRows = [
    ['Heat Level', 'Count', '% of Total'],
    ...heatEntries.map(([name, count]) => [
      name,
      count,
      totalH > 0 ? Math.round((count / totalH) * 100) : 0,
    ]),
    [],
    ['Total', totalH, '100'],
  ]
  const wsHeat = XLSX.utils.aoa_to_sheet(heatRows)
  wsHeat['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsHeat, 'Heat Levels')

  // ── Sheet 4: Users ──
  const userEntries = Object.entries(data.usersByType)
  const userRows = [
    ['Role', 'Count'],
    ...userEntries.map(([role, count]) => [
      role.charAt(0).toUpperCase() + role.slice(1),
      count,
    ]),
  ]
  const wsUsers = XLSX.utils.aoa_to_sheet(userRows)
  wsUsers['!cols'] = [{ wch: 16 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsUsers, 'Users')

  // ── Sheet 5: Recent Activity ──
  if (data.recentActivity.length > 0) {
    const actRows = [
      ['Activity', 'Time'],
      ...data.recentActivity.map((a) => [
        a.text,
        new Date(a.time).toLocaleString('en-PH'),
      ]),
    ]
    const wsAct = XLSX.utils.aoa_to_sheet(actRows)
    wsAct['!cols'] = [{ wch: 48 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, wsAct, 'Activity')
  }

  // Write & download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbOut], { type: 'application/octet-stream' })
  saveAs(blob, `ChiliScope_Analytics_${fmtTimestamp()}.xlsx`)
}
