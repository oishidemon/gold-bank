import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

const AUTH = { Authorization: 'Bearer test-password' };

describe('Bank API (integration, real Postgres)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const http = () => request(app.getHttpServer());
  const post = (path: string, body: object) => http().post(path).set(AUTH).send(body);
  const state = async () => (await http().get('/api/state').set(AUTH)).body;
  const totals = async () => {
    const { rows } = await state();
    return {
      stock: rows.reduce((t: number, r: any) => t + r.stock, 0),
      sold: rows.reduce((t: number, r: any) => t + r.sold, 0),
    };
  };
  const seed = async (gold: number) => {
    await post('/api/members', { name: 'Vovka' });
    await post('/api/stock', { owner: 'Vovka', gold });
  };

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('Set TEST_DATABASE_URL to a throw-away Postgres database (its tables get truncated).');
    }
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    ds = app.get(DataSource);
  });
  beforeEach(async () => { await ds.query('TRUNCATE ledger_rows, members CASCADE'); });
  afterAll(async () => { await app?.close(); });

  it('requires the password', async () => {
    await http().get('/api/state').expect(401);
    await http().get('/api/state').set({ Authorization: 'Bearer nope' }).expect(401);
    await http().get('/api/state').set(AUTH).expect(200);
  });

  it('serves the version without a password', async () => {
    const res = await http().get('/api/version').expect(200);
    expect(res.body).toHaveProperty('version');
  });

  it('creates members and rejects duplicates', async () => {
    await post('/api/members', { name: 'Vovka' }).expect(204);
    await post('/api/members', { name: 'Vovka' }).expect(409);
    expect((await state()).owners).toEqual(['Vovka']);
  });

  it('merges added gold into one stock row', async () => {
    await seed(100);
    await post('/api/stock', { owner: 'Vovka', gold: 150 }).expect(204);
    const { rows } = await state();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ owner: 'Vovka', stock: 250, sold: 0 });
  });

  it('rejects unknown members and invalid bodies', async () => {
    await post('/api/stock', { owner: 'Ghost', gold: 10 }).expect(404);
    await post('/api/stock', { owner: 'Ghost', gold: -1 }).expect(400);
  });

  it('records a sale: stock decreases, price and unit are fixed', async () => {
    await seed(250);
    await post('/api/sales', { owner: 'Vovka', gold: 200, price: 0.5, unit: 1 }).expect(204);
    const { rows } = await state();
    expect(rows.find((r: any) => r.stock > 0)).toMatchObject({ stock: 50 });
    expect(rows.find((r: any) => r.sold > 0)).toMatchObject({ sold: 200, price: 0.5, unit: 1, paid: false });
  });

  it('removes the stock row when everything is sold', async () => {
    await seed(100);
    await post('/api/sales', { owner: 'Vovka', gold: 100, price: 1, unit: 1 }).expect(204);
    expect(await totals()).toEqual({ stock: 0, sold: 100 });
    expect((await state()).rows).toHaveLength(1);
  });

  it('refuses to oversell and changes nothing', async () => {
    await seed(250);
    await post('/api/sales', { owner: 'Vovka', gold: 300, price: 1, unit: 1 }).expect(400);
    expect(await totals()).toEqual({ stock: 250, sold: 0 });
  });

  it('toggles payment on a sale', async () => {
    await seed(100);
    await post('/api/sales', { owner: 'Vovka', gold: 40, price: 1, unit: 1 });
    const id = (await state()).rows.find((r: any) => r.sold > 0).id;
    await http().patch(`/api/sales/${id}/paid`).set(AUTH).expect(204);
    expect((await state()).rows.find((r: any) => r.id === id).paid).toBe(true);
    await http().patch(`/api/sales/${id}/paid`).set(AUTH).expect(204);
    expect((await state()).rows.find((r: any) => r.id === id).paid).toBe(false);
  });

  it('undo returns the gold to stock and removes the sale', async () => {
    await seed(100);
    await post('/api/sales', { owner: 'Vovka', gold: 60, price: 1, unit: 1 });
    const id = (await state()).rows.find((r: any) => r.sold > 0).id;
    await http().delete(`/api/sales/${id}`).set(AUTH).expect(204);
    const { rows } = await state();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stock: 100, sold: 0 });
    await http().delete(`/api/sales/${id}`).set(AUTH).expect(404);
  });

  it('never oversells under concurrent sales', async () => {
    await seed(150);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => post('/api/sales', { owner: 'Vovka', gold: 20, price: 1, unit: 1 })),
    );
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 204)).toHaveLength(7);
    expect(codes.filter((c) => c === 400)).toHaveLength(3);
    expect(await totals()).toEqual({ stock: 10, sold: 140 });
  });

  it('deleting a member removes their records', async () => {
    await seed(100);
    await http().delete('/api/members/Vovka').set(AUTH).expect(204);
    expect(await state()).toEqual({ owners: [], rows: [] });
  });
});
