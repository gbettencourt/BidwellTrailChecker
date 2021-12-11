import { Low, JSONFile } from "lowdb";
export default class DbUtil {
  constructor() {
    this.db = new Low(new JSONFile("db.json"));
  }

  async fetchEmails() {
    await this.db.read();
    const users = this.db.data.users;
    return users.map((r) => r.email);
  }

  async fetchUsers() {
    await this.db.read();
    return this.db.data.users;
  }

  async addUser(email, phone) {
    await this.db.read();
    const nextId = this.db.data.users[this.db.data.users.length - 1].id + 1;
    this.db.data.users.push({ id: nextId, email, phone });
    await this.db.write();
  }

  async removeUser(email) {
    await this.db.read();
    const users = this.db.data.users;
    const index = users.findIndex((user) => user.email === email);
    if (index > -1) {
      users.splice(index, 1);
    }
    await this.db.write();
  }

  async addEmail(email) {
    await this.db.read();
    const nextId = this.db.data.users[this.db.data.users.length - 1].id + 1;
    this.db.data.users.push({ id: nextId, email, phone: "" });
    await this.db.write();
  }

  async removeEmail(email) {
    await this.db.read();
    const users = this.db.data.users;
    const index = users.findIndex((user) => user.email === email);
    if (index > -1) {
      users.splice(index, 1);
    }
    await this.db.write();
  }
}
