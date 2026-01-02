# Tennis Mate - Project History & Changelog

This document serves as the master record for releases, daily summaries, and bug fixes for the Tennis Mate project.

---

## 📅 Daily Summaries (Recent)

### 2026-01-03
- **Batch Save Implementation**: Optimized Google Sheets saving. Matches are now saved in parallel when clicking "End Session".
- **Location Save Fix**: Unified Apps Script template and data service parser to 11 columns, fixing the issue where `location` was not saved.
- **Saving UI**: Added a full-screen loading overlay during session end to provide user feedback and prevent race conditions.
- **Silent Mode Switch**: Removed the confirmation dialog when exiting a mode.
- **Documentation Consolidation**: Merged `CHANGELOG.md`, `ERRORS.md`, and `DAILY_SUMMARY_2024-12-31.md` into this file.

### 2026-01-02
- **Analytics & Stats**: Added `AnalyticsView` with "Me Stats", "Best Partners", and "Head-to-Head" rivalry analysis.
- **Location Optimization**: Geolocation timeouts increased to 10s, precision adjusted for mobile compatibility.
- **Location Suggestions**: Fetches last 100 locations from Google Sheets history to provide quick autocomplete.

### 2024-12-31 (Cloud UX Improvements)
- **Bug #16 Fixed**: Resolved issue where Global List players were added as `inactive`.
- **Default Players**: Added auto-generation of 5 default players for new Cloud sessions.
- **Performance**: Used `Promise.all` for parallel player creation in Supabase.
- **UI Refactor**: Moved Session Manager to a global modal overlay for better flow.

---

## 🚀 الكامل Changelog

### [1.0.0] - 2026-01-02
**🎉 MVP Release**
- **Google Sheets Mode**: Use your own spreadsheet as a database.
- **Head-to-Head Analysis**: Compare rivalry stats between any two players.
- **Core Features**: 4-8 player Round Robin, fair rest allocation, AI Coach (Gemini), and cross-platform support.

### [0.9.1] - 2024-12-31
- Cloud Mode UX improvements and bug fixes.
- Parallel processing for faster data sync.

### [0.9.0] - 2024-12-30
- **Cloud Mode**: Supabase integration.
- **Enhanced Stats**: Recharts integration for performance tracking.

### [0.8.0] - 2024-12-29
- Initial Round Robin logic and fair rest rotation algorithm.
- Drag-and-drop match reordering.

### [0.1.0] - 2024-12-25
- Initial version with local storage and basic player management.

---

## 🐞 Error & Bug History (Consolidated)

| ID | Issue | Severity | Resolution |
|---|---|---|---|
| 01 | Gemini API Key missing in Vite | 🔥 Critical | Fixed by using `import.meta.env.VITE_GEMINI_API_KEY`. |
| 02 | `getAllPlayers` not exported | 🔥 Critical | Added export to `AppContext`. |
| 03 | Cloud save sync (no rollback) | 🔥 Critical | Implemented try-catch with state rollback. |
| 07 | Team data type mismatch (JSONB) | 🔥 Critical | Fixed Supabase schema and payload structure. |
| 09 | Session ID lost on refresh | 🔥 Critical | Added `localStorage` persistence for Session IDs. |
| 10 | Location value not saving (Sheets) | 🔥 High | Unified 11-column schema and fixed `resetData` wipe bug. |
| 16 | Global players added as inactive | 🔥 Critical | Modified `addPlayer` to force `active: true` for sessions. |

*For more technical details on historical fixes, refer to the commit history.*

---

## 🛠 Google Sheets Technical Explainer

### Spreadsheet Schema (v1.1.0)
| Column | Name | Description |
|---|---|---|
| A | timestamp | Record creation time in Script |
| B | date | Match start time (YYYY-MM-DD HH:mm) |
| C | duration | Match length in minutes |
| D-G | Players | Winner1, Winner2, Loser1, Loser2 |
| H | score | Display score (e.g. "6-4") |
| I | winner_score | Numerical score for winners |
| J | loser_score | Numerical score for losers |
| K | location | Court location string |
