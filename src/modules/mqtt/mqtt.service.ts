import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { connect, MqttClient } from 'mqtt';
import { db } from '../../main';
import 'dotenv/config';

interface Sensor {
  id?: string;
  name: string;
  roomId: string;
  type: string;
  topic?: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private messageEventEmitter = new EventEmitter();
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isConnected = false;
  private sensorCheckInterval: NodeJS.Timeout; // Added to store periodic check interval

  constructor() {
    this.client = connect(process.env.MQTT_BROKER_URL, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      protocol: 'mqtts',
      rejectUnauthorized: false,
    });
  }

  async onModuleInit() {
    await this.setupClientEventHandlers();

    // Start the global topic listener for debugging
    this.startGlobalTopicListener();
    
    // Wait a moment for the connection to establish before starting simulations
    setTimeout(async () => {
      try {
        // Initial check for sensors
        await this.startSimulationsForSensorTypes(['temperature', 'humidity']);

        // Set up periodic check every 20 seconds
        this.sensorCheckInterval = setInterval(async () => {
          this.logger.log('Performing periodic check for new sensors...');
          await this.startSimulationsForSensorTypes([
            'temperature',
            'humidity',
          ]);
        }, 20000);
      } catch (error) {
        this.logger.error(
          `Failed to start sensor simulations on init: ${error.message}`,
        );
      }
    }, 2000);
  }

  onModuleDestroy() {
    // Clear the sensor check interval
    if (this.sensorCheckInterval) {
      clearInterval(this.sensorCheckInterval);
    }
    this.stopAllSimulations();
    this.client.end();
  }

  private setupClientEventHandlers() {
    return new Promise<void>((resolve) => {
      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to MQTT broker');
        resolve();
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT error: ${error.message}`);
      });

      this.client.on('message', (topic, message) => {
        const messageContent = message.toString();
        this.logger.debug(
          `Received message on topic ${topic}: ${messageContent}`,
        );
        this.messageEventEmitter.emit('message', {
          topic,
          message: messageContent,
        });
      });

      // Safety timeout to resolve promise even if connect event doesn't fire
      setTimeout(() => {
        if (!this.isConnected) {
          this.logger.warn('MQTT connection timeout - proceeding anyway');
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Subscribe to a topic to receive messages
   */
  private subscribe(topic: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected) {
        this.logger.warn(
          `Not connected to broker, delaying subscription to ${topic}`,
        );
        setTimeout(() => {
          this.subscribe(topic).then(resolve).catch(reject);
        }, 1000);
        return;
      }

      this.client.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(
            `Failed to subscribe to ${topic}: ${error.message}`,
          );
          reject(error);
        } else {
          this.logger.log(`Subscribed to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  private unsubscribe(topic: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected) {
        this.logger.warn(
          `Not connected to broker, cannot unsubscribe from ${topic}`,
        );
        resolve();
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          this.logger.error(
            `Failed to unsubscribe from ${topic}: ${error.message}`,
          );
          reject(error);
        } else {
          this.logger.log(`Unsubscribed from topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  private publish(topic: string, message: string | object) {
    const payload =
      typeof message === 'string' ? message : JSON.stringify(message);

    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected) {
        this.logger.warn(`Not connected to broker, cannot publish to ${topic}`);
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.debug(`Published to ${topic}: ${payload}`);
          resolve();
        }
      });
    });
  }
  
  /**
   * Start global topic listener for debugging purposes
   * This subscribes to all topics and logs messages with appropriate emojis
   */
  startGlobalTopicListener() {
    this.logger.log('🔍 Starting global MQTT topic listener for debugging');
    
    return this.subscribe('#')
      .then(() => {
        this.messageEventEmitter.on('message', ({ topic, message }) => {
          try {
            // Parse message if it's JSON
            let data;
            try {
              data = JSON.parse(message);
            } catch {
              data = message;
            }
            
            // Determine the type of sensor/device from topic or message content
            if (topic.includes('light') || (data && data.type === 'light')) {
              this.logger.debug(`💡 LIGHT [${topic}]: ${message}`);
            } 
            else if (topic.includes('temperature') || (data && 'temperature' in data) || (data && data.type === 'temperature')) {
              this.logger.debug(`🌡️ TEMPERATURE [${topic}]: ${message}`);
            }
            else if (topic.includes('humidity') || (data && 'humidity' in data) || (data && data.type === 'humidity')) {
              this.logger.debug(`💧 HUMIDITY [${topic}]: ${message}`);
            }
            else if (topic.includes('radiator') || (data && data.type === 'radiator')) {
              this.logger.debug(`🔥 RADIATOR [${topic}]: ${message}`);
            }
            else {
              this.logger.debug(`📊 OTHER [${topic}]: ${message}`);
            }
          } catch (error) {
            this.logger.error(`Error processing MQTT message: ${error.message}`);
          }
        });
        
        this.logger.log('🎯 Global MQTT topic listener active');
      })
      .catch(error => {
        this.logger.error(`Failed to start global topic listener: ${error.message}`);
      });
  }

  /**
   * Start simulation for specified sensor types
   */
  private async startSimulationsForSensorTypes(
    types: string[],
    interval: number = 15000,
  ) {
    try {
      // Get all sensors of the specified types
      const sensors: Sensor[] = [];

      for (const type of types) {
        try {
          const typeSensors = await this.getSensorsByType(type);
          sensors.push(...typeSensors);
        } catch (error) {
          this.logger.error(
            `Error getting sensors of type ${type}: ${error.message}`,
          );
        }
      }

      if (sensors.length === 0) {
        this.logger.warn(`No sensors found of types: ${types.join(', ')}`);
        return;
      }

      // Start simulation for each sensor
      let successCount = 0;
      for (const sensor of sensors) {
        try {
          if (this.startSensorSimulation(sensor, interval)) {
            successCount++;
            this.logger.log(
              `Started simulation for ${sensor.type} sensor: ${sensor.name}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to start simulation for sensor ${sensor.name}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Started simulations for ${successCount} out of ${sensors.length} sensors`,
      );
    } catch (error) {
      this.logger.error(`Failed to start sensor simulations: ${error.message}`);
    }
  }

  /**
   * Get sensors by type
   */
  private async getSensorsByType(type: string): Promise<Sensor[]> {
    try {
      const sensorsQuery = query(
        collection(db, 'sensors'),
        where('type', '==', type),
      );
      const sensorsSnapshot = await getDocs(sensorsQuery);

      const sensors: Sensor[] = [];
      sensorsSnapshot.forEach((doc) => {
        const sensorData = doc.data() as Sensor;
        sensors.push({
          id: doc.id,
          ...sensorData,
        });
      });

      return sensors;
    } catch (error) {
      this.logger.error(
        `Failed to get sensors of type ${type}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Start simulating a sensor with data matching its type
   */
  private startSensorSimulation(sensor: Sensor, interval: number = 15000) {
    if (!sensor.id || !sensor.topic) {
      this.logger.error(
        `Cannot start simulation: Sensor missing ID or topic: ${JSON.stringify(sensor)}`,
      );
      return false;
    }

    // Stop any existing simulation for this sensor
    this.stopDeviceSimulation(sensor.id);

    // Generate appropriate simulation data based on sensor type
    const simulationFunction = () => {
      const baseData = {
        sensorId: sensor.id,
        sensorName: sensor.name,
        timestamp: new Date().toISOString(),
      };

      switch (sensor.type.toLowerCase()) {
        case 'temperature':
          return {
            ...baseData,
            value: +(18 + Math.random() * 8).toFixed(1),
            unit: '°C',
          };
        case 'humidity':
          return {
            ...baseData,
            value: +(40 + Math.random() * 40).toFixed(1),
            unit: '%',
          };
        default:
          return {
            ...baseData,
            value: +(Math.random() * 100).toFixed(1),
          };
      }
    };

    // Create interval that publishes data regularly
    const simulationInterval = setInterval(async () => {
      try {
        const data = simulationFunction();
        await this.publish(sensor.topic, data);
      } catch (error) {
        this.logger.error(
          `Error in simulation for sensor ${sensor.id}: ${error.message}`,
        );
      }
    }, interval);

    this.simulationIntervals.set(sensor.id, simulationInterval);

    return true;
  }

  /**
   * Stop simulating a specific device
   */
  private stopDeviceSimulation(deviceId: string) {
    const interval = this.simulationIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(deviceId);
      this.logger.debug(`Stopped simulation for device ${deviceId}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all device simulations
   */
  private stopAllSimulations() {
    for (const [deviceId, interval] of this.simulationIntervals.entries()) {
      console.log(
        '🚀 ~ MqttService ~ stopAllSimulations ~ deviceId:',
        deviceId,
      );
      clearInterval(interval);
    }
    this.simulationIntervals.clear();
    this.logger.log(`Stopped all simulations`);
  }

  /**
   * Event listener for MQTT messages
   */
  onMessage(callback: (data: { topic: string; message: string }) => void) {
    this.messageEventEmitter.on('message', callback);
    return () => {
      this.messageEventEmitter.off('message', callback);
    };
  }

  /**
   * Get list of running simulations
   */
  getRunningSimulations() {
    return Array.from(this.simulationIntervals.keys());
  }

  /**
   * Public API methods for other services to use
   */

  // Public method to subscribe to topics
  async subscribeToTopic(topic: string): Promise<void> {
    return this.subscribe(topic);
  }

  // Public method to unsubscribe from topics
  async unsubscribeFromTopic(topic: string): Promise<void> {
    return this.unsubscribe(topic);
  }

  // Public method to publish messages
  async publishToTopic(topic: string, message: string | object): Promise<void> {
    return this.publish(topic, message);
  }

  // Public method to start device simulation
  startDeviceSimulation(
    deviceId: string,
    topic: string,
    interval: number = 5000,
    simulationFn?: () => any,
  ): boolean {
    if (!topic) {
      this.logger.error(
        `Cannot start simulation: Missing topic for device ${deviceId}`,
      );
      return false;
    }

    // Stop any existing simulation for this device
    this.stopDeviceSimulation(deviceId);

    // Default simulation function generates random temperature and humidity
    const defaultSimulationFn = () => ({
      deviceId,
      timestamp: new Date().toISOString(),
      temperature: +(20 + Math.random() * 10).toFixed(1),
      humidity: +(40 + Math.random() * 40).toFixed(1),
      battery: +(50 + Math.random() * 50).toFixed(0),
    });

    const simulationFunction = simulationFn || defaultSimulationFn;

    // Create interval that publishes data regularly
    const simulationInterval = setInterval(async () => {
      try {
        const data = simulationFunction();
        await this.publish(topic, data);
      } catch (error) {
        this.logger.error(
          `Error in simulation for device ${deviceId}: ${error.message}`,
        );
      }
    }, interval);

    this.simulationIntervals.set(deviceId, simulationInterval);
    this.logger.log(
      `Started simulation for device ${deviceId} on topic ${topic}`,
    );

    return true;
  }
}
