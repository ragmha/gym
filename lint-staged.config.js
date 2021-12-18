module.exports = {
  '*.{js,ts,tsx}': ['eslint --fix', 'jest --bail --findRelatedTests', 'git add'],
  '*.{js,jsx,ts,tsx,json,html,md,css}': ['prettier --write'],
}
