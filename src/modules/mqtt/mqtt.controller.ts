import { Body, Controller, Delete, Get, Param, Post, Sse } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { SimulateDeviceDto } from './dto/simulate-device.dto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Définition d'un type compatible avec SSE
interface SseMessage {
  data: string; // Les données doivent être sous forme de chaîne pour SSE
  id?: string;
  type?: string;
}

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Post('subscribe/:topic')
  async subscribeToTopic(@Param('topic') topic: string) {
    await this.mqttService.subscribe(topic);
    return { success: true, topic };
  }

  @Delete('subscribe/:topic')
  async unsubscribeFromTopic(@Param('topic') topic: string) {
    await this.mqttService.unsubscribe(topic);
    return { success: true, topic };
  }

  @Post('publish')
  async publishMessage(@Body() body: { topic: string; message: any }) {
    await this.mqttService.publish(body.topic, body.message);
    return { success: true };
  }

  @Post('simulate')
  startSimulation(@Body() simulateDeviceDto: SimulateDeviceDto) {
    const { deviceId, topic, interval } = simulateDeviceDto;
    this.mqttService.startDeviceSimulation(deviceId, topic, interval);
    return { success: true, deviceId, topic };
  }

  @Delete('simulate/:deviceId')
  stopSimulation(@Param('deviceId') deviceId: string) {
    const result = this.mqttService.stopDeviceSimulation(deviceId);
    return { success: result, deviceId };
  }

  @Delete('simulate')
  stopAllSimulations() {
    this.mqttService.stopAllSimulations();
    return { success: true };
  }

  @Get('simulate')
  getRunningSimulations() {
    const simulations = this.mqttService.getRunningSimulations();
    return { simulations };
  }

  @Sse('stream')
  streamEvents(): Observable<SseMessage> {
    return new Observable<SseMessage>(subscriber => {
      const unsubscribe = this.mqttService.onMessage((data) => {
        try {
          // Transformer data en chaîne JSON
          const eventData = JSON.stringify(data);
          subscriber.next({ data: eventData });
        } catch (error) {
          console.error('Error serializing SSE data:', error);
        }
      });
      
      return () => {
        unsubscribe();
      };
    }).pipe(
      map(message => ({
        data: message.data,
        id: new Date().getTime().toString(),
        type: 'message'
      }))
    );
  }
}
