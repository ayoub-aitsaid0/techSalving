/**
 * Drop-in replacement for better-sqlite3 using sql.js (pure WASM, no compilation needed).
 * Provides the same synchronous API: prepare().get(), prepare().all(), prepare().run(), exec().
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class Statement {
    constructor(db, sql, onWrite) {
        this._db = db;
        this._sql = sql;
        this._onWrite = onWrite;
    }

    // Normalize: allow both .get(a, b) and .get([a, b])
    _params(args) {
        if (args.length === 1 && Array.isArray(args[0])) return args[0];
        return args;
    }

    get(...args) {
        const params = this._params(args);
        const stmt = this._db.prepare(this._sql);
        if (params.length > 0) stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
    }

    all(...args) {
        const params = this._params(args);
        const results = [];
        const stmt = this._db.prepare(this._sql);
        if (params.length > 0) stmt.bind(params);
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    run(...args) {
        const params = this._params(args);
        this._db.run(this._sql, params.length > 0 ? params : undefined);
        const lastInsertRowid = this._db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
        this._onWrite();
        return { lastInsertRowid };
    }
}

class Database {
    constructor() {
        this._db = null;
        this._dbPath = null;
    }

    static async create(dbPath) {
        const instance = new Database();
        instance._dbPath = dbPath;
        const SQL = await initSqlJs();
        if (fs.existsSync(dbPath)) {
            const buffer = fs.readFileSync(dbPath);
            instance._db = new SQL.Database(buffer);
        } else {
            instance._db = new SQL.Database();
        }
        return instance;
    }

    _save() {
        const data = this._db.export();
        fs.writeFileSync(this._dbPath, Buffer.from(data));
    }

    exec(sql) {
        this._db.exec(sql);
        this._save();
        return this;
    }

    prepare(sql) {
        return new Statement(this._db, sql, () => this._save());
    }

    close() {
        this._save();
        this._db.close();
    }
}

module.exports = Database;
