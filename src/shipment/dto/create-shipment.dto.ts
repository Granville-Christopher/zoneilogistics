import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateShipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  trackingCode?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  senderName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  senderAddress: string;

  @IsEmail()
  senderEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  receiverName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  receiverAddress: string;

  @IsEmail()
  receiverEmail: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  parcelDetails: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  weight: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  cityOfDeparture: string;

  @IsString()
  @IsNotEmpty()
  dateOfDeparture: string;

  @IsString()
  @IsNotEmpty()
  estimatedDateOfArrival: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentLocation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deliveryStatus: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  statusLevel: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  amountPaid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  destination: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shipmentHistory?: string;
}
