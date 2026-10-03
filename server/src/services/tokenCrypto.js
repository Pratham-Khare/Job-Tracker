import crypto from 'crypto';
function key(){
  const raw=process.env.TOKEN_ENCRYPTION_KEY||process.env.JWT_SECRET;
  return crypto.createHash('sha256').update(String(raw)).digest();
}
export function encrypt(value){
  const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const enc=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`;
}
export function decrypt(payload){
  const [ivB64,tagB64,dataB64]=String(payload).split('.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(ivB64,'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64,'base64url')),decipher.final()]).toString('utf8');
}
