// Date utilities for month-based period calculation

export interface PeriodCalculation {
  totalMonths: number;
  totalYears: number;
  yearlyBreakdown: Array<{
    year: number;
    monthsInYear: number;
    startMonth: number;
    endMonth: number;
    isPartialYear: boolean;
  }>;
}

/**
 * Calculate the period between start and end dates with month-based precision
 */
export function calculatePeriod(startDate: Date, endDate: Date): PeriodCalculation {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  const totalYears = Math.ceil(totalMonths / 12);
  
  const yearlyBreakdown = [];
  let currentYear = startYear;
  
  while (currentYear <= endYear) {
    let yearStartMonth: number;
    let yearEndMonth: number;
    
    if (currentYear === startYear) {
      yearStartMonth = startMonth + 1; // Convert to 1-based month
    } else {
      yearStartMonth = 1;
    }
    
    if (currentYear === endYear) {
      yearEndMonth = endMonth + 1; // Convert to 1-based month
    } else {
      yearEndMonth = 12;
    }
    
    const monthsInYear = yearEndMonth - yearStartMonth + 1;
    const isPartialYear = yearStartMonth !== 1 || yearEndMonth !== 12;
    
    yearlyBreakdown.push({
      year: currentYear,
      monthsInYear,
      startMonth: yearStartMonth,
      endMonth: yearEndMonth,
      isPartialYear,
    });
    
    currentYear++;
  }
  
  return {
    totalMonths,
    totalYears,
    yearlyBreakdown,
  };
}
