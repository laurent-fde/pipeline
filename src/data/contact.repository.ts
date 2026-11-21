import { getDatabase, type Database } from "./db";

export type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  createdAt: string;
};

export type NewContact = Omit<Contact, "id" | "createdAt">;

export interface ContactRepository {
  insert(contact: NewContact): Promise<Contact>;
  findAll(): Promise<Contact[]>;
  findById(id: string): Promise<Contact | null>;
  updateStage(id: string, stage: string): Promise<Contact | null>;
}

type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  created_at: string;
};

const toContact = (row: ContactRow): Contact => ({
  id: row.id,
  name: row.name,
  company: row.company,
  email: row.email,
  phone: row.phone,
  stage: row.stage,
  createdAt: row.created_at,
});

const COLUMNS = "id, name, company, email, phone, stage, created_at";

export function createContactRepository(db: Database = getDatabase()): ContactRepository {
  return {
    async insert(input) {
      await db.ready;
      const contact: Contact = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await db.client.execute({
        sql: "INSERT INTO contacts (id, name, company, email, phone, stage, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [contact.id, contact.name, contact.company, contact.email, contact.phone, contact.stage, contact.createdAt],
      });
      return contact;
    },

    async findAll() {
      await db.ready;
      // rowid départage deux contacts créés dans la même milliseconde.
      const { rows } = await db.client.execute(
        `SELECT ${COLUMNS} FROM contacts ORDER BY created_at DESC, rowid DESC`,
      );
      return (rows as unknown as ContactRow[]).map(toContact);
    },

    async findById(id) {
      await db.ready;
      const { rows } = await db.client.execute({ sql: `SELECT ${COLUMNS} FROM contacts WHERE id = ?`, args: [id] });
      const row = rows[0] as unknown as ContactRow | undefined;
      return row ? toContact(row) : null;
    },

    async updateStage(id, stage) {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: `UPDATE contacts SET stage = ? WHERE id = ? RETURNING ${COLUMNS}`,
        args: [stage, id],
      });
      const row = rows[0] as unknown as ContactRow | undefined;
      return row ? toContact(row) : null;
    },
  };
}
