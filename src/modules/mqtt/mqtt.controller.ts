import { Controller, Get, Sse } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Type definition compatible with SSE
interface SseMessage {
  data: string;
  id?: string;
  type?: string;
}

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('simulations')
  getRunningSimulations() {
    const simulations = this.mqttService.getRunningSimulations();
    return { simulations, count: simulations.length };
  }

  @Sse('stream')
  streamEvents(): Observable<SseMessage> {
    return new Observable<SseMessage>((subscriber) => {
      const unsubscribe = this.mqttService.onMessage((data) => {
        try {
          // Transform data to JSON string
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
      map((message) => ({
        data: message.data,
        id: new Date().getTime().toString(),
        type: 'message',
      })),
    );
  }
}
