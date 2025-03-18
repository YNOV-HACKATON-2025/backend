import { Controller, Get, Sse } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MqttService } from './mqtt.service';

// Type definition compatible with SSE
interface SseMessage {
  data: string;
  id?: string;
  type?: string;
}

@ApiTags('mqtt')
@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('simulations')
  @ApiOperation({ summary: 'Get all running simulations' })
  @ApiResponse({
    status: 200,
    description: 'Returns running simulations',
    schema: {
      type: 'object',
      properties: {
        simulations: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
        count: { type: 'number' },
      },
    },
  })
  getRunningSimulations() {
    const simulations = this.mqttService.getRunningSimulations();
    return { simulations, count: simulations.length };
  }

  @Sse('stream')
  @ApiOperation({
    summary: 'Stream MQTT events in real-time',
    description: 'Returns a Server-Sent Events stream with MQTT messages',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of MQTT events',
  })
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
