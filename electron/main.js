const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Fix: Linux SUID sandbox is not configured in dev environments.
// This must be called before app.whenReady().
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');

let mainWindow;
let db;

// Initialiser la base de données
function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'gestion-documents.db');

    db = new Database(dbPath);

    // Créer les tables existantes
    db.exec(`
    CREATE TABLE IF NOT EXISTS company_info (
      id INTEGER PRIMARY KEY,
      logo TEXT,
      name TEXT NOT NULL,
      address TEXT,
      tp TEXT,
      if_num TEXT,
      rc TEXT,
      ice TEXT,
      tel TEXT,
      rib TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      address TEXT,
      ice TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      total_ht REAL NOT NULL,
      tva REAL NOT NULL,
      total_ttc REAL NOT NULL,
      items TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS bon_livraison (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      numero_devis TEXT,
      items TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS factures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      numero_devis TEXT,
      total_ht REAL NOT NULL,
      tva REAL NOT NULL,
      total_ttc REAL NOT NULL,
      items TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS fournisseurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      address TEXT,
      ice TEXT,
      tel TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      fournisseur_id INTEGER NOT NULL,
      total_ht REAL NOT NULL DEFAULT 0,
      tva REAL NOT NULL DEFAULT 0,
      total_ttc REAL NOT NULL DEFAULT 0,
      date_issue TEXT NOT NULL,
      date_due TEXT,
      status TEXT DEFAULT 'brouillon',
      file_path TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id)
    );
  `);

    // Migrations safe: ajouter colonnes manquantes sur factures
    const migrations = [
        "ALTER TABLE factures ADD COLUMN status TEXT DEFAULT 'brouillon'",
        "ALTER TABLE factures ADD COLUMN date_due TEXT"
    ];
    for (const sql of migrations) {
        try { db.exec(sql); } catch (e) { /* colonne déjà présente */ }
    }

    // Créer le dossier uploads pour les scans fournisseurs
    const uploadsDir = path.join(userDataPath, 'uploads', 'invoices');
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Insérer les données par défaut si la table company_info est vide
    const companyExists = db.prepare('SELECT COUNT(*) as count FROM company_info').get();
    if (companyExists.count === 0) {
        db.prepare(`
      INSERT INTO company_info (id, name, address, tp, if_num, rc, ice, tel, rib, email)
      VALUES (1, 'VOTRE ENTREPRISE', 'Adresse de l entreprise', '12345678', 'IF123456', 
              'RC123456', 'ICE123456789', '+212 6XX XXX XXX', 'RIB XXXXXXXXXXXXXXXXXX', 
              'contact@entreprise.ma')
    `).run();
    }

    console.log('Base de donnees initialisee:', dbPath);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '../build/icon.png')
    });

    // En développement
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // En production
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// Vérifier les échéances et envoyer des notifications Electron
function checkExpiringInvoices() {
    if (!db) return;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const soonDate = new Date(today);
    soonDate.setDate(soonDate.getDate() + 5);
    const soonStr = soonDate.toISOString().split('T')[0];

    // Factures clients en retard
    const overdueClient = db.prepare(`
        SELECT f.numero, c.nom as client_nom, f.date_due
        FROM factures f JOIN clients c ON f.client_id = c.id
        WHERE f.date_due IS NOT NULL AND f.date_due < ? AND f.status != 'payé'
    `).all(todayStr);

    // Factures clients bientôt dues
    const soonClient = db.prepare(`
        SELECT f.numero, c.nom as client_nom, f.date_due
        FROM factures f JOIN clients c ON f.client_id = c.id
        WHERE f.date_due IS NOT NULL AND f.date_due >= ? AND f.date_due <= ? AND f.status != 'payé'
    `).all(todayStr, soonStr);

    // Factures fournisseurs en retard
    const overdueSupplier = db.prepare(`
        SELECT si.reference, fo.nom as fournisseur_nom, si.date_due
        FROM supplier_invoices si JOIN fournisseurs fo ON si.fournisseur_id = fo.id
        WHERE si.date_due IS NOT NULL AND si.date_due < ? AND si.status != 'payé'
    `).all(todayStr);

    // Factures fournisseurs bientôt dues
    const soonSupplier = db.prepare(`
        SELECT si.reference, fo.nom as fournisseur_nom, si.date_due
        FROM supplier_invoices si JOIN fournisseurs fo ON si.fournisseur_id = fo.id
        WHERE si.date_due IS NOT NULL AND si.date_due >= ? AND si.date_due <= ? AND si.status != 'payé'
    `).all(todayStr, soonStr);

    const totalOverdue = overdueClient.length + overdueSupplier.length;
    const totalSoon = soonClient.length + soonSupplier.length;

    if (totalOverdue > 0 && Notification.isSupported()) {
        new Notification({
            title: `⚠️ ${totalOverdue} Facture(s) en retard !`,
            body: [
                ...overdueClient.map(f => `Facture ${f.numero} - ${f.client_nom}`),
                ...overdueSupplier.map(f => `Fourn. ${f.reference} - ${f.fournisseur_nom}`)
            ].slice(0, 3).join('\n'),
            urgency: 'critical'
        }).show();
    }

    if (totalSoon > 0 && Notification.isSupported()) {
        new Notification({
            title: `🔔 ${totalSoon} Facture(s) à échéance proche`,
            body: [
                ...soonClient.map(f => `Facture ${f.numero} - ${f.client_nom} (${f.date_due})`),
                ...soonSupplier.map(f => `Fourn. ${f.reference} - ${f.fournisseur_nom} (${f.date_due})`)
            ].slice(0, 3).join('\n')
        }).show();
    }
}

