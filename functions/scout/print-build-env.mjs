/**
 * Runs during `npm install` (preinstall). Logs process.env entries that are not
 * treated as secrets so CI / Appwrite build logs show effective configuration.
 */

const SECRET_NAME_REGEXES = [
  /SECRET/i,
  /PASSWORD|PASSWD/i,
  /API_KEY$/i,
  /_API_KEY$/i,
  /PRIVATE_KEY/i,
  /CREDENTIAL/i,
  /SIGNING/i,
  /CERTIFICATE/i,
  /BEARER/i,
  /AUTHORIZATION/i,
  /^npm_config_/i,
  /\bTOKEN\b/i,
  /ENCRYPT/i,
];

function isSecretEnvName(name) {
  return SECRET_NAME_REGEXES.some((re) => re.test(name));
}

const MAX_VALUE_LEN = 500;

function formatValue(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.length <= MAX_VALUE_LEN) return s;
  return `${s.slice(0, MAX_VALUE_LEN)}… (${s.length} chars total)`;
}

const keys = Object.keys(process.env).filter((k) => !isSecretEnvName(k)).sort();

console.log('\n[scout build] Non-secret environment variables:\n');
for (const key of keys) {
  console.log(`  ${key}=${formatValue(process.env[key])}`);
}
console.log(`\n[scout build] (${keys.length} variables shown; secret-like names omitted)\n`);
