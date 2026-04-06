
/**
 * Formats a numeric year level into a human-readable string based on the program type.
 * Defaulting to institutional standards: SHS uses "Grade", College uses "Year".
 * 
 * @param {number|string} level - The Year Level / Grade Level
 * @param {string} programType - The type of program ('College', 'SHS', 'JHS', etc.)
 * @returns {string} - Formatted label (e.g., "Grade 11" or "Year 1")
 */
export const formatYearLevel = (level, programType) => {
  if (!level) return 'N/A';
  
  const type = programType?.toUpperCase();
  
  if (type === 'SHS') {
    return `Grade ${level}`;
  }
  
  if (type === 'JHS') {
    return `Grade ${level}`;
  }

  // College or Generic
  return `Year ${level}`;
};

/**
 * Returns the short label for a level (e.g., "G11" or "Y1")
 */
export const formatYearLevelShort = (level, programType) => {
  if (!level) return '?';
  const type = programType?.toUpperCase();
  const prefix = (type === 'SHS' || type === 'JHS') ? 'G' : 'Y';
  return `${prefix}${level}`;
};
