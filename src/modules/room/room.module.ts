import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { SensorModule } from '../sensor/sensor.module';

@Module({
  imports: [MqttModule, SensorModule],
  providers: [RoomService],
  controllers: [RoomController],
  exports: [RoomService],
})
export class RoomModule {}
