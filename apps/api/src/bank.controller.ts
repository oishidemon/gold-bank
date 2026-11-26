import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { BankService } from './bank.service';
import { Public } from './public.decorator';
import { MemberDto, SaleDto, StockDto } from './dto';

@Controller('api')
export class BankController {
  constructor(private bank: BankService) {}

  @Public() @Get('version') version() { return { version: process.env.APP_VERSION ?? 'dev' }; }

  @Get('state') state() { return this.bank.state(); }

  @Post('members') @HttpCode(204)
  async addMember(@Body() d: MemberDto) { await this.bank.addMember(d.name); }

  @Delete('members/:name') @HttpCode(204)
  async delMember(@Param('name') name: string) { await this.bank.deleteMember(name); }

  @Post('stock') @HttpCode(204)
  async addStock(@Body() d: StockDto) { await this.bank.addStock(d.owner, d.gold); }

  @Delete('stock/:id') @HttpCode(204)
  async delStock(@Param('id', ParseUUIDPipe) id: string) { await this.bank.deleteStock(id); }

  @Post('sales') @HttpCode(204)
  async sell(@Body() d: SaleDto) { await this.bank.sell(d.owner, d.gold, d.price, d.unit); }

  @Patch('sales/:id/paid') @HttpCode(204)
  async pay(@Param('id', ParseUUIDPipe) id: string) { await this.bank.togglePaid(id); }

  @Delete('sales/:id') @HttpCode(204)
  async undo(@Param('id', ParseUUIDPipe) id: string) { await this.bank.undoSale(id); }
}
