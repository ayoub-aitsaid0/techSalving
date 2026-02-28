import React, { useState, useEffect } from 'react';
import { FileText, Package, Receipt, Users, Settings, BarChart3, Search, Plus, Printer, Eye, Edit, Trash2, Home, Download, Bell, Truck, AlertTriangle, Clock } from 'lucide-react';
import type { CompanyInfo, Client, Devis, BonLivraison, Facture, DevisItem, BLItem, FactureItem, Fournisseur, SupplierInvoice, Alert } from './types/electron';
import { generateDevisPDF, generateBLPDF, generateFacturePDF, blobToBase64 } from './utils/pdfGenerator';

// Vérifier si on est dans Electron ou en mode web
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<string>('home');
    const emptyClientForm: Omit<Client, 'id'> = { code: '', nom: '', address: '', ice: '' };
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        logo: '',
        name: 'TECH SALVING',
        address: "Adresse de l'entreprise",
        tp: '12345678',
        if_num: 'IF123456',
        rc: 'RC123456',
        ice: 'ICE123456789',
        tel: '+212 6XX XXX XXX',
        rib: 'RIB XXXXXXXXXXXXXXXXXX',
        email: 'contact@entreprise.ma'
    });
    const [clients, setClients] = useState<Client[]>([]);
    const [devis, setDevis] = useState<Devis[]>([]);
    const [bonLivraison, setBonLivraison] = useState<BonLivraison[]>([]);
    const [factures, setFactures] = useState<Facture[]>([]);
    const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
    const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [clientForm, setClientForm] = useState<Omit<Client, 'id'>>(emptyClientForm);
    const [editingClientId, setEditingClientId] = useState<number | null>(null);
    const [clientBusy, setClientBusy] = useState<boolean>(false);
    const [clientError, setClientError] = useState<string | null>(null);

    // Charger les données au démarrage (seulement si Electron)
    useEffect(() => {
        if (isElectron) {
            loadAllData();
        }
    }, []);

    const loadAllData = async () => {
        if (!isElectron || !window.electronAPI) return;
        try {
            setLoading(true);
            const [company, clientsData, devisData, blData, facturesData, fournisseursData, supplierInvData, alertsData] = await Promise.all([
                window.electronAPI.getCompanyInfo(),
                window.electronAPI.getClients(),
                window.electronAPI.getDevis(),
                window.electronAPI.getBonLivraison(),
                window.electronAPI.getFactures(),
                window.electronAPI.getFournisseurs(),
                window.electronAPI.getSupplierInvoices(),
                window.electronAPI.getAlerts(),
            ]);
            setCompanyInfo(company);
            setClients(clientsData);
            setDevis(devisData);
            setBonLivraison(blData);
            setFactures(facturesData);
            setFournisseurs(fournisseursData);
            setSupplierInvoices(supplierInvData);
            setAlerts(alertsData);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintDevis = async (doc: Devis) => {
        try {
            const blob = generateDevisPDF(doc, companyInfo);
            if (isElectron && window.electronAPI) {
                const base64 = await blobToBase64(blob);
                const result = await window.electronAPI.savePDF({ filename: `Devis_${doc.numero.replaceAll('/', '-')}.pdf`, pdfData: base64 });
                if (result.success && result.path) alert(`PDF sauvegardé : ${result.path}`);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `Devis_${doc.numero.replaceAll('/', '-')}.pdf`; a.click();
            }
        } catch (e) {
            console.error('Erreur PDF:', e); alert('Erreur génération PDF');
        }
    };

    const handlePrintBL = async (doc: BonLivraison) => {
        try {
            const blob = generateBLPDF(doc, companyInfo);
            if (isElectron && window.electronAPI) {
                const base64 = await blobToBase64(blob);
                const result = await window.electronAPI.savePDF({ filename: `BL_${doc.numero.replaceAll('/', '-')}.pdf`, pdfData: base64 });
                if (result.success && result.path) alert(`PDF sauvegardé : ${result.path}`);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `BL_${doc.numero.replaceAll('/', '-')}.pdf`; a.click();
            }
        } catch (e) {
            console.error('Erreur PDF:', e); alert('Erreur génération PDF');
        }
    };

    const handlePrintFacture = async (doc: Facture) => {
        try {
            const blob = generateFacturePDF(doc, companyInfo);
            if (isElectron && window.electronAPI) {
                const base64 = await blobToBase64(blob);
                const result = await window.electronAPI.savePDF({ filename: `Facture_${doc.numero.replaceAll('/', '-')}.pdf`, pdfData: base64 });
                if (result.success && result.path) alert(`PDF sauvegardé : ${result.path}`);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `Facture_${doc.numero.replaceAll('/', '-')}.pdf`; a.click();
            }
        } catch (e) {
            console.error('Erreur PDF:', e); alert('Erreur génération PDF');
        }
    };

    const refreshClients = async () => {
        if (!isElectron || !window.electronAPI) return;
        const clientsData = await window.electronAPI.getClients();
        setClients(clientsData);
    };

    const resetClientForm = () => {
        setClientForm(emptyClientForm);
        setEditingClientId(null);
        setClientError(null);
    };

    const saveClient = async () => {
        const payload = {
            code: clientForm.code.trim(),
            nom: clientForm.nom.trim(),
            address: clientForm.address.trim(),
            ice: clientForm.ice.trim()
        };

        if (!payload.code || !payload.nom) {
            setClientError('Le code et le nom sont obligatoires.');
            return;
        }

        setClientBusy(true);
        setClientError(null);
        try {
            if (isElectron && window.electronAPI) {
                if (editingClientId) {
                    await window.electronAPI.updateClient({ id: editingClientId, ...payload });
                } else {
                    await window.electronAPI.createClient(payload);
                }
                await refreshClients();
            } else {
                if (editingClientId) {
                    setClients(prev =>
                        prev.map(client =>
                            client.id === editingClientId ? { id: editingClientId, ...payload } : client
                        )
                    );
                } else {
                    const newClient: Client = { id: Date.now(), ...payload };
                    setClients(prev => [...prev, newClient]);
                }
            }

            resetClientForm();
        } catch (error) {
            console.error('Erreur sauvegarde client:', error);
            setClientError('Erreur lors de la sauvegarde du client.');
        } finally {
            setClientBusy(false);
        }
    };

    const startEditClient = (client: Client) => {
        setClientForm({
            code: client.code,
            nom: client.nom,
            address: client.address || '',
            ice: client.ice || ''
        });
        setEditingClientId(client.id);
        setClientError(null);
    };

    const deleteClient = async (client: Client) => {
        const shouldDelete = window.confirm(`Supprimer le client "${client.nom}" ?`);
        if (!shouldDelete) return;

        setClientBusy(true);
        setClientError(null);
        try {
            if (isElectron && window.electronAPI) {
                await window.electronAPI.deleteClient(client.id);
                await refreshClients();
            } else {
                setClients(prev => prev.filter(item => item.id !== client.id));
            }
        } catch (error) {
            console.error('Erreur suppression client:', error);
            setClientError('Erreur lors de la suppression du client.');
        } finally {
            setClientBusy(false);
        }
    };

    // Générer le prochain numéro
    const getNextNumero = (type: string, list: Array<{ numero: string }>) => {
        const year = new Date().getFullYear();
        const yearDocs = list.filter(d => d.numero.includes(`/${year}`));
        const nextNum = yearDocs.length + 1;
        return `${String(nextNum).padStart(4, '0')}/${year}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    // Navigation
    const NavBar: React.FC = () => (
        <div className="bg-blue-900 text-white p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">Gestion Documents</h1>
                <nav className="flex gap-2 flex-wrap">
                    <NavItem icon={<Home size={18} />} label="Accueil" page="home" />
                    <NavItem icon={<FileText size={18} />} label="Devis" page="devis" />
                    <NavItem icon={<Package size={18} />} label="BL" page="bl" />
                    <NavItem icon={<Receipt size={18} />} label="Factures" page="factures" />
                    <NavItem icon={<Users size={18} />} label="Clients" page="clients" />
                    <NavItem icon={<Truck size={18} />} label="Fournisseurs" page="fournisseurs" />
                    <NavItem icon={<Bell size={18} />} label="Fact. Fourn." page="factures-fournisseurs" />
                    <NavItem icon={<Settings size={18} />} label="Paramètres" page="settings" />
                </nav>
            </div>
        </div>
    );

    interface NavItemProps {
        icon: React.ReactNode;
        label: string;
        page: string;
    }

    const NavItem: React.FC<NavItemProps> = ({ icon, label, page }) => (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${currentPage === page ? 'bg-blue-700' : 'hover:bg-blue-800'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    // Page d'accueil avec Dashboard enrichi
    const HomePage: React.FC = () => {
        const currentYear = new Date().getFullYear();

        // Calculs détaillés
        const statsDevis = {
            total: devis.length,
            year: devis.filter(d => d.numero.includes(`/${currentYear}`)).length,
            totalMontant: devis.reduce((sum, d) => sum + d.totalTTC, 0)
        };

        const statsBL = {
            total: bonLivraison.length,
            year: bonLivraison.filter(b => b.numero.includes(`/${currentYear}`)).length
        };

        const statsFactures = {
            total: factures.length,
            year: factures.filter(f => f.numero.includes(`/${currentYear}`)).length,
            totalMontant: factures.reduce((sum, f) => sum + f.totalTTC, 0)
        };

        const activeClients = clients.length;

        const overdueAlerts = alerts.filter(a => a.isOverdue);
        const soonAlerts = alerts.filter(a => !a.isOverdue);

        return (
            <div className="min-h-screen bg-gray-50 p-6 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tableau de bord</h2>
                        <p className="text-sm text-gray-500 mt-1">Gérez vos activités et suivez vos performances annuelles ({currentYear}).</p>
                    </div>
                </div>

                {/* Alertes échéances avec UI modernisée */}
                {alerts.length > 0 && (
                    <div className="mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold mb-5 flex items-center gap-2 text-gray-800">
                            <span className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle size={20} /></span>
                            Alertes Échéances
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {overdueAlerts.map(a => (
                                <div key={`${a.type}-${a.id}`} className="relative overflow-hidden bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-xl p-5 flex justify-between items-center transition-all hover:shadow-md">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-xl"></div>
                                    <div className="ml-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-red-700 text-sm tracking-wide">⚠️ EN RETARD</span>
                                            <span className="text-xs bg-white border border-red-200 text-red-800 px-2.5 py-0.5 rounded-full shadow-sm font-medium">{a.type === 'client' ? 'Facture Client' : 'Fact. Fournisseur'}</span>
                                        </div>
                                        <p className="font-semibold text-gray-900 text-lg">{a.numero} — <span className="font-medium text-gray-600">{a.nom_tiers}</span></p>
                                        <p className="text-sm text-red-600 flex items-center gap-1.5 mt-1 font-medium"><Clock size={14} /> Échue le {new Date(a.date_due).toLocaleDateString('fr-FR')} (Retard: {Math.abs(a.daysUntilDue)} j)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-2xl text-red-700">{a.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">DH</span></p>
                                    </div>
                                </div>
                            ))}
                            {soonAlerts.map(a => (
                                <div key={`${a.type}-${a.id}`} className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-white border border-amber-200 rounded-xl p-5 flex justify-between items-center transition-all hover:shadow-md">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-xl"></div>
                                    <div className="ml-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-amber-700 text-sm tracking-wide">🔔 BIENTÔT DUE</span>
                                            <span className="text-xs bg-white border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full shadow-sm font-medium">{a.type === 'client' ? 'Facture Client' : 'Fact. Fournisseur'}</span>
                                        </div>
                                        <p className="font-semibold text-gray-900 text-lg">{a.numero} — <span className="font-medium text-gray-600">{a.nom_tiers}</span></p>
                                        <p className="text-sm text-amber-600 flex items-center gap-1.5 mt-1 font-medium"><Clock size={14} /> Échéance: {new Date(a.date_due).toLocaleDateString('fr-FR')} (dans {a.daysUntilDue} j)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-2xl text-amber-700">{a.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">DH</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dashboard Stats Consolidaded */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {/* Stat Devis */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl">
                                <FileText size={24} strokeWidth={2.5} />
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{currentYear}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Devis validés</h3>
                        <p className="text-4xl font-extrabold text-gray-900 mt-2">{statsDevis.year}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-gray-500">Chiffre total</span>
                                <span className="font-bold text-blue-600">{statsDevis.totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                            </div>
                        </div>
                    </div>

                    {/* Stat BL */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl">
                                <Package size={24} strokeWidth={2.5} />
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">{currentYear}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Bons de livraison</h3>
                        <p className="text-4xl font-extrabold text-gray-900 mt-2">{statsBL.year}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-gray-500">Total historique</span>
                                <span className="font-bold text-emerald-600">{statsBL.total} docs</span>
                            </div>
                        </div>
                    </div>

                    {/* Stat Factures */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-purple-50 text-purple-600 p-3.5 rounded-xl">
                                <Receipt size={24} strokeWidth={2.5} />
                            </div>
                            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">{currentYear}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Factures émises</h3>
                        <p className="text-4xl font-extrabold text-gray-900 mt-2">{statsFactures.year}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-gray-500">CA Facturé</span>
                                <span className="font-bold text-purple-600">{statsFactures.totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                            </div>
                        </div>
                    </div>

                    {/* Stat Clients */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-orange-50 text-orange-600 p-3.5 rounded-xl">
                                <Users size={24} strokeWidth={2.5} />
                            </div>
                            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">Global</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Clients enregistrés</h3>
                        <p className="text-4xl font-extrabold text-gray-900 mt-2">{activeClients}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-gray-500">Fournisseurs</span>
                                <span className="font-bold text-orange-600">{fournisseurs.length} actifs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions rapides améliorées */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h3 className="text-xl font-bold mb-6 text-gray-800">Actions rapides</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickAction label="Créer Devis" icon={<FileText size={22} />} onClick={() => setCurrentPage('devis')} color="blue" />
                        <QuickAction label="Créer BL" icon={<Package size={22} />} onClick={() => setCurrentPage('bl')} color="green" />
                        <QuickAction label="Créer Facture" icon={<Receipt size={22} />} onClick={() => setCurrentPage('factures')} color="purple" />
                        <QuickAction label="Saisir Achat" icon={<Truck size={22} />} onClick={() => setCurrentPage('factures-fournisseurs')} color="orange" />
                    </div>
                </div>
            </div>
        );
    };

    interface QuickActionProps {
        label: string;
        icon: React.ReactNode;
        onClick: () => void;
        color: 'blue' | 'green' | 'purple' | 'orange';
    }

    const QuickAction: React.FC<QuickActionProps> = ({ label, icon, onClick, color }) => {
        const styles = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white',
            green: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white',
            purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white',
            orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-600 hover:text-white'
        };

        return (
            <button
                onClick={onClick}
                className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md ${styles[color]} group`}
            >
                <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <span className="font-semibold text-sm">{label}</span>
            </button>
        );
    };

    // Gestion des clients
    const ClientsPage = () => {
        const [showForm, setShowForm] = useState(false);
        const [editingClient, setEditingClient] = useState<Client | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const filteredClients = clients.filter(c =>
            c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleSaveClient = async (formData: Omit<Client, 'id'>) => {
            if (!formData.code.trim() || !formData.nom.trim()) {
                setError('Le code et le nom sont obligatoires.');
                return;
            }
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    if (editingClient) {
                        await window.electronAPI.updateClient({ id: editingClient.id, ...formData });
                    } else {
                        await window.electronAPI.createClient(formData);
                    }
                    // Reload from DB so list is always in sync
                    const updated = await window.electronAPI.getClients();
                    setClients(updated);
                } else {
                    if (editingClient) {
                        setClients(prev => prev.map(c => c.id === editingClient.id ? { id: editingClient.id, ...formData } : c));
                    } else {
                        setClients(prev => [...prev, { id: Date.now(), ...formData }]);
                    }
                }
                setShowForm(false);
                setEditingClient(null);
            } catch (err) {
                setError('Erreur lors de la sauvegarde du client.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        const handleDeleteClient = async (client: Client) => {
            if (!confirm(`Supprimer le client "${client.nom}" ?`)) return;
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    await window.electronAPI.deleteClient(client.id);
                    const updated = await window.electronAPI.getClients();
                    setClients(updated);
                } else {
                    setClients(prev => prev.filter(c => c.id !== client.id));
                }
            } catch (err) {
                setError('Erreur lors de la suppression du client.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Gestion des Clients</h2>
                    <button
                        onClick={() => { setEditingClient(null); setError(null); setShowForm(true); }}
                        disabled={busy}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Plus size={20} />
                        Nouveau Client
                    </button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                </div>

                {showForm && (
                    <ClientForm
                        client={editingClient}
                        onSave={handleSaveClient}
                        onCancel={() => { setShowForm(false); setEditingClient(null); setError(null); }}
                    />
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ICE</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredClients.map(client => (
                                <tr key={client.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{client.code}</td>
                                    <td className="px-6 py-4">{client.nom}</td>
                                    <td className="px-6 py-4">{client.ice}</td>
                                    <td className="px-6 py-4">{client.address}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingClient(client); setError(null); setShowForm(true); }}
                                                disabled={busy}
                                                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClient(client)}
                                                disabled={busy}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ClientForm = ({ client, onSave, onCancel }: { client: Client | null; onSave: (data: Omit<Client, 'id'>) => void; onCancel: () => void }) => {
        const [formData, setFormData] = useState<Omit<Client, 'id'>>({
            code: client?.code || '',
            nom: client?.nom || '',
            address: client?.address || '',
            ice: client?.ice || ''
        });

        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">
                    {client ? 'Modifier le client' : 'Nouveau client'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Code Client *</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nom *</label>
                        <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ICE</label>
                        <input
                            type="text"
                            value={formData.ice}
                            onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Adresse</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onSave(formData)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Enregistrer
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        );
    };

    // Gestion des Devis
    const DevisPage = () => {
        const [showForm, setShowForm] = useState(false);
        const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [viewDevis, setViewDevis] = useState<Devis | null>(null);
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const filteredDevis = devis.filter(d =>
            d.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.client.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleSaveDevis = async (newDevis: Omit<Devis, 'id'> & { id?: number }) => {
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    if (editingDevis) {
                        await window.electronAPI.updateDevis({ ...newDevis, id: editingDevis.id } as Devis);
                    } else {
                        await window.electronAPI.createDevis(newDevis);
                    }
                    // Reload from DB
                    const updated = await window.electronAPI.getDevis();
                    setDevis(updated);
                } else {
                    if (editingDevis) {
                        setDevis(prev => prev.map(d => d.id === editingDevis.id ? { ...newDevis, id: editingDevis.id } as Devis : d));
                    } else {
                        setDevis(prev => [...prev, { ...newDevis, id: Date.now() } as Devis]);
                    }
                }
                setShowForm(false);
                setEditingDevis(null);
            } catch (err) {
                setError('Erreur lors de la sauvegarde du devis.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        const handleDeleteDevis = async (dv: Devis) => {
            if (!confirm('Supprimer ce devis ?')) return;
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    await window.electronAPI.deleteDevis(dv.id);
                    const updated = await window.electronAPI.getDevis();
                    setDevis(updated);
                } else {
                    setDevis(prev => prev.filter(d => d.id !== dv.id));
                }
            } catch (err) {
                setError('Erreur lors de la suppression du devis.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Gestion des Devis</h2>
                    <button
                        onClick={() => { setEditingDevis(null); setError(null); setShowForm(true); }}
                        disabled={busy}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Plus size={20} />
                        Nouveau Devis
                    </button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un devis..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                </div>

                {showForm && (
                    <DevisForm
                        devis={editingDevis}
                        clients={clients}
                        nextNumero={getNextNumero('devis', devis)}
                        onSave={handleSaveDevis}
                        onCancel={() => { setShowForm(false); setEditingDevis(null); }}
                    />
                )}

                {viewDevis && (
                    <DevisPreview
                        devis={viewDevis}
                        companyInfo={companyInfo}
                        onClose={() => setViewDevis(null)}
                    />
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Devis</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredDevis.map(dv => (
                                <tr key={dv.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{dv.numero}</td>
                                    <td className="px-6 py-4">{new Date(dv.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4">{dv.client.nom}</td>
                                    <td className="px-6 py-4 font-semibold">{dv.totalTTC.toFixed(2)} DH</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewDevis(dv)}
                                                className="text-green-600 hover:text-green-800"
                                                title="Aperçu"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingDevis(dv); setError(null); setShowForm(true); }}
                                                disabled={busy}
                                                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                title="Modifier"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handlePrintDevis(dv)}
                                                className="text-purple-600 hover:text-purple-800"
                                                title="Imprimer PDF"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDevis(dv)}
                                                disabled={busy}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const DevisForm = ({ devis, clients, nextNumero, onSave, onCancel }) => {
        const [formData, setFormData] = useState(devis || {
            numero: nextNumero,
            date: new Date().toISOString().split('T')[0],
            clientId: '',
            items: [{ designation: '', quantite: 1, prixUnitaire: 0 }]
        });

        const addItem = () => {
            setFormData({
                ...formData,
                items: [...formData.items, { designation: '', quantite: 1, prixUnitaire: 0 }]
            });
        };

        const removeItem = (index) => {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        };

        const updateItem = (index, field, value) => {
            const newItems = [...formData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            setFormData({ ...formData, items: newItems });
        };

        const calculateTotals = () => {
            const totalHT = formData.items.reduce((sum, item) =>
                sum + (item.quantite * item.prixUnitaire), 0
            );
            const tva = totalHT * 0.20;
            const totalTTC = totalHT + tva;
            return { totalHT, tva, totalTTC };
        };

        const handleSave = () => {
            const client = clients.find(c => c.id === parseInt(formData.clientId));
            if (!client) {
                alert('Veuillez sélectionner un client');
                return;
            }
            const { totalHT, tva, totalTTC } = calculateTotals();
            onSave({
                ...formData,
                client,
                totalHT,
                tva,
                totalTTC
            });
        };

        const { totalHT, tva, totalTTC } = calculateTotals();

        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">
                    {devis ? 'Modifier le devis' : 'Nouveau devis'}
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">N° Devis</label>
                        <input
                            type="text"
                            value={formData.numero}
                            disabled
                            className="w-full border rounded px-3 py-2 bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Client *</label>
                        <select
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Sélectionner un client</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.code} - {client.nom}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Articles</h4>
                        <button
                            onClick={addItem}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                            <Plus size={16} />
                            Ajouter
                        </button>
                    </div>

                    <div className="border rounded">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm">Désignation</th>
                                    <th className="px-4 py-2 text-left text-sm w-24">Quantité</th>
                                    <th className="px-4 py-2 text-left text-sm w-32">Prix Unit. (DH)</th>
                                    <th className="px-4 py-2 text-left text-sm w-32">Total HT (DH)</th>
                                    <th className="px-4 py-2 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.designation}
                                                onChange={(e) => updateItem(index, 'designation', e.target.value)}
                                                className="w-full border rounded px-2 py-1"
                                                placeholder="Désignation"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                value={item.quantite}
                                                onChange={(e) => updateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-2 py-1"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                value={item.prixUnitaire}
                                                onChange={(e) => updateItem(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-2 py-1"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-semibold">
                                            {(item.quantite * item.prixUnitaire).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2">
                                            {formData.items.length > 1 && (
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-gray-50 rounded p-4 mb-4">
                    <div className="flex justify-end">
                        <div className="w-64">
                            <div className="flex justify-between mb-2">
                                <span className="font-medium">Total HT:</span>
                                <span className="font-bold">{totalHT.toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="font-medium">TVA (20%):</span>
                                <span className="font-bold">{tva.toFixed(2)} DH</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="font-bold">Total TTC:</span>
                                <span className="font-bold text-lg text-blue-600">{totalTTC.toFixed(2)} DH</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Enregistrer
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        );
    };

    const DevisPreview = ({ devis, companyInfo, onClose }) => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 className="text-xl font-bold">Aperçu du Devis {devis.numero}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-8">
                        {/* En-tête */}
                        <div className="flex justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-blue-900">{companyInfo.name}</h1>
                                <p className="text-sm mt-2">{companyInfo.address}</p>
                                <p className="text-sm">TP: {companyInfo.tp}</p>
                                <p className="text-sm">IF: {companyInfo.if_num}</p>
                                <p className="text-sm">RC: {companyInfo.rc}</p>
                                <p className="text-sm">ICE: {companyInfo.ice}</p>
                                <p className="text-sm">Tél: {companyInfo.tel}</p>
                                <p className="text-sm">Email: {companyInfo.email}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-blue-900">DEVIS</h2>
                                <p className="text-lg font-semibold mt-2">N° {devis.numero}</p>
                                <p className="text-sm">Date: {new Date(devis.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>

                        {/* Info client */}
                        <div className="mb-8 border-l-4 border-blue-600 pl-4">
                            <h3 className="font-bold mb-2">Client:</h3>
                            <p className="font-semibold">{devis.client.nom}</p>
                            <p className="text-sm">{devis.client.address}</p>
                            <p className="text-sm">ICE: {devis.client.ice}</p>
                        </div>

                        {/* Tableau des articles */}
                        <table className="w-full mb-6 border">
                            <thead className="bg-blue-900 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left">Désignations</th>
                                    <th className="px-4 py-3 text-center w-24">Quantité</th>
                                    <th className="px-4 py-3 text-right w-32">Prix Unitaire</th>
                                    <th className="px-4 py-3 text-right w-32">Prix Total HT (DH)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devis.items.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="px-4 py-3">{item.designation}</td>
                                        <td className="px-4 py-3 text-center">{item.quantite}</td>
                                        <td className="px-4 py-3 text-right">{item.prixUnitaire.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {(item.quantite * item.prixUnitaire).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totaux */}
                        <div className="flex justify-end mb-8">
                            <div className="w-80">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="font-semibold">TOTAL HT : (DH)</span>
                                    <span className="font-bold">{devis.totalHT.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="font-semibold">TVA (20%) :</span>
                                    <span className="font-bold">{devis.tva.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-3 bg-blue-50 px-4 rounded">
                                    <span className="font-bold text-lg">TOTAL TTC : (DH)</span>
                                    <span className="font-bold text-lg text-blue-900">{devis.totalTTC.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-12 pt-6 border-t">
                            <p className="text-sm text-gray-600">RIB: {companyInfo.rib}</p>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-2">
                        <button
                            onClick={() => handlePrintDevis(devis)}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                        >
                            <Download size={20} />
                            Télécharger PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 1. BON DE LIVRAISON - PAGE
    const BLPage: React.FC = () => {
        const [showForm, setShowForm] = useState(false);
        const [editingBL, setEditingBL] = useState<BonLivraison | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [viewBL, setViewBL] = useState<BonLivraison | null>(null);

        const filteredBL = bonLivraison.filter(b =>
            b.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.client.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleSaveBL = async (newBL: Omit<BonLivraison, 'id'>) => {
            if (!isElectron) {
                if (editingBL) {
                    setBonLivraison(bonLivraison.map(b => b.id === editingBL.id ? { ...newBL, id: editingBL.id } : b));
                } else {
                    setBonLivraison([...bonLivraison, { ...newBL, id: Date.now() }]);
                }
                setShowForm(false);
                setEditingBL(null);
                return;
            }
            try {
                if (editingBL && window.electronAPI) {
                    const updated = await window.electronAPI.updateBonLivraison({ ...newBL, id: editingBL.id });
                    setBonLivraison(bonLivraison.map(b => b.id === updated.id ? updated : b));
                } else if (window.electronAPI) {
                    const created = await window.electronAPI.createBonLivraison(newBL);
                    setBonLivraison([...bonLivraison, created]);
                }
                setShowForm(false);
                setEditingBL(null);
            } catch (error) {
                alert('Erreur: ' + (error as Error).message);
            }
        };

        const handleDeleteBL = async (id: number) => {
            if (confirm('Supprimer ce bon de livraison ?')) {
                if (!isElectron) {
                    setBonLivraison(bonLivraison.filter(b => b.id !== id));
                    return;
                }
                try {
                    if (window.electronAPI) {
                        await window.electronAPI.deleteBonLivraison(id);
                        setBonLivraison(bonLivraison.filter(b => b.id !== id));
                    }
                } catch (error) {
                    alert('Erreur: ' + (error as Error).message);
                }
            }
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Gestion des Bons de Livraison</h2>
                    <button onClick={() => { setEditingBL(null); setShowForm(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                        <Plus size={20} />Nouveau BL
                    </button>
                </div>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                    </div>
                </div>
                {showForm && <BLForm bl={editingBL} clients={clients} nextNumero={getNextNumero('bl', bonLivraison)} onSave={handleSaveBL} onCancel={() => { setShowForm(false); setEditingBL(null); }} />}
                {viewBL && <BLPreview bl={viewBL} companyInfo={companyInfo} onClose={() => setViewBL(null)} />}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° BL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Devis</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredBL.map(bl => (
                                <tr key={bl.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{bl.numero}</td>
                                    <td className="px-6 py-4">{new Date(bl.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4">{bl.client.nom}</td>
                                    <td className="px-6 py-4">{bl.numeroDevis || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => setViewBL(bl)} className="text-green-600 hover:text-green-800"><Eye size={18} /></button>
                                            <button onClick={() => { setEditingBL(bl); setShowForm(true); }} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
                                            <button onClick={() => handlePrintBL(bl)} className="text-purple-600 hover:text-purple-800"><Printer size={18} /></button>
                                            <button onClick={() => handleDeleteBL(bl.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div >
        );
    };

    // 2. BON DE LIVRAISON - FORMULAIRE
    interface BLFormProps {
        bl: BonLivraison | null;
        clients: Client[];
        nextNumero: string;
        onSave: (bl: Omit<BonLivraison, 'id'>) => void;
        onCancel: () => void;
    }

    const BLForm: React.FC<BLFormProps> = ({ bl, clients, nextNumero, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            numero: bl?.numero || nextNumero,
            date: bl?.date || new Date().toISOString().split('T')[0],
            clientId: bl?.client.id.toString() || '',
            numeroDevis: bl?.numeroDevis || '',
            items: bl?.items || [{ designation: '', quantite: 1, remarque: '' }]
        });

        const addItem = () => setFormData({ ...formData, items: [...formData.items, { designation: '', quantite: 1, remarque: '' }] });
        const removeItem = (index: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
        const updateItem = (index: number, field: keyof BLItem, value: string | number) => {
            const newItems = [...formData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            setFormData({ ...formData, items: newItems });
        };

        const handleSave = () => {
            const client = clients.find(c => c.id === parseInt(formData.clientId));
            if (!client) { alert('Sélectionner un client'); return; }
            onSave({ numero: formData.numero, date: formData.date, client, numeroDevis: formData.numeroDevis, items: formData.items });
        };

        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">{bl ? 'Modifier' : 'Nouveau'} bon de livraison</h3>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div><label className="block text-sm font-medium mb-1">N° BL</label><input type="text" value={formData.numero} disabled className="w-full border rounded px-3 py-2 bg-gray-100" /></div>
                    <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                    <div><label className="block text-sm font-medium mb-1">Client *</label><select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="w-full border rounded px-3 py-2"><option value="">Sélectionner</option>{clients.map(c => <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">N° Devis</label><input type="text" value={formData.numeroDevis} onChange={(e) => setFormData({ ...formData, numeroDevis: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="0001/2026" /></div>
                </div>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2"><h4 className="font-semibold">Articles</h4><button onClick={addItem} className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Plus size={16} />Ajouter</button></div>
                    <div className="border rounded"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-sm">Désignation</th><th className="px-4 py-2 text-left text-sm w-24">Quantité</th><th className="px-4 py-2 text-left text-sm w-64">Remarque</th><th className="px-4 py-2 w-16"></th></tr></thead><tbody>{formData.items.map((item, idx) => <tr key={idx} className="border-t"><td className="px-4 py-2"><input type="text" value={item.designation} onChange={(e) => updateItem(idx, 'designation', e.target.value)} className="w-full border rounded px-2 py-1" /></td><td className="px-4 py-2"><input type="number" value={item.quantite} onChange={(e) => updateItem(idx, 'quantite', parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" min="0" /></td><td className="px-4 py-2"><input type="text" value={item.remarque} onChange={(e) => updateItem(idx, 'remarque', e.target.value)} className="w-full border rounded px-2 py-1" /></td><td className="px-4 py-2">{formData.items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>}</td></tr>)}</tbody></table></div>
                </div>
                <div className="flex gap-2"><button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Enregistrer</button><button onClick={onCancel} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">Annuler</button></div>
            </div>
        );
    };

    // 3. BON DE LIVRAISON - APERÇU
    interface BLPreviewProps { bl: BonLivraison; companyInfo: CompanyInfo; onClose: () => void; }
    const BLPreview: React.FC<BLPreviewProps> = ({ bl, companyInfo, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"><h3 className="text-xl font-bold">Aperçu BL {bl.numero}</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button></div>
                <div className="p-8">
                    <div className="flex justify-between mb-8"><div><h1 className="text-3xl font-bold text-green-900">{companyInfo.name}</h1><p className="text-sm mt-2">{companyInfo.address}</p><p className="text-sm">TP: {companyInfo.tp}</p><p className="text-sm">IF: {companyInfo.if_num}</p><p className="text-sm">RC: {companyInfo.rc}</p><p className="text-sm">ICE: {companyInfo.ice}</p><p className="text-sm">Tél: {companyInfo.tel}</p><p className="text-sm">Email: {companyInfo.email}</p></div><div className="text-right"><h2 className="text-2xl font-bold text-green-900">BON DE LIVRAISON</h2><p className="text-lg font-semibold mt-2">N° {bl.numero}</p><p className="text-sm">Date: {new Date(bl.date).toLocaleDateString('fr-FR')}</p>{bl.numeroDevis && <p className="text-sm mt-2">Devis N°: {bl.numeroDevis}</p>}</div></div>
                    <div className="mb-8 border-l-4 border-green-600 pl-4"><h3 className="font-bold mb-2">Client:</h3><p className="font-semibold">{bl.client.nom}</p><p className="text-sm">{bl.client.address}</p><p className="text-sm">ICE: {bl.client.ice}</p></div>
                    <table className="w-full mb-6 border"><thead className="bg-green-900 text-white"><tr><th className="px-4 py-3 text-left">Désignations</th><th className="px-4 py-3 text-center w-24">Quantité</th><th className="px-4 py-3 text-left w-64">Remarque</th></tr></thead><tbody>{bl.items.map((item, idx) => <tr key={idx} className="border-b"><td className="px-4 py-3">{item.designation}</td><td className="px-4 py-3 text-center">{item.quantite}</td><td className="px-4 py-3">{item.remarque}</td></tr>)}</tbody></table>
                    <div className="grid grid-cols-2 gap-8 mt-12"><div className="border-t pt-4"><p className="text-center font-semibold">Visa du Client</p></div><div className="border-t pt-4"><p className="text-center font-semibold">Visa du Fournisseur</p></div></div>
                </div>
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-2"><button onClick={() => handlePrintBL(bl)} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"><Download size={20} />Télécharger PDF</button><button onClick={onClose} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">Fermer</button></div>
            </div>
        </div>
    );

    const FacturesPage = () => {
        const [showForm, setShowForm] = useState(false);
        const [editingFacture, setEditingFacture] = useState<Facture | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [viewFacture, setViewFacture] = useState<Facture | null>(null);
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const filteredFactures = factures.filter(f =>
            f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.client.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleSaveFacture = async (newFacture: Omit<Facture, 'id'> & { id?: number }) => {
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    if (editingFacture) {
                        await window.electronAPI.updateFacture({ ...newFacture, id: editingFacture.id } as Facture);
                    } else {
                        await window.electronAPI.createFacture(newFacture);
                    }
                    // Reload from DB
                    const updated = await window.electronAPI.getFactures();
                    setFactures(updated);
                } else {
                    if (editingFacture) {
                        setFactures(prev => prev.map(f => f.id === editingFacture.id ? { ...newFacture, id: editingFacture.id } as Facture : f));
                    } else {
                        setFactures(prev => [...prev, { ...newFacture, id: Date.now() } as Facture]);
                    }
                }
                setShowForm(false);
                setEditingFacture(null);
            } catch (err) {
                setError('Erreur lors de la sauvegarde de la facture.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        const handleDeleteFacture = async (id: number) => {
            if (!confirm('Supprimer cette facture ?')) return;
            setBusy(true);
            setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    await window.electronAPI.deleteFacture(id);
                    const updated = await window.electronAPI.getFactures();
                    setFactures(updated);
                } else {
                    setFactures(prev => prev.filter(f => f.id !== id));
                }
            } catch (err) {
                setError('Erreur lors de la suppression de la facture.');
                console.error(err);
            } finally {
                setBusy(false);
            }
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Gestion des Factures</h2>
                    <button
                        onClick={() => { setEditingFacture(null); setError(null); setShowForm(true); }}
                        disabled={busy}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Plus size={20} />
                        Nouvelle Facture
                    </button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher une facture..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                </div>

                {showForm && (
                    <FactureForm
                        facture={editingFacture}
                        clients={clients}
                        devis={devis}
                        nextNumero={getNextNumero('facture', factures)}
                        onSave={handleSaveFacture}
                        onCancel={() => { setShowForm(false); setEditingFacture(null); }}
                    />
                )}

                {viewFacture && (
                    <FacturePreview
                        facture={viewFacture}
                        companyInfo={companyInfo}
                        onClose={() => setViewFacture(null)}
                    />
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Devis</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredFactures.map(facture => (
                                <tr key={facture.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{facture.numero}</td>
                                    <td className="px-6 py-4">{new Date(facture.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4">{facture.client.nom}</td>
                                    <td className="px-6 py-4">{facture.numeroDevis || '-'}</td>
                                    <td className="px-6 py-4 font-semibold">{facture.totalTTC.toFixed(2)} DH</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewFacture(facture)}
                                                className="text-green-600 hover:text-green-800"
                                                title="Aperçu"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingFacture(facture); setError(null); setShowForm(true); }}
                                                disabled={busy}
                                                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                title="Modifier"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handlePrintFacture(facture)}
                                                className="text-purple-600 hover:text-purple-800"
                                                title="Imprimer PDF"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFacture(facture.id)}
                                                disabled={busy}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // FACTURE - FORMULAIRE
    const FactureForm = ({ facture, clients, devis: devisList, nextNumero, onSave, onCancel }: {
        facture: Facture | null;
        clients: Client[];
        devis: Devis[];
        nextNumero: string;
        onSave: (f: Omit<Facture, 'id'> & { id?: number }) => void;
        onCancel: () => void;
    }) => {
        const [formData, setFormData] = useState({
            numero: facture?.numero || nextNumero,
            date: facture?.date || new Date().toISOString().split('T')[0],
            clientId: facture?.client.id.toString() || '',
            numeroDevis: facture?.numeroDevis || '',
            items: facture?.items || [{ designation: '', quantite: 1, prixUnitaire: 0 }] as FactureItem[]
        });

        const addItem = () => setFormData({ ...formData, items: [...formData.items, { designation: '', quantite: 1, prixUnitaire: 0 }] });
        const removeItem = (index: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
        const updateItem = (index: number, field: keyof FactureItem, value: string | number) => {
            const newItems = [...formData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            setFormData({ ...formData, items: newItems });
        };

        const calculateTotals = () => {
            const totalHT = formData.items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
            const tva = totalHT * 0.20;
            const totalTTC = totalHT + tva;
            return { totalHT, tva, totalTTC };
        };

        const handleSave = () => {
            const client = clients.find(c => c.id === parseInt(formData.clientId));
            if (!client) { alert('Veuillez sélectionner un client'); return; }
            const { totalHT, tva, totalTTC } = calculateTotals();
            onSave({ numero: formData.numero, date: formData.date, client, numeroDevis: formData.numeroDevis || undefined, items: formData.items, totalHT, tva, totalTTC });
        };

        const { totalHT, tva, totalTTC } = calculateTotals();

        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">{facture ? 'Modifier la facture' : 'Nouvelle facture'}</h3>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div><label className="block text-sm font-medium mb-1">N° Facture</label><input type="text" value={formData.numero} disabled className="w-full border rounded px-3 py-2 bg-gray-100" /></div>
                    <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                    <div><label className="block text-sm font-medium mb-1">Client *</label>
                        <select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="w-full border rounded px-3 py-2">
                            <option value="">Sélectionner</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">N° Devis (optionnel)</label><input type="text" value={formData.numeroDevis} onChange={(e) => setFormData({ ...formData, numeroDevis: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="0001/2026" /></div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Articles</h4>
                        <button onClick={addItem} className="bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Plus size={16} />Ajouter</button>
                    </div>
                    <div className="border rounded">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm">Désignation</th>
                                    <th className="px-4 py-2 text-left text-sm w-24">Quantité</th>
                                    <th className="px-4 py-2 text-left text-sm w-32">Prix Unit. (DH)</th>
                                    <th className="px-4 py-2 text-left text-sm w-32">Total HT (DH)</th>
                                    <th className="px-4 py-2 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                        <td className="px-4 py-2"><input type="text" value={item.designation} onChange={(e) => updateItem(idx, 'designation', e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Désignation" /></td>
                                        <td className="px-4 py-2"><input type="number" value={item.quantite} onChange={(e) => updateItem(idx, 'quantite', parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" min="0" /></td>
                                        <td className="px-4 py-2"><input type="number" value={item.prixUnitaire} onChange={(e) => updateItem(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" min="0" step="0.01" /></td>
                                        <td className="px-4 py-2 font-semibold">{(item.quantite * item.prixUnitaire).toFixed(2)}</td>
                                        <td className="px-4 py-2">{formData.items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-gray-50 rounded p-4 mb-4">
                    <div className="flex justify-end">
                        <div className="w-64">
                            <div className="flex justify-between mb-2"><span className="font-medium">Total HT:</span><span className="font-bold">{totalHT.toFixed(2)} DH</span></div>
                            <div className="flex justify-between mb-2"><span className="font-medium">TVA (20%):</span><span className="font-bold">{tva.toFixed(2)} DH</span></div>
                            <div className="flex justify-between border-t pt-2"><span className="font-bold">Total TTC:</span><span className="font-bold text-lg text-purple-600">{totalTTC.toFixed(2)} DH</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Enregistrer</button>
                    <button onClick={onCancel} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">Annuler</button>
                </div>
            </div>
        );
    };

    // FACTURE - APERÇU
    const FacturePreview = ({ facture, companyInfo, onClose }: { facture: Facture; companyInfo: CompanyInfo; onClose: () => void }) => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Aperçu Facture {facture.numero}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
                </div>
                <div className="p-8">
                    {/* En-tête */}
                    <div className="flex justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-purple-900">{companyInfo.name}</h1>
                            <p className="text-sm mt-2">{companyInfo.address}</p>
                            <p className="text-sm">TP: {companyInfo.tp}</p>
                            <p className="text-sm">IF: {companyInfo.if_num}</p>
                            <p className="text-sm">RC: {companyInfo.rc}</p>
                            <p className="text-sm">ICE: {companyInfo.ice}</p>
                            <p className="text-sm">Tél: {companyInfo.tel}</p>
                            <p className="text-sm">Email: {companyInfo.email}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-purple-900">FACTURE</h2>
                            <p className="text-lg font-semibold mt-2">N° {facture.numero}</p>
                            <p className="text-sm">Date: {new Date(facture.date).toLocaleDateString('fr-FR')}</p>
                            {facture.numeroDevis && <p className="text-sm mt-1">Réf. Devis N°: {facture.numeroDevis}</p>}
                        </div>
                    </div>
                    {/* Client */}
                    <div className="mb-8 border-l-4 border-purple-600 pl-4">
                        <h3 className="font-bold mb-2">Facturé à:</h3>
                        <p className="font-semibold">{facture.client.nom}</p>
                        <p className="text-sm">{facture.client.address}</p>
                        <p className="text-sm">ICE: {facture.client.ice}</p>
                    </div>
                    {/* Articles */}
                    <table className="w-full mb-6 border">
                        <thead className="bg-purple-900 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left">Désignations</th>
                                <th className="px-4 py-3 text-center w-24">Quantité</th>
                                <th className="px-4 py-3 text-right w-32">Prix Unitaire</th>
                                <th className="px-4 py-3 text-right w-32">Prix Total HT (DH)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {facture.items.map((item, idx) => (
                                <tr key={idx} className="border-b">
                                    <td className="px-4 py-3">{item.designation}</td>
                                    <td className="px-4 py-3 text-center">{item.quantite}</td>
                                    <td className="px-4 py-3 text-right">{item.prixUnitaire.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{(item.quantite * item.prixUnitaire).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Totaux */}
                    <div className="flex justify-end mb-8">
                        <div className="w-80">
                            <div className="flex justify-between py-2 border-b"><span className="font-semibold">TOTAL HT : (DH)</span><span className="font-bold">{facture.totalHT.toFixed(2)}</span></div>
                            <div className="flex justify-between py-2 border-b"><span className="font-semibold">TVA (20%) :</span><span className="font-bold">{facture.tva.toFixed(2)}</span></div>
                            <div className="flex justify-between py-3 bg-purple-50 px-4 rounded"><span className="font-bold text-lg">TOTAL TTC : (DH)</span><span className="font-bold text-lg text-purple-900">{facture.totalTTC.toFixed(2)}</span></div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t">
                        <p className="text-sm text-gray-600">RIB: {companyInfo.rib}</p>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-2">
                    <button onClick={() => handlePrintFacture(facture)} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700"><Download size={20} />Télécharger PDF</button>
                    <button onClick={onClose} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">Fermer</button>
                </div>
            </div>
        </div>
    );

    // Page Paramètres

    const SettingsPage = () => {
        const [settings, setSettings] = useState(companyInfo);
        const [saved, setSaved] = useState(false);
        const [saveError, setSaveError] = useState<string | null>(null);

        const handleSave = async () => {
            setSaveError(null);
            try {
                if (isElectron && window.electronAPI) {
                    await window.electronAPI.updateCompanyInfo(settings);
                    // Reload from DB to confirm
                    const fresh = await window.electronAPI.getCompanyInfo();
                    setCompanyInfo(fresh);
                    setSettings(fresh);
                } else {
                    setCompanyInfo(settings);
                }
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } catch (err) {
                setSaveError('Erreur lors de la sauvegarde des paramètres.');
                console.error(err);
            }
        };

        return (
            <div className="p-6">
                <h2 className="text-3xl font-bold mb-6">Paramètres de l'Entreprise</h2>

                <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
                    {saved && (
                        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
                            Paramètres enregistrés avec succès !
                        </div>
                    )}
                    {saveError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
                            {saveError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nom de l'entreprise *</label>
                            <input
                                type="text"
                                value={settings.name}
                                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Adresse *</label>
                            <input
                                type="text"
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">TP</label>
                                <input
                                    type="text"
                                    value={settings.tp}
                                    onChange={(e) => setSettings({ ...settings, tp: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">IF</label>
                                <input
                                    type="text"
                                    value={settings.if_num}
                                    onChange={(e) => setSettings({ ...settings, if_num: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">RC</label>
                                <input
                                    type="text"
                                    value={settings.rc}
                                    onChange={(e) => setSettings({ ...settings, rc: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ICE</label>
                                <input
                                    type="text"
                                    value={settings.ice}
                                    onChange={(e) => setSettings({ ...settings, ice: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Téléphone</label>
                                <input
                                    type="text"
                                    value={settings.tel}
                                    onChange={(e) => setSettings({ ...settings, tel: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">RIB</label>
                            <input
                                type="text"
                                value={settings.rib}
                                onChange={(e) => setSettings({ ...settings, rib: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                    >
                        Enregistrer les modifications
                    </button>
                </div>
            </div>
        );
    };



    // =============================================
    // PAGE FOURNISSEURS
    // =============================================
    const FournisseursPage = () => {
        const [showForm, setShowForm] = useState(false);
        const [editing, setEditing] = useState<Fournisseur | null>(null);
        const [formData, setFormData] = useState({ code: '', nom: '', address: '', ice: '', tel: '' });
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const reload = async () => { if (isElectron && window.electronAPI) setFournisseurs(await window.electronAPI.getFournisseurs()); };

        const handleSave = async () => {
            if (!formData.code.trim() || !formData.nom.trim()) { setError('Code et Nom sont obligatoires.'); return; }
            setBusy(true); setError(null);
            try {
                if (isElectron && window.electronAPI) {
                    if (editing) await window.electronAPI.updateFournisseur({ id: editing.id, ...formData });
                    else await window.electronAPI.createFournisseur(formData);
                    await reload();
                }
                setShowForm(false); setEditing(null); setFormData({ code: '', nom: '', address: '', ice: '', tel: '' });
            } catch { setError('Erreur lors de la sauvegarde.'); }
            finally { setBusy(false); }
        };

        const handleDelete = async (f: Fournisseur) => {
            if (!window.confirm(`Supprimer "${f.nom}" ?`)) return;
            if (isElectron && window.electronAPI) { await window.electronAPI.deleteFournisseur(f.id); await reload(); }
        };

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Fournisseurs</h2>
                    <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ code: '', nom: '', address: '', ice: '', tel: '' }); }} className="bg-orange-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={20} />Nouveau Fournisseur</button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-xl font-bold mb-4">{editing ? 'Modifier' : 'Nouveau'} Fournisseur</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm font-medium mb-1">Code *</label><input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Nom *</label><input type="text" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Adresse</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">ICE</label><input type="text" value={formData.ice} onChange={e => setFormData({ ...formData, ice: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Téléphone</label><input type="text" value={formData.tel} onChange={e => setFormData({ ...formData, tel: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} disabled={busy} className="bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Annuler</button>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">ICE</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Tél</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {fournisseurs.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono">{f.code}</td>
                                    <td className="px-6 py-4 font-semibold">{f.nom}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{f.ice || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{f.tel || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditing(f); setFormData({ code: f.code, nom: f.nom, address: f.address || '', ice: f.ice || '', tel: f.tel || '' }); setShowForm(true); }} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(f)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {fournisseurs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Aucun fournisseur</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // =============================================
    // PAGE FACTURES FOURNISSEURS
    // =============================================
    const FacturesFournisseursPage = () => {
        const [showForm, setShowForm] = useState(false);
        const [editing, setEditing] = useState<SupplierInvoice | null>(null);
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [searchTerm, setSearchTerm] = useState('');

        const reload = async () => {
            if (!isElectron || !window.electronAPI) return;
            const [invs, alerts] = await Promise.all([window.electronAPI.getSupplierInvoices(), window.electronAPI.getAlerts()]);
            setSupplierInvoices(invs); setAlerts(alerts);
        };

        const emptyForm = { fournisseurId: '', reference: '', dateIssue: new Date().toISOString().split('T')[0], dateDue: '', totalHT: 0, tva: 0, totalTTC: 0, status: 'brouillon' as const, filePath: '', notes: '' };
        const [formData, setFormData] = useState(emptyForm);

        const updateTotals = (ht: number) => {
            const tva = ht * 0.20;
            setFormData(f => ({ ...f, totalHT: ht, tva, totalTTC: ht + tva }));
        };

        const handleFileUpload = async () => {
            if (!isElectron || !window.electronAPI) return;
            const result = await window.electronAPI.uploadInvoiceFile();
            if (result.success && result.filePath) setFormData(f => ({ ...f, filePath: result.filePath! }));
        };

        const handleOpenFile = async (fp: string) => {
            if (!isElectron || !window.electronAPI) return;
            const result = await window.electronAPI.openInvoiceFile(fp);
            if (!result.success) alert(result.error || 'Impossible d\'ouvrir le fichier.');
        };

        const handleSave = async () => {
            if (!formData.fournisseurId || !formData.reference) { setError('Fournisseur et référence sont obligatoires.'); return; }
            setBusy(true); setError(null);
            try {
                const fournisseur = fournisseurs.find(f => f.id === parseInt(formData.fournisseurId))!;
                const payload = { ...formData, fournisseur, dateDue: formData.dateDue || undefined, filePath: formData.filePath || undefined };
                if (isElectron && window.electronAPI) {
                    if (editing) await window.electronAPI.updateSupplierInvoice({ ...payload, id: editing.id } as SupplierInvoice);
                    else await window.electronAPI.createSupplierInvoice(payload as Omit<SupplierInvoice, 'id'>);
                    await reload();
                }
                setShowForm(false); setEditing(null); setFormData(emptyForm);
            } catch { setError('Erreur lors de la sauvegarde.'); }
            finally { setBusy(false); }
        };

        const handleDelete = async (inv: SupplierInvoice) => {
            if (!window.confirm(`Supprimer la facture « ${inv.reference} » ?`)) return;
            if (isElectron && window.electronAPI) { await window.electronAPI.deleteSupplierInvoice(inv.id); await reload(); }
        };

        const startEdit = (inv: SupplierInvoice) => {
            setEditing(inv);
            setFormData({ fournisseurId: inv.fournisseur.id.toString(), reference: inv.reference, dateIssue: inv.dateIssue, dateDue: inv.dateDue || '', totalHT: inv.totalHT, tva: inv.tva, totalTTC: inv.totalTTC, status: inv.status, filePath: inv.filePath || '', notes: inv.notes || '' });
            setShowForm(true);
        };

        const filtered = supplierInvoices.filter(i => i.reference.toLowerCase().includes(searchTerm.toLowerCase()) || i.fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase()));
        const statusBadge = (s: string) => ({ 'payé': 'bg-green-100 text-green-800', 'en retard': 'bg-red-100 text-red-800', 'brouillon': 'bg-gray-100 text-gray-700' }[s] || 'bg-gray-100 text-gray-700');

        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Factures Fournisseurs</h2>
                    <button onClick={() => { setShowForm(true); setEditing(null); setFormData(emptyForm); }} className="bg-orange-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={20} />Nouvelle Facture</button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                </div>

                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-xl font-bold mb-4">{editing ? 'Modifier' : 'Nouvelle'} Facture Fournisseur</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div><label className="block text-sm font-medium mb-1">Fournisseur *</label>
                                <select value={formData.fournisseurId} onChange={e => setFormData({ ...formData, fournisseurId: e.target.value })} className="w-full border rounded px-3 py-2">
                                    <option value="">Sélectionner</option>
                                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Référence *</label><input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Statut</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full border rounded px-3 py-2">
                                    <option value="brouillon">Brouillon</option>
                                    <option value="payé">Payé</option>
                                    <option value="en retard">En retard</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Date facture</label><input type="date" value={formData.dateIssue} onChange={e => setFormData({ ...formData, dateIssue: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Date échéance</label><input type="date" value={formData.dateDue} onChange={e => setFormData({ ...formData, dateDue: e.target.value })} className="w-full border rounded px-3 py-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Total HT (DH)</label><input type="number" value={formData.totalHT} onChange={e => updateTotals(parseFloat(e.target.value) || 0)} className="w-full border rounded px-3 py-2" step="0.01" /></div>
                            <div><label className="block text-sm font-medium mb-1">TVA (20%)</label><input type="number" value={formData.tva.toFixed(2)} disabled className="w-full border rounded px-3 py-2 bg-gray-100" /></div>
                            <div><label className="block text-sm font-medium mb-1">Total TTC (DH)</label><input type="number" value={formData.totalTTC.toFixed(2)} disabled className="w-full border rounded px-3 py-2 bg-gray-100" /></div>
                            <div className="col-span-3"><label className="block text-sm font-medium mb-1">Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full border rounded px-3 py-2" /></div>
                        </div>
                        {/* Fichier scan */}
                        <div className="mb-4 p-4 border-2 border-dashed rounded-lg">
                            <label className="block text-sm font-medium mb-2">Scan / PDF attaché</label>
                            {formData.filePath ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 flex-1 truncate">{formData.filePath.split('/').pop()}</span>
                                    <button onClick={() => handleOpenFile(formData.filePath)} className="text-blue-600 hover:text-blue-800 text-sm underline">Ouvrir</button>
                                    <button onClick={() => setFormData(f => ({ ...f, filePath: '' }))} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                </div>
                            ) : (
                                <button onClick={handleFileUpload} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded">
                                    <Download size={16} /> Attacher un scan ou PDF
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} disabled={busy} className="bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Annuler</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Référence</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Fournisseur</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Échéance</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Total TTC</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Fichier</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono">{inv.reference}</td>
                                    <td className="px-4 py-3 font-semibold">{inv.fournisseur.nom}</td>
                                    <td className="px-4 py-3 text-sm">{new Date(inv.dateIssue).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-4 py-3 text-sm">{inv.dateDue ? new Date(inv.dateDue).toLocaleDateString('fr-FR') : '-'}</td>
                                    <td className="px-4 py-3 font-semibold">{inv.totalTTC.toFixed(2)} DH</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(inv.status)}`}>{inv.status}</span></td>
                                    <td className="px-4 py-3">
                                        {inv.filePath ? (
                                            <button onClick={() => handleOpenFile(inv.filePath!)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"><Eye size={14} /> Voir</button>
                                        ) : <span className="text-gray-400 text-xs">Aucun</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(inv)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(inv)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Aucune facture fournisseur</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto">
                {currentPage === 'home' && <HomePage />}
                {currentPage === 'clients' && <ClientsPage />}
                {currentPage === 'devis' && <DevisPage />}
                {currentPage === 'bl' && <BLPage />}
                {currentPage === 'factures' && <FacturesPage />}
                {currentPage === 'fournisseurs' && <FournisseursPage />}
                {currentPage === 'factures-fournisseurs' && <FacturesFournisseursPage />}

                {currentPage === 'settings' && <SettingsPage />}
            </div>
        </div>
    );
};

export default App;
