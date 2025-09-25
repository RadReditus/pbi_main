import { TagsService } from '../../src/tags/tags.service';

test('decide applies IGNORE', async () => {
  const svc = new TagsService({} as any);
  jest.spyOn(svc as any, 'repo', 'get').mockReturnValue({
    find: () => Promise.resolve([
      { name:'ignore_milk', action:'IGNORE', conditions:{ type:'Поступление', where:{ field:'Номенклатура', contains:'молоко'} }, enabled:true }
    ])
  });
  const d = await svc.decide('Поступление', { Номенклатура: 'молоко 2.5%' });
  expect(d.action).toBe('IGNORE');
});
