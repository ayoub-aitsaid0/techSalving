const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Company Info
    getCompanyInfo: () => ipcRenderer.invoke('get-company-info'),
    updateCompanyInfo: (data) => ipcRenderer.invoke('update-company-info', data),

    // Clients
    getClients: () => ipcRenderer.invoke('get-clients'),
    createClient: (client) => ipcRenderer.invoke('create-client', client),
    updateClient: (client) => ipcRenderer.invoke('update-client', client),
    deleteClient: (id) => ipcRenderer.invoke('delete-client', id),

    // Devis
    getDevis: () => ipcRenderer.invoke('get-devis'),
    createDevis: (devis) => ipcRenderer.invoke('create-devis', devis),
    updateDevis: (devis) => ipcRenderer.invoke('update-devis', devis),
    deleteDevis: (id) => ipcRenderer.invoke('delete-devis', id),

    // Bons de Livraison
    getBonLivraison: () => ipcRenderer.invoke('get-bon-livraison'),
    createBonLivraison: (bl) => ipcRenderer.invoke('create-bon-livraison', bl),
    updateBonLivraison: (bl) => ipcRenderer.invoke('update-bon-livraison', bl),
    deleteBonLivraison: (id) => ipcRenderer.invoke('delete-bon-livraison', id),

    // Factures Clients
    getFactures: () => ipcRenderer.invoke('get-factures'),
    createFacture: (facture) => ipcRenderer.invoke('create-facture', facture),
    updateFacture: (facture) => ipcRenderer.invoke('update-facture', facture),
    deleteFacture: (id) => ipcRenderer.invoke('delete-facture', id),

    // Fournisseurs
    getFournisseurs: () => ipcRenderer.invoke('get-fournisseurs'),
    createFournisseur: (f) => ipcRenderer.invoke('create-fournisseur', f),
    updateFournisseur: (f) => ipcRenderer.invoke('update-fournisseur', f),
    deleteFournisseur: (id) => ipcRenderer.invoke('delete-fournisseur', id),

    // Factures Fournisseurs
    getSupplierInvoices: () => ipcRenderer.invoke('get-supplier-invoices'),
    createSupplierInvoice: (inv) => ipcRenderer.invoke('create-supplier-invoice', inv),
    updateSupplierInvoice: (inv) => ipcRenderer.invoke('update-supplier-invoice', inv),
    deleteSupplierInvoice: (id) => ipcRenderer.invoke('delete-supplier-invoice', id),

    // Gestion des fichiers scans
    uploadInvoiceFile: () => ipcRenderer.invoke('upload-invoice-file'),
    openInvoiceFile: (relativePath) => ipcRenderer.invoke('open-invoice-file', relativePath),

    // Alertes échéances
    getAlerts: () => ipcRenderer.invoke('get-alerts'),

    // PDF
    savePDF: (data) => ipcRenderer.invoke('save-pdf', data),
});