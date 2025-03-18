import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthentificationService } from './authentification.service';
import { CreateAuthentificationDto } from './dto/create-authentification.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthentificationDto } from './dto/update-authentification.dto';

@ApiTags('authentication')
@Controller('authentification')
export class AuthentificationController {
  constructor(
    private readonly authentificationService: AuthentificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiBody({ type: CreateAuthentificationDto })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createAuthentificationDto: CreateAuthentificationDto) {
    return await this.authentificationService.create(createAuthentificationDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Body() loginDto: LoginDto) {
    return await this.authentificationService.findOne(loginDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateAuthentificationDto })
  @ApiResponse({ status: 200, description: 'User information updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() updateAuthentificationDto: UpdateAuthentificationDto,
  ) {
    return this.authentificationService.update(+id, updateAuthentificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.authentificationService.remove(+id);
  }
}
