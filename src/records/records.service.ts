import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnecRecord } from './onec-record.entity';
import { OnecRecordTagged } from './onec-record-tagged.entity';
import { TagsService } from '../tags/tags.service';
import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';

const sha256 = (v: any) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

@Injectable()
export class RecordsService {
  private redis: RedisClientType;

  constructor(
    @InjectRepository(OnecRecord, 'filtered') private filteredRepo: Repository<OnecRecord>,
    @InjectRepository(OnecRecordTagged, 'tagged') private taggedRepo: Repository<OnecRecordTagged>,
    private readonly tags: TagsService,
  ) {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = +(process.env.REDIS_PORT || 6379);
    this.redis = createClient({ url: `redis://${host}:${port}` });
    this.redis.on('error', (e) => console.error('Redis error', e));
    this.redis.connect().catch(console.error);
  }

  /** Upsert в filtered с редис-дедупом по uid+type+hash(payload) */
  async upsertFiltered(items: Array<{ uid: string; type: string; payload: any }>) {
    const res: OnecRecord[] = [];
    for (const item of items) {
      const key = `ingested:${item.type}:${item.uid}:${sha256(item.payload)}`;
      const seen = await this.redis.get(key);
      if (seen) continue; // уже загружали этот вариант
      await this.redis.setEx(key, 60 * 60 * 24, '1'); // TTL 24h

      const existing = await this.filteredRepo.findOne({ where: { uid: item.uid, type: item.type } });
      if (existing) {
        existing.payload = item.payload;
        await this.filteredRepo.save(existing);
        res.push(existing);
      } else {
        const e = this.filteredRepo.create(item);
        await this.filteredRepo.save(e);
        res.push(e);
      }
    }
    return res;
  }

  async applyTagsAndMove(items: OnecRecord[]) {
    const out: OnecRecordTagged[] = [];
    for (const it of items) {
      const decision = await this.tags.decide(it.type, it.payload);
      if (decision.action === 'IGNORE') continue;

      const rec = this.taggedRepo.create({
        uid: it.uid,
        type: it.type,
        payload: decision.masks ? { ...it.payload, ...decision.masks } : it.payload,
        masks: decision.masks,
        appliedTags: decision.applied,
      });
      await this.taggedRepo.save(rec);
      out.push(rec);
    }
    return out;
  }

  findFiltered(q: { type?: string; uid?: string; take?: number; skip?: number }) {
    const where: any = {};
    if (q.type) where.type = q.type;
    if (q.uid) where.uid = q.uid;
    return this.filteredRepo.find({
      where,
      take: q.take ?? 100,
      skip: q.skip ?? 0,
      order: { updatedAt: 'DESC' },
    });
  }

  findTagged(q: { type?: string; uid?: string; take?: number; skip?: number }) {
    const where: any = {};
    if (q.type) where.type = q.type;
    if (q.uid) where.uid = q.uid;
    return this.taggedRepo.find({
      where,
      take: q.take ?? 100,
      skip: q.skip ?? 0,
      order: { createdAt: 'DESC' },
    });
  }
}
