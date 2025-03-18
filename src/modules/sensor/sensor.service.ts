import { Injectable, Logger } from '@nestjs/common';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../main';
import { MqttService } from '../mqtt/mqtt.service';
import { Room, Sensor } from '../shared/interfaces';

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(private mqttService: MqttService) {}

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
      sensor.topic = `(${roomData.topic}/${sensor.name}/${sensor.type}`;
      sensor.topic = sensor.topic.toLocaleLowerCase();

      // Add sensor to Firebase
      const sensorRef = await addDoc(collection(db, 'sensors'), sensor);

      // Subscribe to sensor topic
      await this.mqttService.subscribeToTopic(sensor.topic);

      this.logger.log(
        `Created sensor: ${sensor.name} with topic: ${sensor.topic}`,
      );

      return {
        ...sensor,
        id: sensorRef.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create sensor: ${error.message}`);
      throw error;
    }
  }

  async getAllSensors(): Promise<Sensor[]> {
    try {
      const sensorsSnapshot = await getDocs(collection(db, 'sensors'));
      const sensors: Sensor[] = [];

      sensorsSnapshot.forEach((doc) => {
        sensors.push({
          id: doc.id,
          ...(doc.data() as Sensor),
        });
      });

      return sensors;
    } catch (error) {
      this.logger.error(`Failed to get sensors: ${error.message}`);
      throw error;
    }
  }

  async getSensorsByRoom(roomId: string): Promise<Sensor[]> {
    try {
      const sensorsQuery = query(
        collection(db, 'sensors'),
        where('roomId', '==', roomId),
      );
      const sensorsSnapshot = await getDocs(sensorsQuery);

      const sensors: Sensor[] = [];
      sensorsSnapshot.forEach((doc) => {
        sensors.push({
          id: doc.id,
          ...(doc.data() as Sensor),
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
        ...(sensorDoc.data() as Sensor),
      };
    } catch (error) {
      this.logger.error(`Failed to get sensor: ${error.message}`);
      throw error;
    }
  }

  async updateSensor(
    sensorId: string,
    updates: Partial<Sensor>,
  ): Promise<Sensor> {
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
        await this.mqttService.unsubscribeFromTopic(currentSensorData.topic);

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
        await this.mqttService.subscribeToTopic(updates.topic);
      }

      await updateDoc(sensorRef, updates);

      return {
        id: sensorId,
        ...currentSensorData,
        ...updates,
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
        await this.mqttService.unsubscribeFromTopic(sensor.data().topic);
      }

      // Delete the sensor
      await deleteDoc(sensorRef);

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete sensor: ${error.message}`);
      throw error;
    }
  }
}
