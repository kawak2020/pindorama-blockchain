import { createHash } from 'crypto';

export function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
