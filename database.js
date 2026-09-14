export class PostgresStore {
  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.connectionString = connectionString;
    this.ready = this.initialize();
  }

  async initialize() {
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.connectionString });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        session_token TEXT UNIQUE,
        plan JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async findByEmail(email) {
    await this.ready;
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return mapUser(rows[0]);
  }

  async findByToken(token) {
    if (!token) return undefined;
    await this.ready;
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE session_token = $1',
      [token],
    );
    return mapUser(rows[0]);
  }

  async create(user) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO users
        (id, email, password_salt, password_hash, session_token, plan)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [user.id, user.email, user.salt, user.hash, user.token, JSON.stringify(user.data)],
    );
  }

  async updateToken(id, token) {
    await this.ready;
    await this.pool.query(
      'UPDATE users SET session_token = $1, updated_at = NOW() WHERE id = $2',
      [token, id],
    );
  }

  async updateData(id, data) {
    await this.ready;
    await this.pool.query(
      'UPDATE users SET plan = $1::jsonb, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(data), id],
    );
  }
}

function mapUser(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    salt: row.password_salt,
    hash: row.password_hash,
    token: row.session_token,
    data: row.plan,
  };
}

export class MemoryStore {
  constructor() {
    this.users = [];
  }

  async findByEmail(email) {
    return this.users.find((user) => user.email === email);
  }

  async findByToken(token) {
    return this.users.find((user) => user.token === token);
  }

  async create(user) {
    if (await this.findByEmail(user.email)) {
      const error = new Error('duplicate email');
      error.code = '23505';
      throw error;
    }
    this.users.push(structuredClone(user));
  }

  async updateToken(id, token) {
    this.users.find((user) => user.id === id).token = token;
  }

  async updateData(id, data) {
    this.users.find((user) => user.id === id).data = structuredClone(data);
  }
}
