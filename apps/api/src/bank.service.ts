import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan } from 'typeorm';
import { Member, Row } from './entities';

@Injectable()
export class BankService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async state() {
    const members = await this.ds.getRepository(Member).find({ order: { createdAt: 'ASC' } });
    const rows = await this.ds.getRepository(Row).find({ order: { createdAt: 'ASC' } });
    return {
      owners: members.map((m) => m.name),
      rows: rows.map((r) => ({
        id: r.id, owner: r.member.name, stock: r.stock, sold: r.sold,
        price: r.price, unit: r.unit, paid: r.paid, t: r.createdAt.getTime(),
      })),
    };
  }

  async addMember(name: string) {
    name = name.trim();
    if (!name) throw new BadRequestException('Name is empty');
    const repo = this.ds.getRepository(Member);
    if (await repo.findOne({ where: { name } })) throw new ConflictException('Member already exists');
    await repo.save(repo.create({ name }));
  }

  async deleteMember(name: string) {
    await this.ds.getRepository(Member).delete({ name });
  }

  // locking the member row serialises every stock/sale change for that member
  private async lock(em: EntityManager, name: string) {
    const m = await em.findOne(Member, { where: { name }, lock: { mode: 'pessimistic_write' } });
    if (!m) throw new NotFoundException(`Member "${name}" not found`);
    return m;
  }

  private stockRow(em: EntityManager, m: Member) {
    return em.findOne(Row, { where: { member: { id: m.id }, stock: MoreThan(0) } });
  }

  private async addTo(em: EntityManager, m: Member, gold: number) {
    const st = await this.stockRow(em, m);
    if (st) { st.stock += gold; await em.save(st); }
    else await em.save(em.create(Row, { member: m, stock: gold, sold: 0 }));
  }

  addStock(owner: string, gold: number) {
    return this.ds.transaction(async (em) => this.addTo(em, await this.lock(em, owner), gold));
  }

  async deleteStock(id: string) {
    await this.ds.getRepository(Row).delete({ id, stock: MoreThan(0) });
  }

  sell(owner: string, gold: number, price: number, unit: number) {
    return this.ds.transaction(async (em) => {
      const m = await this.lock(em, owner);
      const st = await this.stockRow(em, m);
      if (!st || st.stock < gold)
        throw new BadRequestException(`${owner} only has ${st?.stock ?? 0} gold in stock.`);
      st.stock -= gold;
      if (st.stock === 0) await em.remove(st); else await em.save(st);
      await em.save(em.create(Row, { member: m, stock: 0, sold: gold, price, unit, paid: false }));
    });
  }

  async togglePaid(id: string) {
    const r = await this.ds.createQueryBuilder().update(Row)
      .set({ paid: () => 'NOT "paid"' })
      .where('"id" = :id AND "sold" > 0', { id }).execute();
    if (!r.affected) throw new NotFoundException('Sale not found');
  }

  // undo: gold goes back to the member's stock, the sale row disappears
  undoSale(id: string) {
    return this.ds.transaction(async (em) => {
      const row = await em.findOne(Row, { where: { id, sold: MoreThan(0) } });
      if (!row) throw new NotFoundException('Sale not found');
      const m = await this.lock(em, row.member.name);
      if (!(await em.findOne(Row, { where: { id } }))) throw new NotFoundException('Sale not found');
      await em.remove(row);
      await this.addTo(em, m, row.sold);
    });
  }
}
