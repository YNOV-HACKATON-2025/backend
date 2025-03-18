import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { SensorModule } from '../sensor/sensor.module';

@Module({
  imports: [MqttModule, SensorModule],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomsModule {}
