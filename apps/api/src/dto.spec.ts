import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MemberDto, SaleDto, StockDto } from './dto';

const check = (cls: any, body: object) => validate(plainToInstance(cls, body));

describe('DTO validation', () => {
  it('accepts a valid sale', async () => {
    expect(await check(SaleDto, { owner: 'Vovka', gold: 150, price: 0.5, unit: 1 })).toHaveLength(0);
  });
  it.each([1, 1000, 1000000])('accepts price unit %i', async (unit) => {
    expect(await check(SaleDto, { owner: 'V', gold: 10, price: 1, unit })).toHaveLength(0);
  });
  it('rejects an unknown price unit', async () => {
    expect((await check(SaleDto, { owner: 'V', gold: 10, price: 1, unit: 7 })).length).toBeGreaterThan(0);
  });
  it('rejects zero or negative price', async () => {
    expect((await check(SaleDto, { owner: 'V', gold: 10, price: 0, unit: 1 })).length).toBeGreaterThan(0);
    expect((await check(SaleDto, { owner: 'V', gold: 10, price: -1, unit: 1 })).length).toBeGreaterThan(0);
  });
  it('rejects fractional, zero or negative gold', async () => {
    for (const gold of [1.5, 0, -10]) {
      expect((await check(StockDto, { owner: 'V', gold })).length).toBeGreaterThan(0);
    }
  });
  it('rejects empty and too long member names', async () => {
    expect((await check(MemberDto, { name: '' })).length).toBeGreaterThan(0);
    expect((await check(MemberDto, { name: 'x'.repeat(31) })).length).toBeGreaterThan(0);
  });
});
