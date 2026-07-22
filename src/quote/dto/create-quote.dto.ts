import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum TransportMode {
  PLANE = 'plane',
  SHIP = 'ship',
  TRAIN = 'train',
  TRUCK = 'truck',
}

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  origin: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  destination: string;

  @IsEnum(TransportMode)
  mode: TransportMode;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
