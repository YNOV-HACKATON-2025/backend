import { Controller, Get, Post, Body, Param, Put, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { SensorService, Sensor } from './sensor.service';

@Controller('sensors')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post()
  async createSensor(@Body() sensor: Sensor) {
    try {
      return await this.sensorService.createSensor(sensor);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
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
  async getSensorById(@Param('id') id: string) {
    try {
      const sensor = await this.sensorService.getSensorById(id);
      if (!sensor) {
        throw new HttpException(`Sensor with ID ${id} not found`, HttpStatus.NOT_FOUND);
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
  async updateSensor(@Param('id') id: string, @Body() updates: Partial<Sensor>) {
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

  @Post(':id/simulate/start')
  async startSimulation(@Param('id') id: string, @Body() options: { interval?: number }) {
    try {
      const success = await this.sensorService.startSensorSimulation(
        id, 
        options.interval || 5000
      );
      
      if (success) {
        return { message: `Simulation started for sensor ${id}` };
      } else {
        throw new HttpException(`Failed to start simulation for sensor ${id}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
