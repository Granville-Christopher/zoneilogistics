import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentService } from './shipment.service';

@Controller('api')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get('shipments')
  findAll() {
    return this.shipmentService.findAll();
  }

  @Get('shipments/:id')
  findOne(@Param('id') id: string) {
    return this.shipmentService.findOne(id);
  }

  @Post('shipments')
  async create(@Body() dto: CreateShipmentDto) {
    const shipment = await this.shipmentService.create(dto);
    return { success: true, shipment };
  }

  @Put('shipments/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    const shipment = await this.shipmentService.update(id, dto);
    return { success: true, shipment };
  }

  @Delete('shipments/:id')
  remove(@Param('id') id: string) {
    return this.shipmentService.remove(id);
  }

  @Get('track/:code')
  async track(@Param('code') code: string) {
    const shipment = await this.shipmentService.findByTrackingCode(code);
    return this.shipmentService.toPublicView(shipment);
  }
}
