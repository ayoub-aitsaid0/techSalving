export interface CompanyInfo {
    id?: number;
    logo?: string;
    name: string;
    address: string;
    tp: string;
    if_num: string;
    rc: string;
    ice: string;
    tel: string;
    rib: string;
    email: string;
}

export interface Client {
    id: number;
    code: string;
    nom: string;
    address: string;
    ice: string;
    created_at?: string;
}

export interface DevisItem {
    designation: string;
    quantite: number;
    prixUnitaire: number;
}

export interface Devis {
    id: number;
    numero: string;
    date: string;
    client: Client;
    items: DevisItem[];
    totalHT: number;
    tva: number;
    totalTTC: number;
    created_at?: string;
}

export interface BLItem {
    designation: string;
    quantite: number;
    remarque: string;
}

export interface BonLivraison {
    id: number;
    numero: string;
    date: string;
    client: Client;
    numeroDevis?: string;
    items: BLItem[];
    created_at?: string;
}

export interface FactureItem {
    designation: string;
    quantite: number;
    prixUnitaire: number;
}

export interface Facture {
    id: number;
    numero: string;
    date: string;
    client: Client;
    numeroDevis?: string;
    items: FactureItem[];
    totalHT: number;
    tva: number;
    totalTTC: number;
    status?: 'brouillon' | 'payé' | 'en retard';
    dateDue?: string;
    created_at?: string;
}

export interface Fournisseur {
    id: number;
    code: string;
    nom: string;
    address?: string;
    ice?: string;
    tel?: string;
    created_at?: string;
}

export interface SupplierInvoice {
    id: number;
    reference: string;
    fournisseur: Fournisseur;
    totalHT: number;
    tva: number;
    totalTTC: number;
    dateIssue: string;
    dateDue?: string;
    status: 'brouillon' | 'payé' | 'en retard';
    filePath?: string;
    notes?: string;
    created_at?: string;
}

export interface Alert {
    id: number;
    type: 'client' | 'fournisseur';
    numero: string;
    nom_tiers: string;
    date_due: string;
    status: string;
    totalTTC: number;
    isOverdue: boolean;
    daysUntilDue: number;
}

export interface ElectronAPI {
    getCompanyInfo: () => Promise<CompanyInfo>;
    updateCompanyInfo: (data: CompanyInfo) => Promise<any>;

    getClients: () => Promise<Client[]>;
    createClient: (client: Omit<Client, 'id'>) => Promise<Client>;
    updateClient: (client: Client) => Promise<Client>;
    deleteClient: (id: number) => Promise<{ success: boolean }>;

    getDevis: () => Promise<Devis[]>;
    createDevis: (devis: Omit<Devis, 'id'>) => Promise<Devis>;
    updateDevis: (devis: Devis) => Promise<Devis>;
    deleteDevis: (id: number) => Promise<{ success: boolean }>;

    getBonLivraison: () => Promise<BonLivraison[]>;
    createBonLivraison: (bl: Omit<BonLivraison, 'id'>) => Promise<BonLivraison>;
    updateBonLivraison: (bl: BonLivraison) => Promise<BonLivraison>;
    deleteBonLivraison: (id: number) => Promise<{ success: boolean }>;

    getFactures: () => Promise<Facture[]>;
    createFacture: (facture: Omit<Facture, 'id'>) => Promise<Facture>;
    updateFacture: (facture: Facture) => Promise<Facture>;
    deleteFacture: (id: number) => Promise<{ success: boolean }>;

    getFournisseurs: () => Promise<Fournisseur[]>;
    createFournisseur: (f: Omit<Fournisseur, 'id'>) => Promise<Fournisseur>;
    updateFournisseur: (f: Fournisseur) => Promise<Fournisseur>;
    deleteFournisseur: (id: number) => Promise<{ success: boolean }>;

    getSupplierInvoices: () => Promise<SupplierInvoice[]>;
    createSupplierInvoice: (inv: Omit<SupplierInvoice, 'id'>) => Promise<SupplierInvoice>;
    updateSupplierInvoice: (inv: SupplierInvoice) => Promise<SupplierInvoice>;
    deleteSupplierInvoice: (id: number) => Promise<{ success: boolean }>;

    uploadInvoiceFile: () => Promise<{ success: boolean; filePath?: string; filename?: string }>;
    openInvoiceFile: (relativePath: string) => Promise<{ success: boolean; error?: string }>;

    getAlerts: () => Promise<Alert[]>;

    savePDF: (data: { filename: string; pdfData: string }) => Promise<{ success: boolean; path?: string }>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}