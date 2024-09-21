import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class DocumentUpdateInput {
  @ApiProperty({
    required: true,
    type: Object,
  })
  @IsObject()
  document!: any;

  @ApiProperty({
    required: false, // Marking as optional
    type: Object,
  })
  @IsObject()
  user?: any; // Optional user property
}
