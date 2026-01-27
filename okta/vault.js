import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const VAULT_ADDR = process.env.VAULT_ADDR;
const VAULT_TOKEN = process.env.VAULT_TOKEN;

export async function getOktaSecrets() {
  const url = `${process.env.VAULT_ADDR}/v1/secret/data/okta`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Vault-Token': process.env.VAULT_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vault error: ${res.statusText} - ${errorText}`);
  }

  const json = await res.json();
  return json.data.data;
}