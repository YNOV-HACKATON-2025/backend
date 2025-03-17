import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SimulateDeviceDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  topic: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  interval?: number;
}
