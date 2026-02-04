# 🚀 START HERE - Performance System 2.0

## Welcome to the New Performance Management System!

This is your quick start guide. Everything is ready to go!

---

## ⚡ Quick Start (5 Minutes)

### **1. Start Your Server**
```bash
cd server
npm run dev
```

### **2. Run Migration** (One-time only)
```bash
node server/scripts/migratePerformanceToNewSystem.js
```

### **3. Start Frontend**
```bash
cd client
npm run dev
```

### **4. Test It!**
- Open http://localhost:3000
- Login as admin
- Go to Performance page
- Click "Add Review"
- Select a month from the date picker
- Save!

---

## 🎯 What Changed?

### **The Big Change: reviewForMonth**

**Before:**
```
Period: "2025-Q1"  ❌ What does this mean?
```

**Now:**
```
Review for: January 2025  ✅ Crystal clear!
```

**How it works:**
- Admin selects **which month** they're reviewing
- Example: Today is Feb 15, reviewing January performance
- Candidate sees: "Review for: January 2025"

---

## 📝 Create Your First Review

1. **Go to Performance page** (Admin)
2. **Click "Add Review"**
3. **Fill the form:**
   - Select employee
   - **Pick month** (e.g., "January 2025") ← NEW!
   - Rate 1-5 stars
   - Write feedback
   - (Optional) Override financial amounts
4. **Save!**

---

## 💰 Financial Rules

| Stars | What Happens |
|-------|--------------|
| 5★    | +₹1,000 incentive |
| 4★    | +₹500 incentive |
| 3★    | No change |
| 2★    | -₹300 penalty |
| 1★    | -₹500 penalty |

You can override these amounts if needed!

---

## 🚨 Notice Period Warning

**Triggers when:**
- Employee gets ceiling average ≤ 1
- For 2 consecutive months

**Example:**
- January: [1, 1] → ceiling 1 ⚠️
- February: [1, 2] → ceiling 2 ✅ (cleared)
- March: [1, 1] → ceiling 1 ⚠️
- April: [1, 1] → ceiling 1 🚨 **WARNING!**

---

## 📚 Documentation

**Quick Lookup:**
- `QUICK_REFERENCE.md` - Fast answers

**Detailed Guides:**
- `PERFORMANCE_SYSTEM_IMPLEMENTATION.md` - Technical details
- `FRONTEND_UPDATE_GUIDE.md` - UI changes
- `DEPLOYMENT_READY.md` - Deployment guide

**Files:**
- `START_HERE.md` - This file

---

## 🧪 Test Scenarios

### **Scenario 1: Create Review**
1. Login as admin
2. Go to Performance page
3. Click "Add Review"
4. Select employee: "John Doe"
5. Select month: "January 2025"
6. Rate: 5 stars
7. Feedback: "Excellent work!"
8. Save
9. ✅ Should see: Review created, +₹1,000 incentive

### **Scenario 2: Trigger Warning**
1. Create review for Employee A
2. Month: January, Score: 1 star
3. Create another review
4. Month: February, Score: 1 star
5. ✅ Should see: Warning message about notice period

### **Scenario 3: View as Candidate**
1. Login as candidate
2. Go to My Performance
3. ✅ Should see: "Review for: January 2025"
4. ✅ Should see: Financial info (incentives/penalties)
5. ✅ Should see: Cycle selector

---

## ❓ FAQ

**Q: What if I already have old data?**
A: Run the migration script. It converts everything automatically.

**Q: Can I give more than 2 reviews per month?**
A: No, max 2 reviews per month per employee.

**Q: What's a "cycle"?**
A: A 6-month period (Jan-Jun or Jul-Dec). Used for summaries.

**Q: Can I change financial amounts?**
A: Yes! Use the override fields and provide a reason.

**Q: What happens when a cycle closes?**
A: All summaries freeze. Data is preserved forever.

**Q: How do I see old reviews?**
A: Use the cycle selector to switch between periods.

---

## 🆘 Need Help?

**Problem:** Can't create review
**Check:** Is reviewForMonth selected? Is feedback filled?

**Problem:** Warning not showing
**Check:** Are there 2 consecutive months with score ≤ 1?

**Problem:** Wrong financial amount
**Check:** Is there an override? Check default rules.

**Problem:** Old data not showing
**Check:** Did you run the migration script?

---

## 🎓 Key Concepts

### **reviewForMonth**
The month you're evaluating. Not when you're giving the review.

### **Ceiling Average**
When 2 reviews exist: [4, 5] → 4.5 → rounds UP to 5

### **Performance Tags**
Auto-assigned: Outstanding, Very Good, Average, Below Average, Worst

### **Cycle**
6-month period for summaries. Jan-Jun or Jul-Dec.

### **Notice Period Warning**
2 consecutive months with ceiling ≤ 1 = Warning

---

## ✅ Checklist

Before using the system:
- [ ] Server running
- [ ] Migration completed (if you have old data)
- [ ] Frontend running
- [ ] Can login as admin
- [ ] Can see Performance page
- [ ] Can create a review
- [ ] Can see review as candidate

---

## 🎉 You're Ready!

Everything is set up and ready to use. The new system is:
- ✅ More clear (reviewForMonth)
- ✅ More powerful (financial tracking)
- ✅ More organized (6-month cycles)
- ✅ More informative (warnings, tags, summaries)

**Start creating reviews and see the magic happen!**

---

**Questions?** Check the other documentation files.

**Happy reviewing! 🌟**
