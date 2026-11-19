import { IsIn, IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class MemberDto {
  @IsString() @Length(1, 30) name: string;
}
export class StockDto {
  @IsString() @Length(1, 30) owner: string;
  @IsInt() @Min(1) @Max(9_000_000_000_000_000) gold: number;
}
export class SaleDto extends StockDto {
  @IsNumber() @Min(0.00000001) price: number;
  @IsIn([1, 1000, 1000000]) unit: number;
}
