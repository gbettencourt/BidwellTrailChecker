import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

type UserDb = {
	users: User[];
};
export type User = {
	id: number;
	email: string;
	phone: string;
	skipMail?: boolean;
};

export default class DbUtil {
	db: Low<UserDb>;
	constructor() {
		this.db = new Low<UserDb>(new JSONFile('db.json'), { users: [] });
	}

	async fetchEmails(): Promise<string[]> {
		await this.db.read();
		const users = this.db.data.users;
		return users.map((r) => r.email);
	}

	async fetchUsers(): Promise<User[]> {
		await this.db.read();
		return this.db.data.users;
	}

	async addUser(email: string, phone: string) {
		await this.db.read();
		const nextId = this.db.data.users.length > 0 ? this.db.data.users[this.db.data.users.length - 1].id + 1 : 1;
		this.db.data.users.push({ id: nextId, email, phone });
		await this.db.write();
	}

	async removeUser(email: string) {
		await this.db.read();
		const users = this.db.data.users;
		const index = users.findIndex((user) => user.email === email);
		if (index > -1) {
			users.splice(index, 1);
		}
		await this.db.write();
	}

	async save() {
		await this.db.write();
	}
}
