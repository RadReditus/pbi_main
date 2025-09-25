import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import axios from 'axios';
import { OdataSource } from './odata-source.entity';
import { OdataRaw, OdataRawDocument } from './odata-raw.schema';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';

@Injectable()
export class OdataService {
  constructor(
    @InjectRepository(OdataSource, 'users') private srcRepo: Repository<OdataSource>,
    @InjectModel(OdataRaw.name) private rawModel: Model<OdataRawDocument>,
  ) {}

  async testFetch(dto: { baseUrl: string; username: string; password: string; endpoint?: string; top?: number }) {
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    const url = dto.endpoint
      ? `${dto.baseUrl.replace(/\/$/, '')}/${dto.endpoint}${dto.top ? `?$top=${dto.top}` : ''}`
      : dto.baseUrl;
    const { data } = await axios.get(url, {
      auth: { username: dto.username, password: dto.password },
      headers: { Accept: 'application/json' },
    });
    return data.value ?? data;
  }

  async fetchAndStore(sourceId: string, endpoint: string, mode: 'full' | 'delta', since?: string, top?: number) {
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    const s = await this.srcRepo.findOneByOrFail({ id: sourceId });
    const base = s.baseUrl.replace(/\/$/, '');
    const params: string[] = [];
    if (top) params.push(`$top=${top}`);
    if (mode === 'delta' && since) params.push(`$filter=ModifiedDateTime gt ${since}`);

    const url = `${base}/${endpoint}${params.length ? `?${params.join('&')}` : ''}`;

    const { data } = await axios.get(url, {
      auth: { username: s.username, password: s.password },
      headers: { Accept: 'application/json' },
    });

    await this.rawModel.create({ sourceId, endpoint, mode, since, payload: data });
    return data.value ?? data;
  }

  createSource(dto: Partial<OdataSource>) { return this.srcRepo.save(this.srcRepo.create(dto)); }
  listSources() { return this.srcRepo.find({ where: { enabled: true } }); }
}
