export interface Sensor {
  id?: string;
  name: string;
  roomId: string;
  type: string;
  topic?: string;
}

export interface Room {
  id?: string;
  name: string;
  topic: string;
}

export interface CommandResult {
  processed: boolean;
  result: string;
  action?: string;
  room?: string;
  device?: string;
  value?: any;
}
