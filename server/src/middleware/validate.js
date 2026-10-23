/**
 * Request validation middleware helper.
 * Validates req.body against a schema of field rules.
 * rules example:
 * {
 *   email: { required: true, isEmail: true },
 *   password: { required: true, minLength: 6 }
 * }
 */
const validateBody = (rules) => {
  return (req, res, next) => {
    const errors = {};
    const body = req.body || {};

    for (const [field, rule] of Object.entries(rules)) {
      const val = body[field];

      if (rule.required && (val === undefined || val === null || val === '')) {
        errors[field] = rule.message || `${field} is required`;
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (rule.isEmail) {
          const emailRegex = /^\S+@\S+\.\S+$/;
          if (!emailRegex.test(String(val))) {
            errors[field] = 'Please provide a valid email address';
          }
        }

        if (rule.minLength && String(val).length < rule.minLength) {
          errors[field] = `${field} must be at least ${rule.minLength} characters`;
        }

        if (rule.maxLength && String(val).length > rule.maxLength) {
          errors[field] = `${field} cannot exceed ${rule.maxLength} characters`;
        }

        if (rule.isNumber && isNaN(Number(val))) {
          errors[field] = `${field} must be a valid number`;
        }

        if (rule.enum && !rule.enum.includes(val)) {
          errors[field] = `${field} must be one of: ${rule.enum.join(', ')}`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
};

module.exports = { validateBody };
