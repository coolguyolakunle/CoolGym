export const passwordRequirements = [
  ['length', 'At least 8 characters', (password) => password.length >= 8],
  ['uppercase', 'One uppercase letter', (password) => /[A-Z]/.test(password)],
  ['lowercase', 'One lowercase letter', (password) => /[a-z]/.test(password)],
  ['number', 'One number', (password) => /[0-9]/.test(password)],
  ['special', 'One special character', (password) => /[^A-Za-z0-9]/.test(password)],
];

export const meetsPasswordRequirements = (password = '') =>
  passwordRequirements.every(([, , test]) => test(password));
