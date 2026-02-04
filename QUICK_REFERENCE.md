# 🚀 Quick Reference - Performance System

## 🔑 Key Concept: reviewForMonth

**The most important change:**

```javascript
// OLD (confusing):
period: "2025-Q1"           // What does this mean?
nextReview: Date            // Next review or current review?

// NEW (crystal clear):
reviewForMonth: Date        // Which month am I reviewing?
reviewDate: Date            // When am I giving this review?
```

**Example:**
- Today is **Feb 15, 2025**
- Admin reviews **January 2025** performance
- `reviewDate`: 2025-02-15
- `reviewForMonth`: 2025-01-01
- Candidate sees: **"Review for January 2025"**

---

## 📝 Create Review (Admin)

```javascript
POST /performance/:candidateId

{
  "reviewForMonth": "2025-01-01",    // Month being reviewed
  "performanceScore": 5,              // 1-5 stars
  "feedback": "Excellent work!",      // Required
  "incentiveOverride": 1500,          // Optional
  "penaltyOverride": 0,               // Optional
  "overrideReason": "Exceptional"     // Optional if override
}
```

---

## 💰 Financial Rules

| Score | Default Incentive | Default Penalty |
|-------|------------------|-----------------|
| 5★    | ₹1,000          | ₹0              |
| 4★    | ₹500            | ₹0              |
| 3★    | ₹0              | ₹0              |
| 2★    | ₹0              | ₹300            |
| 1★    | ₹0              | ₹500            |

Admin can override with reason.

---

## 📊 Monthly Scoring

- **1 review:** Score = that review
- **2 reviews:** Score = CEILING(average)
  - Example: [4, 5] → 4.5 → **5**
  - Example: [3, 4] → 3.5 → **4**
  - Example: [1, 2] → 1.5 → **2**

---

## 🚨 Notice Period Warning

**Triggered when:**
- Ceiling average ≤ 1 for **2 consecutive months**

**Example:**
- January: [1, 1] → ceiling 1 ⚠️
- February: [1, 2] → ceiling 2 ✅ (warning cleared)
- March: [1, 1] → ceiling 1 ⚠️
- April: [1, 1] → ceiling 1 🚨 **WARNING!**

---

## 🏷️ Performance Tags

| Score | Tag            | Color  |
|-------|----------------|--------|
| 5★    | Outstanding    | Green  |
| 4★    | Very Good      | Blue   |
| 3★    | Average        | Yellow |
| 2★    | Below Average  | Orange |
| 1★    | Worst          | Red    |

---

## 📅 Cycles

- **Duration:** 6 months
- **Periods:** Jan-Jun, Jul-Dec
- **Status:** Active or Closed
- **Closure:** Manual by admin
- **Effect:** Freezes all summaries

---

## 🔍 Common Queries

### Get active cycle:
```
GET /performance/cycles/active
```

### Get my performance:
```
GET /performance/me?cycleId=xxx
```

### Get leaderboard:
```
GET /performance/leaderboard?cycleId=xxx&limit=10
```

### Get warnings:
```
GET /performance/warnings?cycleId=xxx
```

---

## 🛠️ Migration

```bash
node server/scripts/migratePerformanceToNewSystem.js
```

**What it does:**
1. Creates cycles from historical dates
2. Converts old records to new format
3. Generates monthly summaries
4. Generates cycle summaries
5. Detects warnings

---

## 📱 Frontend Changes

### Admin Form:
- ❌ Remove: `period` text input
- ❌ Remove: `nextReview` date picker
- ✅ Add: `reviewForMonth` month picker
- ✅ Add: `incentiveOverride` (optional)
- ✅ Add: `penaltyOverride` (optional)
- ✅ Add: `overrideReason` (optional)

### Candidate View:
- ✅ Show: "Review for: [Month]"
- ✅ Show: Cycle selector
- ✅ Show: Warning banner if flagged
- ✅ Show: Financial info (incentives/penalties)

---

## ✅ Testing Checklist

**Backend:**
- [ ] Create review with reviewForMonth
- [ ] Max 2 reviews per month enforced
- [ ] Ceiling average calculated correctly
- [ ] Notice warning triggered correctly
- [ ] Financial amounts correct
- [ ] Overrides work

**Frontend:**
- [ ] Admin selects reviewForMonth
- [ ] Candidate sees "Review for: [Month]"
- [ ] Warning banner shows when flagged
- [ ] Financial info displays
- [ ] Cycle selector works

---

## 🆘 Quick Fixes

**Problem:** Can't create review
**Check:** Is reviewForMonth provided? Is feedback provided?

**Problem:** Warning not showing
**Check:** Are there 2 consecutive months with ceiling ≤ 1?

**Problem:** Wrong financial amount
**Check:** Is there an override? Check default rules.

**Problem:** Summaries not updating
**Check:** Post-save middleware in PerformanceReview model

---

## 📞 Documentation

- `PERFORMANCE_SYSTEM_IMPLEMENTATION.md` - Full technical docs
- `FRONTEND_UPDATE_GUIDE.md` - UI update guide
- `IMPLEMENTATION_COMPLETE.md` - Deployment guide
- `QUICK_REFERENCE.md` - This file

---

**Version:** 2.0.0  
**Last Updated:** February 4, 2026
