const crypto = require('crypto');

// Clear alphabet excluding confusing characters: 0, O, 1, I, L
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const generateRandomCode = (length = 6) => {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
};

/**
 * Generate a unique, unpredictable recruitment drive code like HIRE-K8P4X7
 */
const generateUniqueDriveCode = async (RecruitmentDriveModel, prefix = 'HIRE') => {
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomPart = generateRandomCode(6);
    code = `${prefix}-${randomPart}`;
    const existing = await RecruitmentDriveModel.findOne({ driveCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback if collision limit reached
    code = `${prefix}-${Date.now().toString(36).toUpperCase()}-${generateRandomCode(3)}`;
  }

  return code;
};

module.exports = {
  generateRandomCode,
  generateUniqueDriveCode,
};
