import dotenv from 'dotenv';
import { JWT } from 'google-auth-library';

dotenv.config({ path: '.env' });
const spreadsheetId = '11PJapAQL5uJZJgVvwCKvWh7XgPe62kLxpb3OP45sJKY';
const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey = rawKey.includes('-----BEGIN') ? rawKey.replace(/\\n/g, '\n') : Buffer.from(rawKey, 'base64').toString('utf8');
const client = new JWT({
  email: process.env.FIREBASE_CLIENT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const token = await client.getAccessToken();
const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:J5`, {
  headers: { Authorization: `Bearer ${token.token}` },
});
console.log('status', res.status);
console.log(await res.text());
