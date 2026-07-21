/*
 * genera-chiavi-vapid.mjs
 *
 * Genera la coppia di chiavi VAPID necessaria per inviare push
 * notification (RFC 8292). Va eseguito UNA SOLA VOLTA: le chiavi
 * generate qui restano fisse per tutta la vita del sito (se cambiano,
 * tutti gli iscritti dovrebbero re-iscriversi).
 *
 * Uso:
 *   npm install
 *   node scripts/genera-chiavi-vapid.mjs
 *
 * L'output NON va mai committato nel repo. Le due chiavi vanno:
 *   - VAPID_PUBLIC_KEY  → incollata in js/push.js (VAPID_PUBLIC_KEY)
 *                          ed è anche una variabile d'ambiente di
 *                          Cloudflare Pages (può restare "pubblica")
 *   - VAPID_PRIVATE_KEY → SOLO come secret di Cloudflare Pages
 *                          (Settings → Environment variables →
 *                          "Encrypt"), mai nel codice, mai su GitHub.
 */
import { webcrypto } from 'node:crypto';
import { ApplicationServerKeys, setWebCrypto } from 'webpush-webcrypto';

setWebCrypto(webcrypto);

const keys = await ApplicationServerKeys.generate();
const json = await keys.toJSON();

console.log('\nChiavi VAPID generate. Salvale subito in un posto sicuro (es. password manager):\n');
console.log('VAPID_PUBLIC_KEY  =', json.publicKey);
console.log('VAPID_PRIVATE_KEY =', json.privateKey);
console.log('\nProssimi passi:');
console.log('1. Incolla VAPID_PUBLIC_KEY in js/push.js, costante VAPID_PUBLIC_KEY.');
console.log('2. Su Cloudflare Pages → progetto → Settings → Environment variables, aggiungi:');
console.log('     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (come secret), VAPID_CONTACT_EMAIL, NOTIFY_SECRET');
console.log('3. Genera anche NOTIFY_SECRET: una stringa lunga a caso, es. con');
console.log('     node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
console.log('   e salvala anche come secret GitHub (Settings → Secrets and variables → Actions).\n');
