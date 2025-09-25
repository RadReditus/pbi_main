import * as crypto from 'crypto';
export const sha256 = (v:any) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