app.whenReady().then(() => {
    initDatabase();
    createWindow();

    // Vérifier les échéances au démarrage et toutes les 6 heures
    setTimeout(checkExpiringInvoices, 3000);
    setInterval(checkExpiringInvoices, 6 * 60 * 60 * 1000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.close();
        app.quit();
    }
});

// IPC Handlers pour la base de données

// Company Info
ipcMain.handle('get-company-info', () => {
    return db.prepare('SELECT * FROM company_info WHERE id = 1').get();
});

ipcMain.handle('update-company-info', (event, data) => {
    const stmt = db.prepare(`
    UPDATE company_info 
    SET name = ?, address = ?, tp = ?, if_num = ?, rc = ?, ice = ?, tel = ?, rib = ?, email = ?
    WHERE id = 1
  `);
    return stmt.run(data.name, data.address, data.tp, data.if_num, data.rc, data.ice, data.tel, data.rib, data.email);
});

// Clients
ipcMain.handle('get-clients', () => {
    return db.prepare('SELECT * FROM clients ORDER BY nom').all();
});

ipcMain.handle('create-client', (event, client) => {
    const stmt = db.prepare('INSERT INTO clients (code, nom, address, ice) VALUES (?, ?, ?, ?)');
    const result = stmt.run(client.code, client.nom, client.address, client.ice);
    return { id: result.lastInsertRowid, ...client };
});

ipcMain.handle('update-client', (event, client) => {
    const stmt = db.prepare('UPDATE clients SET code = ?, nom = ?, address = ?, ice = ? WHERE id = ?');
    stmt.run(client.code, client.nom, client.address, client.ice, client.id);
    return client;
});

ipcMain.handle('delete-client', (event, id) => {
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    return { success: true };
});

// Devis
ipcMain.handle('get-devis', () => {
    const devis = db.prepare(`
    SELECT d.*, c.code as client_code, c.nom as client_nom, c.address as client_address, c.ice as client_ice
    FROM devis d
    JOIN clients c ON d.client_id = c.id
    ORDER BY d.created_at DESC
  `).all();

    return devis.map(d => ({
        ...d,
        items: JSON.parse(d.items),
        totalHT: d.total_ht,
        tva: d.tva,
        totalTTC: d.total_ttc,
        client: {
            id: d.client_id,
            code: d.client_code,
            nom: d.client_nom,
            address: d.client_address,
            ice: d.client_ice
        }
    }));
});

