export interface Sensor {
  id?: string;
  name: string;
  roomId: string;
  type: string;
  topic?: string;
  value?: string;
}

export interface Room {
  id?: string;
  name: string;
  topic: string;
  picture?: string;
}

export interface CommandResult {
  processed: boolean;
  result: string;
  action?: string;
  room?: string;
  device?: string;
  value?: any;
}
