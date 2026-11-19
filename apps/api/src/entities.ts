import { Check, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

const toNum = { to: (v: any) => v, from: (v: any) => (v == null ? null : Number(v)) };

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, length: 30 }) name: string;
  @CreateDateColumn() createdAt: Date;
}

// stock row: stock > 0, sold = 0 (one per member)
// sale row:  stock = 0, sold > 0, price/unit fixed at sale time
@Entity('ledger_rows')
@Check('"stock" >= 0 AND "sold" >= 0')
export class Row {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE', eager: true }) member: Member;
  @Column('bigint', { default: 0, transformer: toNum }) stock: number;
  @Column('bigint', { default: 0, transformer: toNum }) sold: number;
  @Column('numeric', { precision: 20, scale: 8, nullable: true, transformer: toNum }) price: number | null;
  @Column('int', { nullable: true }) unit: number | null;
  @Column({ default: false }) paid: boolean;
  @CreateDateColumn() createdAt: Date;
}
