# Advanced Analytics Dashboard — Instructor Features

## Overview

Adding 4 new analytics features to the **instructor portal**, accessible via a new top-level **"Analytics"** nav link (`/instructor/analytics`) with an internal tab system. Also includes functional **CSV export** for the existing "Export CSV" button on the Live Session page.

---

## Architecture Decision: Single Page with Tabs

All 4 panels live under **one new page** `/instructor/analytics` with **4 tabs**:

| Tab | Feature | Description |
|-----|---------|-------------|
| 📊 **Insights** | Attendance Insights | Avg rate per section, top sessions, weekly trend charts |
| 🏅 **Recovery** | Engagement & Recovery Tracker | Students who improved after being flagged, consistency index |
| 📋 **Reports** | Attendance Summary Reports | Monthly summaries, filterable, downloadable CSV |
| 🔥 **Session Deep-Dive** | Session Analytics | Per-session heatmap, punctuality metrics, session comparison |

---

## Proposed Changes

### Backend — New API Endpoints

#### [MODIFY] [`analyticsRoutes.js`](file:///c:/Users/JAYLO/Downloads/ccdi-qrscan/ccdi-qrscan/server/src/routes/analyticsRoutes.js)

Add 4 new endpoints:

**`GET /analytics/insights/:sectionId`** — Attendance Insights
- Average attendance rate per section
- Top 5 most-attended sessions (by rate)
- Weekly trend data (aggregated by week for line chart)

**`GET /analytics/recovery/:sectionId`** — Recovery Tracker
- Compare each student's current window performance vs. their historical worst
- Calculate "Recovery Score" (0–100): improvement delta from worst-window to latest-window
- Flag students who were previously at-risk but improved

**`GET /analytics/reports`** — Summary Reports Data
- Monthly attendance summaries per section
- Supports query filters: `?sectionId=&month=&year=&instructorId=`
- Returns data structured for CSV download

**`GET /analytics/reports/export-csv`** — CSV Download
- Same filters as above
- Returns a downloadable CSV file (Content-Disposition: attachment)

#### [MODIFY] [`analytics.js`](file:///c:/Users/JAYLO/Downloads/ccdi-qrscan/ccdi-qrscan/server/src/services/analytics.js)

Add service functions:
- `getAttendanceInsights(sectionId)` — computes avg rates, top sessions, weekly trends
- `getRecoveryTracker(sectionId)` — computes recovery scores and consistency index
- `getAttendanceReports(filters)` — aggregates monthly summaries
- `generateReportCSV(filters)` — generates downloadable CSV content

---

### Frontend — New Pages & Components

#### [NEW] `AttendanceInsightsPage.jsx` → `/instructor/analytics`

Single page with 4-tab interface:

**Tab 1: Insights**
- KPI cards: Avg attendance rate, total sessions held, best-performing section
- Recharts `AreaChart` showing weekly attendance trend
- Top 5 most-attended sessions table
- Attendance rate pie chart (present vs late vs absent breakdown)

**Tab 2: Recovery Tracker**
- Students with "Recovery Score" metric (% improvement)
- Visual bar showing worst→current improvement
- Color-coded: green (recovered), amber (improving), red (still at risk)
- Instructor notes column (read-only, showing audit log remarks)

**Tab 3: Reports**
- Monthly summary table grouped by section
- Filters: date range picker, section dropdown, instructor (admin only)
- "Download CSV" button per section or "Download All"
- Clean tabular data: month, section, subject, enrolled, avg rate, present/late/absent counts

**Tab 4: Session Deep-Dive**
- Session-by-session attendance heatmap grid (students × sessions, color-coded cells)
- Punctuality metrics: avg minutes before/after cutoff for each session
- Session comparison bar chart (select 2–3 sessions to compare side by side)

#### [NEW] Chart Components

- `AttendancePieChart.jsx` — Recharts `PieChart` for present/late/absent breakdown
- `SessionHeatmap.jsx` — CSS Grid heatmap of students × sessions
- `RecoveryBarChart.jsx` — Horizontal bar chart showing recovery progress

---

### Frontend — Modified Files

#### [MODIFY] [`Navbar.jsx`](file:///c:/Users/JAYLO/Downloads/ccdi-qrscan/ccdi-qrscan/client/src/components/common/Navbar.jsx)
- Add "Analytics" link in instructor nav section (between "My Sections" and "Risk & Pattern Alerts")
- Uses `BarChart3` icon from lucide-react

#### [MODIFY] [`App.jsx`](file:///c:/Users/JAYLO/Downloads/ccdi-qrscan/ccdi-qrscan/client/src/App.jsx)
- Add route: `<Route path="/instructor/analytics" element={<ProtectedRoute allowedRoles={['instructor','admin']}><AttendanceInsightsPage /></ProtectedRoute>} />`

---

## Open Questions

> [!IMPORTANT]
> **Date range filtering**: Should the monthly reports default to the current semester/academic term, or should they show all-time data? Currently planning to default to current academic term with an option to show all.

> [!IMPORTANT]
> **CSV export from the Reports tab** — You mentioned wanting a functional CSV where all records are downloadable. Should this be:
> - **Per-section** (one CSV per section with all sessions)?
> - **Global** (one big CSV with all sections, all students)?
> - **Both options** (dropdown to choose)?
> Currently planning: both — a per-section download and a "Download All" button.

---

## Verification Plan

### Manual Verification
1. Login as instructor → verify "Analytics" link appears in navbar
2. Navigate to `/instructor/analytics` → verify all 4 tabs render
3. **Insights tab**: verify KPI cards, weekly trend chart, top sessions, pie chart
4. **Recovery tab**: verify recovery scores for students who improved after flags
5. **Reports tab**: filter by section and month → download CSV → verify file content
6. **Session Deep-Dive tab**: verify heatmap grid, punctuality bars, session comparison
7. Verify all data matches the existing data shown in SectionDetailsPage and PatternAlertsPage
