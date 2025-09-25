import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnecRecordTagged } from '../records/onec-record-tagged.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ExportService {
  constructor(@InjectRepository(OnecRecordTagged, 'tagged') private repo: Repository<OnecRecordTagged>) {}

  async asJson(q: any) {
    const data = await this.repo.find({ take: q.take ?? 1000, skip: q.skip ?? 0 });
    return { data, generatedAt: new Date().toISOString() };
  }

  async asSql(q: any) {
    const now = new Date();
    const head = `-- ${now.toLocaleTimeString('ru-RU')} ${now.toLocaleDateString('ru-RU')} | ok\n`;
    const rows = await this.repo.find({ take: q.take ?? 1000, skip: q.skip ?? 0 });

    const escIdent = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, '_');
    const esc = (s: string) => s.replace(/'/g, "''");

    const body = rows
      .map((r) => {
        const table = `pbi_${escIdent(r.type)}`;
        const payload = esc(JSON.stringify(r.payload));
        return [
          `CREATE TABLE IF NOT EXISTS "${table}" (`,
          `  id UUID DEFAULT gen_random_uuid(),`,
          `  uid TEXT NOT NULL,`,
          `  payload JSONB NOT NULL,`,
          `  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
          `);`,
          `INSERT INTO "${table}" (uid, payload, created_at) VALUES ('${esc(r.uid)}', '${payload}', NOW());`,
        ].join('\n');
      })
      .join('\n');

    return head + body + '\n';
  }
}
