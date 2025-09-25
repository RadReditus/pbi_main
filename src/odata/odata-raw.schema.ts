import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true, collection: 'odata_raw' })
export class OdataRaw {
  @Prop() sourceId: string;
  @Prop() endpoint: string;
  @Prop() mode: 'full'|'delta';
  @Prop() since?: string;
  @Prop({ type: Object }) payload: any;
}
export type OdataRawDocument = HydratedDocument<OdataRaw>;
export const OdataRawSchema = SchemaFactory.createForClass(OdataRaw);
