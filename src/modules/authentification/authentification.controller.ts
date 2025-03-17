import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthentificationService } from './authentification.service';
import { CreateAuthentificationDto } from './dto/create-authentification.dto';
import { UpdateAuthentificationDto } from './dto/update-authentification.dto';
import { LoginDto } from './dto/login.dto';

@Controller('authentification')
export class AuthentificationController {
  constructor(
    private readonly authentificationService: AuthentificationService,
  ) {}

  @Post()
  async create(@Body() createAuthentificationDto: CreateAuthentificationDto) {
    return await this.authentificationService.create(createAuthentificationDto);
  }

  @Get()
  async findOne(@Body() loginDto: LoginDto) {
    return await this.authentificationService.findOne(loginDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuthentificationDto: UpdateAuthentificationDto,
  ) {
    return this.authentificationService.update(+id, updateAuthentificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authentificationService.remove(+id);
  }
}
