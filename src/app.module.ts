import { Module } from '@nestjs/common';
import { AuthentificationModule } from './modules/authentification/authentification.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { RoomModule } from './modules/room/room.module';
import { SensorModule } from './modules/sensor/sensor.module';
import { SpeechModule } from './modules/speech/speech.module';

@Module({
  imports: [
    MqttModule,
    RoomModule,
    SensorModule,
    AuthentificationModule,
    SpeechModule,
  ],
})
export class AppModule {}
