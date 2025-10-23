/**
 * calculateSalary(inputs, opts)
 * inputs: object with fields same as Salary model
 * opts: policy options: overtime multipliers (defaults to 1 = straight add)
 */
function calculateSalary(inputs = {}, opts = {}) {
  const {
    baseSalary = 0,
    workingDaysInMonth = 30,
    hoursPerDay = 8,
    advance = 0,
    overtimeDays = 0,
    overtimeHours = 0,
    leavesTaken = 0,
    epf = 0,
    bonus = 0,
    expense = 0,
    adjustments = [],
    lateMinutes = 0
  } = inputs;

  const {
    overtimeDayMultiplier = 1,
    overtimeHourMultiplier = 1
  } = opts;

  // primary rates
  const perDay = (workingDaysInMonth > 0) ? (Number(baseSalary) / Number(workingDaysInMonth)) : 0;
  const perHour = (hoursPerDay > 0) ? (perDay / Number(hoursPerDay)) : 0;

  // overtime pay (straight add by default)
  const overtimeFromDays = Number(overtimeDays) * perDay * overtimeDayMultiplier;
  const overtimeFromHours = Number(overtimeHours) * perHour * overtimeHourMultiplier;

  // late deduction (per minute)
  const lateDeduction = (perHour / 60) * Number(lateMinutes || 0);

  // adjustments sum (pos or neg)
  const adjustmentsTotal = (adjustments || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const positiveAdjustments = Math.max(0, adjustmentsTotal);
  const negativeAdjustments = Math.min(0, adjustmentsTotal); // negative or 0

  const additions = Number(bonus || 0) + Number(expense || 0) + Number(overtimeFromDays) + Number(overtimeFromHours) + positiveAdjustments;
  const leaveDeduction = Number(leavesTaken || 0) * perDay;

  const totalDeductions = Number(advance || 0) + Number(epf || 0) + Number(leaveDeduction || 0) + Math.abs(negativeAdjustments) + Number(lateDeduction || 0);

  const grossPay = Number(baseSalary || 0) + additions;
  const netPay = grossPay - totalDeductions;

  // return snapshot fields
  return {
    perDay, perHour,
    overtimeFromDays, overtimeFromHours,
    lateDeduction,
    additions,
    leaveDeduction,
    adjustmentsTotal,
    totalDeductions,
    grossPay,
    netPay
  };
}

module.exports = { calculateSalary };
