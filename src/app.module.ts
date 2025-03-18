import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { RoomModule } from './modules/room/room.module';
import { SensorModule } from './modules/sensor/sensor.module';
import { AuthentificationModule } from './modules/authentification/authentification.module';
import { SpeechModule } from './modules/speech/speech.module';

@Module({
  imports: [
    MqttModule,
    RoomModule,
    SensorModule,
    AuthentificationModule,
    SpeechModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