ipcMain.handle('create-devis', (event, devis) => {
    const stmt = db.prepare(`
    INSERT INTO devis (numero, date, client_id, total_ht, tva, total_ttc, items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(
        devis.numero,
        devis.date,
        devis.client.id,
        devis.totalHT,
        devis.tva,
        devis.totalTTC,
        JSON.stringify(devis.items)
    );
    return { id: result.lastInsertRowid, ...devis };
});

ipcMain.handle('update-devis', (event, devis) => {
    const stmt = db.prepare(`
    UPDATE devis 
    SET date = ?, client_id = ?, total_ht = ?, tva = ?, total_ttc = ?, items = ?
    WHERE id = ?
  `);
    stmt.run(
        devis.date,
        devis.client.id,
        devis.totalHT,
        devis.tva,
        devis.totalTTC,
        JSON.stringify(devis.items),
        devis.id
    );
    return devis;
});

ipcMain.handle('delete-devis', (event, id) => {
    db.prepare('DELETE FROM devis WHERE id = ?').run(id);
    return { success: true };
});

// Bons de Livraison
ipcMain.handle('get-bon-livraison', () => {
    const bls = db.prepare(`
    SELECT bl.*, c.code as client_code, c.nom as client_nom, c.address as client_address, c.ice as client_ice
    FROM bon_livraison bl
    JOIN clients c ON bl.client_id = c.id
    ORDER BY bl.created_at DESC
  `).all();

    return bls.map(bl => ({
        ...bl,
        items: JSON.parse(bl.items),
        client: {
            id: bl.client_id,
            code: bl.client_code,
            nom: bl.client_nom,
            address: bl.client_address,
            ice: bl.client_ice
        }
    }));
});

ipcMain.handle('create-bon-livraison', (event, bl) => {
    const stmt = db.prepare(`
    INSERT INTO bon_livraison (numero, date, client_id, numero_devis, items)
    VALUES (?, ?, ?, ?, ?)
  `);
    const result = stmt.run(
        bl.numero,
        bl.date,
        bl.client.id,
        bl.numeroDevis || null,
        JSON.stringify(bl.items)
    );
    return { id: result.lastInsertRowid, ...bl };
});

ipcMain.handle('update-bon-livraison', (event, bl) => {
    const stmt = db.prepare(`
    UPDATE bon_livraison 
    SET date = ?, client_id = ?, numero_devis = ?, items = ?
    WHERE id = ?
  `);
    stmt.run(
        bl.date,
        bl.client.id,
        bl.numeroDevis || null,
        JSON.stringify(bl.items),
        bl.id
    );
    return bl;
});

ipcMain.handle('delete-bon-livraison', (event, id) => {
    db.prepare('DELETE FROM bon_livraison WHERE id = ?').run(id);
    return { success: true };
});

// Factures
ipcMain.handle('get-factures', () => {
    const factures = db.prepare(`
    SELECT f.*, c.code as client_code, c.nom as client_nom, c.address as client_address, c.ice as client_ice
    FROM factures f
    JOIN clients c ON f.client_id = c.id
    ORDER BY f.created_at DESC
  `).all();

    return factures.map(f => ({
        ...f,
        items: JSON.parse(f.items),
        totalHT: f.total_ht,
        tva: f.tva,
        totalTTC: f.total_ttc,
        numeroDevis: f.numero_devis,
        status: f.status || 'brouillon',
        dateDue: f.date_due || null,
        client: {
            id: f.client_id,
            code: f.client_code,
            nom: f.client_nom,
            address: f.client_address,
            ice: f.client_ice
        }
    }));
});

ipcMain.handle('create-facture', (event, facture) => {
    const stmt = db.prepare(`
    INSERT INTO factures (numero, date, client_id, numero_devis, total_ht, tva, total_ttc, items, status, date_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(
        facture.numero,
        facture.date,
        facture.client.id,
        facture.numeroDevis || null,
        facture.totalHT,
        facture.tva,
        facture.totalTTC,
        JSON.stringify(facture.items),
        facture.status || 'brouillon',
        facture.dateDue || null
    );
    return { id: result.lastInsertRowid, ...facture };
});

ipcMain.handle('update-facture', (event, facture) => {
    const stmt = db.prepare(`
    UPDATE factures 
    SET date = ?, client_id = ?, numero_devis = ?, total_ht = ?, tva = ?, total_ttc = ?, items = ?, status = ?, date_due = ?
    WHERE id = ?
  `);
    stmt.run(
        facture.date,
        facture.client.id,
        facture.numeroDevis || null,
        facture.totalHT,
        facture.tva,
        facture.totalTTC,
        JSON.stringify(facture.items),
        facture.status || 'brouillon',
        facture.dateDue || null,
        facture.id
    );
    return facture;
});

ipcMain.handle('delete-facture', (event, id) => {
    db.prepare('DELETE FROM factures WHERE id = ?').run(id);
    return { success: true };
});

// =============================================
// FOURNISSEURS
// =============================================
ipcMain.handle('get-fournisseurs', () => {
    return db.prepare('SELECT * FROM fournisseurs ORDER BY nom').all();
});

ipcMain.handle('create-fournisseur', (event, f) => {
    const stmt = db.prepare('INSERT INTO fournisseurs (code, nom, address, ice, tel) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(f.code, f.nom, f.address || null, f.ice || null, f.tel || null);
    return { id: result.lastInsertRowid, ...f };
});

ipcMain.handle('update-fournisseur', (event, f) => {
    db.prepare('UPDATE fournisseurs SET code = ?, nom = ?, address = ?, ice = ?, tel = ? WHERE id = ?')
        .run(f.code, f.nom, f.address || null, f.ice || null, f.tel || null, f.id);
    return f;
});

ipcMain.handle('delete-fournisseur', (event, id) => {
    db.prepare('DELETE FROM fournisseurs WHERE id = ?').run(id);
    return { success: true };
});

// =============================================
// FACTURES FOURNISSEURS
// =============================================
ipcMain.handle('get-supplier-invoices', () => {
    const rows = db.prepare(`
        SELECT si.*, fo.code as f_code, fo.nom as f_nom, fo.address as f_address, fo.ice as f_ice, fo.tel as f_tel
        FROM supplier_invoices si
        JOIN fournisseurs fo ON si.fournisseur_id = fo.id
        ORDER BY si.created_at DESC
    `).all();
    return rows.map(r => ({
        ...r,
        totalHT: r.total_ht,
        totalTTC: r.total_ttc,
        dateIssue: r.date_issue,
        dateDue: r.date_due,
        filePath: r.file_path,
        fournisseur: { id: r.fournisseur_id, code: r.f_code, nom: r.f_nom, address: r.f_address, ice: r.f_ice, tel: r.f_tel }
    }));
});

ipcMain.handle('create-supplier-invoice', (event, inv) => {
    const stmt = db.prepare(`
        INSERT INTO supplier_invoices (reference, fournisseur_id, total_ht, tva, total_ttc, date_issue, date_due, status, file_path, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        inv.reference, inv.fournisseur.id, inv.totalHT || 0, inv.tva || 0, inv.totalTTC || 0,
        inv.dateIssue, inv.dateDue || null, inv.status || 'brouillon', inv.filePath || null, inv.notes || null
    );
    return { id: result.lastInsertRowid, ...inv };
});

ipcMain.handle('update-supplier-invoice', (event, inv) => {
    db.prepare(`
        UPDATE supplier_invoices
        SET reference = ?, fournisseur_id = ?, total_ht = ?, tva = ?, total_ttc = ?,
            date_issue = ?, date_due = ?, status = ?, file_path = ?, notes = ?
        WHERE id = ?
    `).run(
        inv.reference, inv.fournisseur.id, inv.totalHT || 0, inv.tva || 0, inv.totalTTC || 0,
        inv.dateIssue, inv.dateDue || null, inv.status || 'brouillon', inv.filePath || null, inv.notes || null, inv.id
    );
    return inv;
});

ipcMain.handle('delete-supplier-invoice', (event, id) => {
    db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(id);
    return { success: true };
});

// =============================================
// UPLOAD FICHIER SCAN
// =============================================
ipcMain.handle('upload-invoice-file', async () => {
    const { dialog } = require('electron');
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Sélectionner un scan ou un PDF',
        filters: [
            { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'] }
        ],
        properties: ['openFile']
    });
    if (!filePaths || filePaths.length === 0) return { success: false };

    const srcPath = filePaths[0];
    const filename = `${Date.now()}_${path.basename(srcPath)}`;
    const uploadsDir = path.join(app.getPath('userData'), 'uploads', 'invoices');
    const destPath = path.join(uploadsDir, filename);

    fs.copyFileSync(srcPath, destPath);
    // Stocker le chemin relatif pour la portabilité
    const relativePath = path.join('uploads', 'invoices', filename);
    return { success: true, filePath: relativePath, filename };
});

ipcMain.handle('open-invoice-file', (event, relativePath) => {
    const fullPath = path.join(app.getPath('userData'), relativePath);
    if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'Fichier introuvable. Il a peut-être été déplacé ou supprimé.' };
    }
    shell.openPath(fullPath);
    return { success: true };
});

// =============================================
// ALERTES ÉCHÉANCES
// =============================================
ipcMain.handle('get-alerts', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const soonDate = new Date(today);
    soonDate.setDate(soonDate.getDate() + 5);
    const soonStr = soonDate.toISOString().split('T')[0];

    const clientAlerts = db.prepare(`
        SELECT f.id, f.numero, f.date_due, f.status, f.total_ttc,
               c.nom as nom_tiers, 'client' as type
        FROM factures f JOIN clients c ON f.client_id = c.id
        WHERE f.date_due IS NOT NULL AND f.date_due <= ? AND f.status != 'payé'
        ORDER BY f.date_due ASC
    `).all(soonStr);

    const supplierAlerts = db.prepare(`
        SELECT si.id, si.reference as numero, si.date_due, si.status, si.total_ttc,
               fo.nom as nom_tiers, 'fournisseur' as type
        FROM supplier_invoices si JOIN fournisseurs fo ON si.fournisseur_id = fo.id
        WHERE si.date_due IS NOT NULL AND si.date_due <= ? AND si.status != 'payé'
        ORDER BY si.date_due ASC
    `).all(soonStr);

    return [...clientAlerts, ...supplierAlerts].map(a => ({
        ...a,
        totalTTC: a.total_ttc,
        isOverdue: a.date_due < todayStr,
        daysUntilDue: Math.ceil((new Date(a.date_due) - today) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => a.date_due.localeCompare(b.date_due));
});

// Génération PDF
ipcMain.handle('save-pdf', async (event, { filename, pdfData }) => {
    const { dialog } = require('electron');

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
        const buffer = Buffer.from(pdfData, 'base64');
        fs.writeFileSync(filePath, buffer);
        return { success: true, path: filePath };
    }

    return { success: false };
});