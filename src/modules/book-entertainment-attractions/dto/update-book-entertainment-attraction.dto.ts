import { PartialType } from '@nestjs/mapped-types';
import { CreateBookEntertainmentAttractionDto } from './create-book-entertainment-attraction.dto';

export class UpdateBookEntertainmentAttractionDto extends PartialType(
  CreateBookEntertainmentAttractionDto,
) {}
