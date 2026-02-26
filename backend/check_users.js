const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'root',
  database: 'careformance',
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, email, role, "firstName", "lastName", "createdById" FROM users');
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
