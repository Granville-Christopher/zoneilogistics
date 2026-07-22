import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from './quote.service';

@Controller('api/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateQuoteDto) {
    const quote = this.quoteService.create(dto);
    return {
      success: true,
      message:
        'Quote request received. A Zonei International Logistics specialist will contact you shortly.',
      quote,
    };
  }

  @Get()
  findAll() {
    return this.quoteService.findAll();
  }
}
