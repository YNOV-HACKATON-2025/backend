import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { RoomModule } from './modules/rooms/room.module';
import { SensorModule } from './modules/sensors/sensor.module';

@Module({
  imports: [
    MqttModule,
    RoomModule,
    SensorModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
