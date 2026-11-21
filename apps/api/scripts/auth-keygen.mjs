// Generates the local issuer's RSA signing key and writes it into the root .env.
// Refuses to overwrite a key that is already set: replacing it invalidates every issued local token.
import { generateKeyPairSync } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const ENV_FILE = new URL('../../../.env', import.meta.url);
const KEY_NAME = 'LOCAL_AUTH_PRIVATE_KEY_PEM';
const PLACEHOLDER = 'replace-with-generated-rsa-private-key-pem';
const RSA_MODULUS_LENGTH = 2048;

const envText = await readFile(ENV_FILE, 'utf8');
const keyLine = new RegExp(`^${KEY_NAME}=([^\\r\\n]*)$`, 'm');
const current = keyLine.exec(envText)?.[1];

if (current !== undefined && current !== PLACEHOLDER) {
  process.stderr.write(`${KEY_NAME} is already set in .env; clear it first to regenerate.\n`);
  process.exitCode = 1;
} else {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_LENGTH,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  // One physical line in .env: newlines are escaped inside double quotes and restored by the env loader.
  const value = `"${privateKey.trimEnd().replaceAll('\n', '\\n')}"`;
  const entry = `${KEY_NAME}=${value}`;
  const updated =
    current === undefined ? `${envText.trimEnd()}\n${entry}\n` : envText.replace(keyLine, entry);
  await writeFile(ENV_FILE, updated, 'utf8');
  process.stdout.write(`Wrote ${KEY_NAME} to .env\n`);
}
