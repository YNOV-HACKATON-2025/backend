import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RoomService, Room } from './room.service';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@Body() room: Room) {
    try {
      return await this.roomService.createRoom(room);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async getAllRooms() {
    try {
      return await this.roomService.getAllRooms();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
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
