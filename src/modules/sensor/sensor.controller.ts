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
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Sensor } from '../shared/interfaces';
import { SensorService } from './sensor.service';

@ApiTags('sensors')
@Controller('sensors')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sensor' })
  @ApiBody({
    description: 'Sensor data',
    type: Object,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Temperature Sensor' },
        type: { type: 'string', example: 'temperature' },
        roomId: { type: 'string', example: '123456789' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sensor successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSensor(@Body() sensor: Sensor) {
    try {
      return await this.sensorService.createSensor(sensor);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all sensors or filter by room' })
  @ApiQuery({
    name: 'roomId',
    required: false,
    description: 'Room ID to filter sensors',
  })
  @ApiResponse({ status: 200, description: 'Return the list of sensors' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllSensors(@Query('roomId') roomId?: string) {
    try {
      if (roomId) {
        return await this.sensorService.getSensorsByRoom(roomId);
      }
      return await this.sensorService.getAllSensors();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sensor by ID' })
  @ApiParam({ name: 'id', description: 'Sensor ID' })
  @ApiResponse({ status: 200, description: 'Return the sensor' })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSensorById(@Param('id') id: string) {
    try {
      const sensor = await this.sensorService.getSensorById(id);
      if (!sensor) {
        throw new HttpException(
          `Sensor with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      return sensor;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sensor' })
  @ApiParam({ name: 'id', description: 'Sensor ID' })
  @ApiBody({
    description: 'Sensor data to update',
    type: Object,
    schema: {
      type: 'object',
    },
  })
  @ApiResponse({ status: 200, description: 'Sensor successfully updated' })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateSensor(
    @Param('id') id: string,
    @Body() updates: Partial<Sensor>,
  ) {
    try {
      return await this.sensorService.updateSensor(id, updates);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sensor' })
  @ApiParam({ name: 'id', description: 'Sensor ID' })
  @ApiResponse({ status: 200, description: 'Sensor successfully deleted' })
  @ApiResponse({ status: 404, description: 'Sensor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteSensor(@Param('id') id: string) {
    try {
      const success = await this.sensorService.deleteSensor(id);
      if (success) {
        return { message: `Sensor with ID ${id} successfully deleted` };
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
