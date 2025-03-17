import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthentificationDto } from './create-authentification.dto';

export class UpdateAuthentificationDto extends PartialType(
  CreateAuthentificationDto,
) {}
