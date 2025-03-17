import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreateMqttDto } from './dto/create-mqtt.dto';
import { UpdateMqttDto } from './dto/update-mqtt.dto';
import { connect, MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../main';

// Define interfaces for room and sensor
interface Room {
  id?: string;
  name: string;
  topic: string;
}

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

  constructor() {
    this.client = connect("mqtt://46eccffd0ebc4eb8b5a2ef13663c1c28.s1.eu.hivemq.cloud:8883", {
      username: "Ynov-2025",
      password: "Ynov-2025",
      protocol: 'mqtts',
      rejectUnauthorized: false
    });
  }

  onModuleInit() {
    this.setupClientEventHandlers();
  }

  onModuleDestroy() {
    this.stopAllSimulations();
    this.client.end();
  }

  private setupClientEventHandlers() {
    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });

    this.client.on('message', (topic, message) => {
      const messageContent = message.toString();
      this.logger.debug(`Received message on topic ${topic}: ${messageContent}`);
      this.messageEventEmitter.emit('message', { topic, message: messageContent });
    });
  }

  /**
   * Subscribe to a topic to receive messages
   */
  subscribe(topic: string) {
    return new Promise<void>((resolve, reject) => {
      this.client.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Failed to subscribe to ${topic}: ${error.message}`);
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
  unsubscribe(topic: string) {
    return new Promise<void>((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  publish(topic: string, message: string | object) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    return new Promise<void>((resolve, reject) => {
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
   * Start simulating an IoT device that sends data at a regular interval
   */
  startDeviceSimulation(deviceId: string, topic: string, interval: number = 5000, simulationFn?: () => any) {
    // Stop any existing simulation for this device
    this.stopDeviceSimulation(deviceId);
    
    // Default simulation function generates random temperature and humidity
    const defaultSimulationFn = () => ({
      deviceId,
      timestamp: new Date().toISOString(),
      temperature: +(20 + Math.random() * 10).toFixed(1),
      humidity: +(40 + Math.random() * 40).toFixed(1),
      battery: +(50 + Math.random() * 50).toFixed(0)
    });
    
    const simulationFunction = simulationFn || defaultSimulationFn;
    
    // Create interval that publishes data regularly
    const simulationInterval = setInterval(async () => {
      try {
        const data = simulationFunction();
        await this.publish(topic, data);
      } catch (error) {
        this.logger.error(`Error in simulation for device ${deviceId}: ${error.message}`);
      }
    }, interval);
    
    this.simulationIntervals.set(deviceId, simulationInterval);
    this.logger.log(`Started simulation for device ${deviceId} on topic ${topic}`);
    
    return true;
  }

  /**
   * Stop simulating a specific device
   */
  stopDeviceSimulation(deviceId: string) {
    const interval = this.simulationIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(deviceId);
      this.logger.log(`Stopped simulation for device ${deviceId}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all device simulations
   */
  stopAllSimulations() {
    for (const [deviceId, interval] of this.simulationIntervals.entries()) {
      clearInterval(interval);
      this.logger.log(`Stopped simulation for device ${deviceId}`);
    }
    this.simulationIntervals.clear();
  }

  /**
   * Get list of currently running simulations
   */
  getRunningSimulations() {
    return Array.from(this.simulationIntervals.keys());
  }

  /**
   * Listen for real-time messages from the broker
   * Returns an unsubscribe function
   */
  onMessage(callback: (data: { topic: string, message: string }) => void) {
    this.messageEventEmitter.on('message', callback);
    return () => {
      this.messageEventEmitter.off('message', callback);
    };
  }

  /**
   * Room management functions
   */
  async createRoom(room: Room): Promise<Room> {
    try {
      // Add room to Firebase
      const roomRef = await addDoc(collection(db, 'rooms'), room);
      
      // Subscribe to room topic
      await this.subscribe(room.topic);
      
      this.logger.log(`Created room: ${room.name} with topic: ${room.topic}`);
      
      return {
        ...room,
        id: roomRef.id
      };
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`);
      throw error;
    }
  }

  async getAllRooms(): Promise<Room[]> {
    try {
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const rooms: Room[] = [];
      
      roomsSnapshot.forEach(doc => {
        rooms.push({
          id: doc.id,
          ...doc.data() as Room
        });
      });
      
      return rooms;
    } catch (error) {
      this.logger.error(`Failed to get rooms: ${error.message}`);
      throw error;
    }
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      
      if (!roomDoc.exists()) {
        return null;
      }
      
      return {
        id: roomDoc.id,
        ...roomDoc.data() as Room
      };
    } catch (error) {
      this.logger.error(`Failed to get room: ${error.message}`);
      throw error;
    }
  }

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const currentRoom = await getDoc(roomRef);
      
      if (!currentRoom.exists()) {
        throw new Error(`Room with ID ${roomId} not found`);
      }
      
      // If topic is being updated, unsubscribe from old topic and subscribe to new one
      if (updates.topic && updates.topic !== currentRoom.data().topic) {
        await this.unsubscribe(currentRoom.data().topic);
        await this.subscribe(updates.topic);
      }
      
      await updateDoc(roomRef, updates);
      
      return {
        id: roomId,
        ...currentRoom.data() as Room,
        ...updates
      };
    } catch (error) {
      this.logger.error(`Failed to update room: ${error.message}`);
      throw error;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const room = await getDoc(roomRef);
      
      if (!room.exists()) {
        throw new Error(`Room with ID ${roomId} not found`);
      }
      
      // Unsubscribe from room topic
      await this.unsubscribe(room.data().topic);
      
      // Delete all sensors in this room
      const sensorsQuery = query(collection(db, 'sensors'), where('roomId', '==', roomId));
      const sensorsSnapshot = await getDocs(sensorsQuery);
      
      const deleteSensorPromises = [];
      sensorsSnapshot.forEach(sensorDoc => {
        deleteSensorPromises.push(this.deleteSensor(sensorDoc.id));
      });
      
      await Promise.all(deleteSensorPromises);
      
      // Delete the room
      await deleteDoc(roomRef);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sensor management functions
   */
  async createSensor(sensor: Sensor): Promise<Sensor> {
    try {
      // Check if room exists
      const roomRef = doc(db, 'rooms', sensor.roomId);
      const room = await getDoc(roomRef);
      
      if (!room.exists()) {
        throw new Error(`Room with ID ${sensor.roomId} not found`);
      }
      
      // Generate sensor topic: room/sensor/type
      const roomData = room.data() as Room;
      sensor.topic = `${roomData.topic}/${sensor.name}/${sensor.type}`;
      
      // Add sensor to Firebase
      const sensorRef = await addDoc(collection(db, 'sensors'), sensor);
      
      // Subscribe to sensor topic
      await this.subscribe(sensor.topic);
      
      this.logger.log(`Created sensor: ${sensor.name} with topic: ${sensor.topic}`);
      
      return {
        ...sensor,
        id: sensorRef.id
      };
    } catch (error) {
      this.logger.error(`Failed to create sensor: ${error.message}`);
      throw error;
    }
  }

  async getSensorsByRoom(roomId: string): Promise<Sensor[]> {
    try {
      const sensorsQuery = query(collection(db, 'sensors'), where('roomId', '==', roomId));
      const sensorsSnapshot = await getDocs(sensorsQuery);
      
      const sensors: Sensor[] = [];
      sensorsSnapshot.forEach(doc => {
        sensors.push({
          id: doc.id,
          ...doc.data() as Sensor
        });
      });
      
      return sensors;
    } catch (error) {
      this.logger.error(`Failed to get sensors for room: ${error.message}`);
      throw error;
    }
  }

  async getSensorById(sensorId: string): Promise<Sensor | null> {
    try {
      const sensorDoc = await getDoc(doc(db, 'sensors', sensorId));
      
      if (!sensorDoc.exists()) {
        return null;
      }
      
      return {
        id: sensorDoc.id,
        ...sensorDoc.data() as Sensor
      };
    } catch (error) {
      this.logger.error(`Failed to get sensor: ${error.message}`);
      throw error;
    }
  }

  async updateSensor(sensorId: string, updates: Partial<Sensor>): Promise<Sensor> {
    try {
      const sensorRef = doc(db, 'sensors', sensorId);
      const currentSensor = await getDoc(sensorRef);
      
      if (!currentSensor.exists()) {
        throw new Error(`Sensor with ID ${sensorId} not found`);
      }
      
      const currentSensorData = currentSensor.data() as Sensor;
      
      // If we're changing room, name, or type, recalculate the topic
      if (updates.roomId || updates.name || updates.type) {
        // Unsubscribe from old topic
        await this.unsubscribe(currentSensorData.topic);
        
        const roomId = updates.roomId || currentSensorData.roomId;
        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        
        if (!roomDoc.exists()) {
          throw new Error(`Room with ID ${roomId} not found`);
        }
        
        const roomData = roomDoc.data() as Room;
        const sensorName = updates.name || currentSensorData.name;
        const sensorType = updates.type || currentSensorData.type;
        
        updates.topic = `${roomData.topic}/${sensorName}/${sensorType}`;
        
        // Subscribe to new topic
        await this.subscribe(updates.topic);
      }
      
      await updateDoc(sensorRef, updates);
      
      return {
        id: sensorId,
        ...currentSensorData,
        ...updates
      };
    } catch (error) {
      this.logger.error(`Failed to update sensor: ${error.message}`);
      throw error;
    }
  }

  async deleteSensor(sensorId: string): Promise<boolean> {
    try {
      const sensorRef = doc(db, 'sensors', sensorId);
      const sensor = await getDoc(sensorRef);
      
      if (!sensor.exists()) {
        throw new Error(`Sensor with ID ${sensorId} not found`);
      }
      
      // Unsubscribe from sensor topic
      if (sensor.data().topic) {
        await this.unsubscribe(sensor.data().topic);
      }
      
      // Delete the sensor
      await deleteDoc(sensorRef);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete sensor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start simulating a sensor with specific data
   */
  async startSensorSimulation(sensorId: string, interval: number = 5000, simulationFn?: () => any): Promise<boolean> {
    try {
      const sensor = await this.getSensorById(sensorId);
      
      if (!sensor) {
        throw new Error(`Sensor with ID ${sensorId} not found`);
      }
      
      // Default simulation function based on sensor type
      const defaultSimulationFn = () => {
        const baseData = {
          sensorId,
          timestamp: new Date().toISOString()
        };
        
        switch (sensor.type.toLowerCase()) {
          case 'temperature':
            return {
              ...baseData,
              value: +(18 + Math.random() * 8).toFixed(1),
              unit: '°C'
            };
          case 'humidity':
            return {
              ...baseData,
              value: +(40 + Math.random() * 40).toFixed(1),
              unit: '%'
            };
          case 'motion':
            return {
              ...baseData,
              value: Math.random() > 0.7, // 30% chance of motion detected
              unit: 'boolean'
            };
          case 'light':
            return {
              ...baseData,
              value: +(100 + Math.random() * 900).toFixed(0),
              unit: 'lux'
            };
          default:
            return {
              ...baseData,
              value: +(Math.random() * 100).toFixed(1)
            };
        }
      };
      
      return this.startDeviceSimulation(
        sensorId,
        sensor.topic,
        interval,
        simulationFn || defaultSimulationFn
      );
    } catch (error) {
      this.logger.error(`Failed to start sensor simulation: ${error.message}`);
      throw error;
    }
  }

  // Keep the original CRUD methods in case they're needed
  create(createMqttDto: CreateMqttDto) {
    return 'This action adds a new mqtt';
  }

  findAll() {
    return `This action returns all mqtt`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mqtt`;
  }

  update(id: number, updateMqttDto: UpdateMqttDto) {
    return `This action updates a #${id} mqtt`;
  }

  remove(id: number) {
    return `This action removes a #${id} mqtt`;
  }
}
