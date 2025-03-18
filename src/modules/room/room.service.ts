import { Injectable, Logger } from '@nestjs/common';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../main';
import { MqttService } from '../mqtt/mqtt.service';
import { SensorService } from '../sensor/sensor.service';
import { CommandResult, Room, Sensor } from '../shared/interfaces';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private mqttService: MqttService,
    private sensorService: SensorService,
  ) {}

  // Command keywords for parsing
  private actionKeywords = {
    on: ['allume', 'active', 'démarre', 'allumer', 'activer', 'démarrer', 'on'],
    off: [
      'etang',
      'ethang',
      'etant',
      'éteint',
      'eteindre',
      'éteins',
      'désactive',
      'arrête',
      'éteindre',
      'désactiver',
      'arrêter',
      'off',
    ],
    set: [
      'règle',
      'mets',
      'ajuste',
      'configure',
      'régler',
      'mettre',
      'ajuster',
      'set',
    ],
    get: [
      'donne',
      'quel',
      'quelle',
      'affiche',
      'montre',
      'status',
      'statut',
      'état',
    ],
  };

  private deviceTypes = {
    light: ['lumière', 'lampe', 'éclairage', 'led', 'ampoule'],
    radiator: ['radiateur', 'chauffage', 'climatisation', 'thermostat'],
    blind: ['store', 'volet', 'rideau', 'persienne'],
    fan: ['ventilateur', 'ventilo'],
    outlet: ['prise'],
    camera: ['caméra', 'camera'],
    speaker: ['enceinte', 'haut-parleur', 'musique', 'son'],
  };

  /**
   * Process a voice command and execute the corresponding action
   * @param text The transcribed voice command
   * @returns Object with result of command processing
   */
  async processVoiceCommand(text: string): Promise<CommandResult> {
    try {
      this.logger.log(`Processing voice command: "${text}"`);
      const normalizedText = text.toLowerCase().trim();

      // Initial result - will be updated as we process the command
      const result: CommandResult = {
        processed: false,
        result: 'Command not recognized',
      };

      // 1. Find which room the command refers to
      const rooms = await this.getAllRooms();
      const targetRoom = this.findTargetRoom(normalizedText, rooms);

      if (!targetRoom) {
        this.logger.warn(`No matching room found in command: "${text}"`);
        return {
          ...result,
          result: 'No matching room found in command',
        };
      }

      result.room = targetRoom.name;

      // 2. Determine the action (on, off, set, get)
      const action = this.determineAction(normalizedText);
      if (!action) {
        this.logger.warn(`No action found in command: "${text}"`);
        return {
          ...result,
          result: `No action found for room ${targetRoom.name}`,
        };
      }

      result.action = action;

      // 3. Identify the device type
      const deviceType = this.identifyDeviceType(normalizedText);
      if (!deviceType) {
        this.logger.warn(`No device type found in command: "${text}"`);
        return {
          ...result,
          result: `No device type found for ${action} action in ${targetRoom.name}`,
        };
      }

      result.device = deviceType;

      // 4. Get relevant sensors for this room and device type
      const sensors = await this.sensorService.getSensorsByRoom(targetRoom.id);
      const matchingSensors = sensors.filter((s) =>
        this.isSensorMatchingDeviceType(s, deviceType),
      );

      if (matchingSensors.length === 0) {
        this.logger.warn(
          `No matching ${deviceType} sensors found in ${targetRoom.name}`,
        );
        return {
          ...result,
          result: `No ${deviceType} found in ${targetRoom.name}`,
        };
      }

      // 5. Extract value if needed (for set commands)
      let value: any = null;
      if (action === 'set') {
        value = this.extractValueFromCommand(normalizedText, deviceType);
        result.value = value;
      }

      // 6. Execute the command via MQTT for each matching sensor
      for (const sensor of matchingSensors) {
        await this.executeSensorCommand(sensor, action, value);
      }

      // 7. Return success result
      result.processed = true;
      result.result = this.generateSuccessMessage(
        action,
        deviceType,
        targetRoom.name,
        value,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error processing voice command: ${error.message}`);
      return {
        processed: false,
        result: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find which room is mentioned in the command
   */
  private findTargetRoom(text: string, rooms: Room[]): Room | null {
    for (const room of rooms) {
      const roomName = room.name.toLowerCase();
      if (text.includes(roomName)) {
        return room;
      }

      // Check for common variations (like "salon" vs "living room")
      if (roomName === 'salon' && text.includes('living')) return room;
      if (roomName === 'cuisine' && text.includes('kitchen')) return room;
      if (roomName === 'chambre' && text.includes('bedroom')) return room;
      if (
        roomName === 'salle de bain' &&
        (text.includes('bathroom') || text.includes('bain'))
      )
        return room;
    }
    return null;
  }

  /**
   * Determine what action the command is trying to perform
   */
  private determineAction(text: string): string | null {
    this.logger.debug(`Determining action from text: "${text}"`);

    // First check for explicit off commands - give them higher priority
    for (const keyword of this.actionKeywords.off) {
      if (text.includes(keyword)) {
        this.logger.debug(`Found 'off' keyword: ${keyword}`);
        return 'off';
      }
    }

    // Then check other actions
    for (const [action, keywords] of Object.entries(this.actionKeywords)) {
      if (action === 'off') continue; // Already checked above

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          this.logger.debug(`Found '${action}' keyword: ${keyword}`);
          return action;
        }
      }
    }

    this.logger.debug('No action keywords found in text');
    return null;
  }

  /**
   * Identify which device type the command refers to
   */
  private identifyDeviceType(text: string): string | null {
    for (const [type, keywords] of Object.entries(this.deviceTypes)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return type;
        }
      }
    }
    return null;
  }

  /**
   * Check if a sensor matches the requested device type
   */
  private isSensorMatchingDeviceType(
    sensor: Sensor,
    deviceType: string,
  ): boolean {
    // Direct match on sensor type
    if (sensor.type.toLowerCase() === deviceType.toLowerCase()) {
      return true;
    }

    // Handle special cases
    if (
      deviceType === 'light' &&
      sensor.type.toLowerCase().includes('switch')
    ) {
      return true;
    }

    if (
      deviceType === 'temperature' &&
      (sensor.type.toLowerCase().includes('therm') ||
        sensor.type.toLowerCase().includes('heat') ||
        sensor.type.toLowerCase().includes('radiator'))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extract value parameters from commands (e.g., temperature setting)
   */
  private extractValueFromCommand(text: string, deviceType: string): any {
    // Extract numeric values
    const numberMatch = text.match(/\b(\d+([,.]\d+)?)\b/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[0].replace(',', '.'));

      // Return appropriate values based on device type
      if (deviceType === 'temperature') {
        return value; // Temperature in Celsius
      } else if (deviceType === 'light') {
        // Handle percentage for brightness
        if (
          text.includes('%') ||
          text.includes('percent') ||
          text.includes('pourcent')
        ) {
          return Math.min(100, Math.max(0, value));
        } else {
          return value > 0 ? 'on' : 'off';
        }
      }
      return value;
    }

    // Handle binary states for devices
    if (
      deviceType === 'light' ||
      deviceType === 'fan' ||
      deviceType === 'outlet'
    ) {
      return 'on'; // Default to "on" if no specific value found
    }

    return null;
  }

  /**
   * Execute the command for a specific sensor via MQTT
   */
  private async executeSensorCommand(
    sensor: Sensor,
    action: string,
    value: any,
  ): Promise<void> {
    if (!sensor.topic) {
      throw new Error(`Sensor ${sensor.name} has no MQTT topic`);
    }

    const payload: any = {
      timestamp: new Date().toISOString(),
      sensorId: sensor.id,
      sensorName: sensor.name,
    };

    switch (action) {
      case 'on':
        payload.state = 'on';
        payload.value = 1;
        break;
      case 'off':
        payload.state = 'off';
        payload.value = 0;
        break;
      case 'set':
        payload.state = 'set';
        payload.value = value;
        break;
      case 'get':
        payload.state = 'get';
        break;
    }

    this.logger.log(
      `Executing command: ${action} for ${sensor.type} (${sensor.name}) with value ${value} via topic ${sensor.topic}`,
    );

    await this.mqttService.publishToTopic(sensor.topic, payload);
  }

  /**
   * Generate a success message for the user
   */
  private generateSuccessMessage(
    action: string,
    deviceType: string,
    roomName: string,
    value?: any,
  ): string {
    switch (action) {
      case 'on':
        return `${deviceType} dans ${roomName} allumé(e)`;
      case 'off':
        return `${deviceType} dans ${roomName} éteint(e)`;
      case 'set':
        return `${deviceType} dans ${roomName} réglé(e) à ${value}`;
      case 'get':
        return `État du/de la ${deviceType} dans ${roomName} demandé`;
      default:
        return `Commande exécutée pour ${deviceType} dans ${roomName}`;
    }
  }

  async createRoom(room: Room): Promise<Room> {
    try {
      // Add room to Firebase
      const roomRef = await addDoc(collection(db, 'rooms'), room);

      // Subscribe to room topic
      await this.mqttService.subscribeToTopic(room.topic);

      this.logger.log(`Created room: ${room.name} with topic: ${room.topic}`);

      return {
        ...room,
        id: roomRef.id,
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

      roomsSnapshot.forEach((doc) => {
        rooms.push({
          id: doc.id,
          ...(doc.data() as Room),
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
        ...(roomDoc.data() as Room),
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
        ...(currentRoom.data() as Room),
        ...updates,
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
