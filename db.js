require('dotenv').config()

const { Pool } = require('pg')
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`

module.exports = class DbUtil {

    constructor() {
        this.pool = new Pool({
            connectionString: connectionString
        })
    }

    async fetchEmails() {
        let { rows } = await this.pool.query('SELECT * FROM users');
        return rows.map(r => r.email);
    }

    async addEmail(email) {
        await this.pool.query('INSERT INTO users (email) VALUES ($1)', [email]);
    }

    async removeEmail(email) {
        await this.pool.query('DELETE FROM users WHERE email = ($1)', [email]);
    }

    close() {
        this.pool.end();
    }
}