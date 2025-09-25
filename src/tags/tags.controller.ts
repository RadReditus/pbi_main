import { Body, Controller, Get, Post } from '@nestjs/common';
import { TagsService } from './tags.service';
@Controller('api/v1/tags')
export class TagsController {
  constructor(private svc: TagsService) {}
  @Post() create(@Body() dto:any) { return this.svc.create(dto); }
  @Get() list() { return this.svc.list(); }
}
