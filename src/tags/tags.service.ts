import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';

type Decision = { action: 'ALLOW' | 'IGNORE' | 'MASK'; applied: string[]; masks?: Record<string, any> };

@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag, 'users') private repo: Repository<Tag>) {}

  create(dto: Partial<Tag>) { return this.repo.save(this.repo.create(dto)); }
  list() { return this.repo.find({ where: { enabled: true } }); }

  async decide(type: string, payload: any): Promise<Decision> {
    const tags = await this.repo.find({ where: { enabled: true } });
    let action: Decision['action'] = 'ALLOW';
    let masks: Decision['masks'] | undefined = undefined;
    const applied: string[] = [];

    for (const t of tags) {
      const okType = !t.conditions?.type || t.conditions.type === type;
      const okWhere = !t.conditions?.where ||
        (String(payload?.[t.conditions.where.field] ?? '').toLowerCase())
          .includes(String(t.conditions.where.contains ?? '').toLowerCase());
      if (okType && okWhere) {
        applied.push(t.name);
        if (t.action === 'IGNORE') action = 'IGNORE';
        if (t.action === 'MASK') { action = 'MASK'; masks = { ...(masks||{}), ...(t.masks||{}) }; }
      }
    }
    return { action, applied, masks };
  }
}
