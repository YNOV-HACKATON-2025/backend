import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Room } from '../shared/interfaces';
import { RoomService } from './room.service';

@ApiTags('rooms')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiBody({
    description: 'Room data',
    type: Object,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Living Room' },
        type: { type: 'string', example: 'living' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Room successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createRoom(@Body() room: Room) {
    try {
      return await this.roomService.createRoom(room);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, description: 'Return the list of rooms' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllRooms() {
    try {
      return await this.roomService.getAllRooms();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Return the room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRoomById(@Param('id') id: string) {
    try {
      const room = await this.roomService.getRoomById(id);
      if (!room) {
        throw new HttpException(
          `Room with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      return room;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({
    description: 'Room data to update',
    type: Object,
    schema: {
      type: 'object',
    },
  })
  @ApiResponse({ status: 200, description: 'Room successfully updated' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateRoom(@Param('id') id: string, @Body() updates: Partial<Room>) {
    try {
      return await this.roomService.updateRoom(id, updates);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room successfully deleted' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteRoom(@Param('id') id: string) {
    try {
      const success = await this.roomService.deleteRoom(id);
      if (success) {
        return { message: `Room with ID ${id} successfully deleted` };
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
