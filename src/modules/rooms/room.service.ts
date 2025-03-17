import { Injectable, Logger } from '@nestjs/common';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../main';
import { MqttService } from '../mqtt/mqtt.service';

export interface Room {
  id?: string;
  name: string;
  topic: string;
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  
  constructor(private mqttService: MqttService) {}

  async createRoom(room: Room): Promise<Room> {
    try {
      // Add room to Firebase
      const roomRef = await addDoc(collection(db, 'rooms'), room);
      
      // Subscribe to room topic
      await this.mqttService.subscribeToTopic(room.topic);
      
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
        await this.mqttService.unsubscribeFromTopic(currentRoom.data().topic);
        await this.mqttService.subscribeToTopic(updates.topic);
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
      await this.mqttService.unsubscribeFromTopic(room.data().topic);
      
      // Delete the room
      await deleteDoc(roomRef);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete room: ${error.message}`);
      throw error;
    }
  }
}
