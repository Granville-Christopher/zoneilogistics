import { Injectable } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';

export interface QuoteRequest extends CreateQuoteDto {
  id: string;
  createdAt: string;
  status: 'received';
}

@Injectable()
export class QuoteService {
  private readonly quotes: QuoteRequest[] = [];

  create(dto: CreateQuoteDto): QuoteRequest {
    const quote: QuoteRequest = {
      ...dto,
      id: `ZI-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'received',
    };
    this.quotes.unshift(quote);
    return quote;
  }

  findAll(): QuoteRequest[] {
    return this.quotes;
  }
}
