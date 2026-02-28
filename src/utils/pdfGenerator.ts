import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanyInfo, Client, Devis, BonLivraison, Facture } from '../types/electron';
import { LOGO_BASE64 } from './logoBase64';

// ─── Constants & Colors ───────────────────────────────────────────────────
const ORANGE: [number, number, number] = [230, 126, 34];
const BLACK: [number, number, number] = [0, 0, 0];

// ─── Number to Words ──────────────────────────────────────────────────────
const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function belowOneHundred(n: number): string {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) return TENS[t] + (u > 0 ? `-${ONES[10 + u]}` : (t === 9 ? '-dix' : ''));
    if (t === 8) return 'quatre-vingt' + (u > 0 ? `-${ONES[u]}` : 's');
    return TENS[t] + (u === 1 ? '-et-un' : u > 0 ? `-${ONES[u]}` : '');
}

function toWords(n: number): string {
    if (n === 0) return 'zéro';
    let result = '';
    if (n >= 1_000_000) { result += toWords(Math.floor(n / 1_000_000)) + ' million' + (Math.floor(n / 1_000_000) > 1 ? 's ' : ' '); n %= 1_000_000; }
    if (n >= 1000) { const mil = Math.floor(n / 1000); result += (mil === 1 ? 'mille ' : toWords(mil) + ' mille '); n %= 1000; }
    if (n >= 100) { const cent = Math.floor(n / 100); result += (cent === 1 ? 'cent ' : ONES[cent] + ' cent' + (n % 100 === 0 && cent > 1 ? 's ' : ' ')); n %= 100; }
    if (n > 0) result += belowOneHundred(n);
    return result.trim();
}

function numberToWordsFr(amount: number): string {
    const intPart = Math.floor(amount);
    const centimes = Math.round((amount - intPart) * 100);
    let result = toWords(intPart) + ' dirham' + (intPart > 1 ? 's' : '');
    if (centimes > 0) result += ' et ' + toWords(centimes) + ' centime' + (centimes > 1 ? 's' : '');
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// ─── Drawing Helpers ───────────────────────────────────────────────────────
function drawHeader(doc: jsPDF) {
    // Top orange lines and logo gap
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(4);
    doc.line(10, 20, 75, 20); // Left bar
    doc.line(135, 20, 200, 20); // Right bar

    // Exact logo image in the middle
    doc.addImage(LOGO_BASE64, 'PNG', 80, 8, 50, 25);
    doc.setTextColor(...BLACK);
}

function drawInfoBoxes(doc: jsPDF, type: string, numero: string, dateStr: string, client: Client, numeroDevis?: string) {
    const startY = 38;

    // Document Box (Left)
    doc.setDrawColor(30, 42, 64); // Dark blue/black edge
    doc.setLineWidth(0.4);
    doc.roundedRect(10, startY, 80, 28, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${type} N° :`, 13, startY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text(numero, 85, startY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Code client :', 13, startY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(client.code, 85, startY + 16, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(`Ouarzazate le, ${dateStr}`, 13, startY + 24);

    // Client Box (Right)
    doc.setDrawColor(30, 42, 64);
    doc.roundedRect(100, startY, 100, 28, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.text(client.nom, 150, startY + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    const splitAddress = doc.splitTextToSize(client.address || '', 90);
    doc.text(splitAddress, 150, startY + 14, { align: 'center' });

    doc.text(`ICE : ${client.ice || ''}`, 150, startY + 24, { align: 'center' });

    // Optional Reference Line
    let currentY = startY + 36;
    if (numeroDevis) {
        doc.setFont('helvetica', 'bold');
        doc.text(`BON DE COMMANDE N°: ${numeroDevis}`, 10, currentY);
        currentY += 8;
    }
    return currentY;
}

function drawFooter(doc: jsPDF, ci: CompanyInfo) {
    const pageH = doc.internal.pageSize.getHeight();
    const y = pageH - 25;

    // Thin Orange rule
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(1);
    doc.line(30, y, 180, y);

    // Footer Text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    const l1 = ci.address;
    const l2 = `TP : ${ci.tp} - IF: ${ci.if_num} - RC :${ci.rc}- ICE: ${ci.ice} - TÉL : ${ci.tel}`;
    const l3 = `Banque Crédit Agricole: RIB: ${ci.rib} - Email : ${ci.email}`;

    doc.text(l1, 105, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(l2, 105, y + 11, { align: 'center' });
    doc.text(l3, 105, y + 16, { align: 'center' });
}

// ─── Generators ────────────────────────────────────────────────────────────

export function generateDevisPDF(devis: Devis, ci: CompanyInfo): Blob {
    const doc = new jsPDF({ format: 'a4' });
    drawHeader(doc);
    const dateStr = new Date(devis.date).toLocaleDateString('fr-FR');
    const tableY = drawInfoBoxes(doc, 'Devis', devis.numero, dateStr, devis.client);

    autoTable(doc, {
        startY: tableY,
        head: [['Désignations', 'Quantité', 'Prix Unitaire', 'Prix Total HT (DH)']],
        body: devis.items.map(item => [item.designation, item.quantite.toString(), item.prixUnitaire.toFixed(2), (item.quantite * item.prixUnitaire).toFixed(2)]),
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { font: 'courier', fontStyle: 'bold', textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 35 }, 3: { halign: 'center' } },
        theme: 'plain',
        margin: { left: 10, right: 10 },
        didDrawCell: (data) => {
            // Draw only vertical lines for body cells, not horizontal (except the header which has its own border)
            if (data.section === 'body') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const fixedBottomY = 200; // The fixed height the grid extends to
    const lastTableY = (doc as any).lastAutoTable.finalY || tableY;

    // Draw the remaining vertical lines down to fixedBottomY
    const cols = (doc as any).lastAutoTable.settings.margin.left;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(10, lastTableY, 10, fixedBottomY); // Left border
    doc.line(100, lastTableY, 100, fixedBottomY); // V-line 1
    doc.line(125, lastTableY, 125, fixedBottomY); // V-line 2
    doc.line(160, lastTableY, 160, fixedBottomY); // V-line 3
    doc.line(200, lastTableY, 200, fixedBottomY); // Right border
    doc.line(10, fixedBottomY, 200, fixedBottomY); // Bottom border closing the table grid

    const x = 120, w = 80;
    doc.rect(x, fixedBottomY, w, 24);
    doc.line(x, fixedBottomY + 8, x + w, fixedBottomY + 8);
    doc.line(x, fixedBottomY + 16, x + w, fixedBottomY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL HT : (DH)', x + 2, fixedBottomY + 5); doc.text(devis.totalHT.toFixed(2), x + w - 2, fixedBottomY + 5, { align: 'right' });
    doc.text('TVA (20%) :', x + 2, fixedBottomY + 13); doc.text(devis.tva.toFixed(2), x + w - 2, fixedBottomY + 13, { align: 'right' });
    doc.text('TOTAL TTC : (DH)', x + 2, fixedBottomY + 21); doc.text(devis.totalTTC.toFixed(2), x + w - 2, fixedBottomY + 21, { align: 'right' });

    drawFooter(doc, ci);
    return doc.output('blob');
}

export function generateBLPDF(bl: BonLivraison, ci: CompanyInfo): Blob {
    const doc = new jsPDF({ format: 'a4' });
    drawHeader(doc);
    const dateStr = new Date(bl.date).toLocaleDateString('fr-FR');
    const tableY = drawInfoBoxes(doc, 'BON DE LIVRAISON', bl.numero, dateStr, bl.client, bl.numeroDevis);

    autoTable(doc, {
        startY: tableY,
        head: [['Désignations', 'Quantité', 'Remarque']],
        body: bl.items.map(item => [item.designation, item.quantite.toString(), item.remarque || '']),
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { font: 'courier', fontStyle: 'bold', textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'center', cellWidth: 30 } },
        theme: 'plain',
        margin: { left: 10, right: 10 },
        didDrawCell: (data) => {
            if (data.section === 'body') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const fixedBottomY = 220; // BL grid goes lower since there are no totals
    const lastTableY = (doc as any).lastAutoTable.finalY || tableY;

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(10, lastTableY, 10, fixedBottomY);
    doc.line(110, lastTableY, 110, fixedBottomY);
    doc.line(140, lastTableY, 140, fixedBottomY);
    doc.line(200, lastTableY, 200, fixedBottomY);
    doc.line(10, fixedBottomY, 200, fixedBottomY);

    const visaY = fixedBottomY + 5;
    doc.rect(20, visaY, 80, 25); doc.rect(110, visaY, 80, 25);
    doc.setFont('helvetica', 'bold');
    doc.text('Visa du Client', 60, visaY + 6, { align: 'center' });
    doc.text('Visa du Fournisseur', 150, visaY + 6, { align: 'center' });

    drawFooter(doc, ci);
    return doc.output('blob');
}

export function generateFacturePDF(facture: Facture, ci: CompanyInfo): Blob {
    const doc = new jsPDF({ format: 'a4' });
    drawHeader(doc);
    const dateStr = new Date(facture.date).toLocaleDateString('fr-FR');
    const tableY = drawInfoBoxes(doc, 'Facture', facture.numero, dateStr, facture.client, facture.numeroDevis);

    autoTable(doc, {
        startY: tableY,
        head: [['Désignations', 'Quantité', 'Prix Unitaire', 'Prix Total HT (DH)']],
        body: facture.items.map(item => [item.designation, item.quantite.toString(), item.prixUnitaire.toFixed(2), (item.quantite * item.prixUnitaire).toFixed(2)]),
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { font: 'courier', fontStyle: 'bold', textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 35 }, 3: { halign: 'center' } },
        theme: 'plain',
        margin: { left: 10, right: 10 },
        didDrawCell: (data) => {
            if (data.section === 'body') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const fixedBottomY = 200;
    const lastTableY = (doc as any).lastAutoTable.finalY || tableY;

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(10, lastTableY, 10, fixedBottomY);
    doc.line(100, lastTableY, 100, fixedBottomY);
    doc.line(125, lastTableY, 125, fixedBottomY);
    doc.line(160, lastTableY, 160, fixedBottomY);
    doc.line(200, lastTableY, 200, fixedBottomY);
    doc.line(10, fixedBottomY, 200, fixedBottomY);

    const x = 120, w = 80;
    doc.rect(x, fixedBottomY, w, 24);
    doc.line(x, fixedBottomY + 8, x + w, fixedBottomY + 8);
    doc.line(x, fixedBottomY + 16, x + w, fixedBottomY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL HT : (DH)', x + 2, fixedBottomY + 5); doc.text(facture.totalHT.toFixed(2), x + w - 2, fixedBottomY + 5, { align: 'right' });
    doc.text('TVA (20%) :', x + 2, fixedBottomY + 13); doc.text(facture.tva.toFixed(2), x + w - 2, fixedBottomY + 13, { align: 'right' });
    doc.text('TOTAL TTC : (DH)', x + 2, fixedBottomY + 21); doc.text(facture.totalTTC.toFixed(2), x + w - 2, fixedBottomY + 21, { align: 'right' });

    doc.setFontSize(10);
    doc.text(`Arrêté la présente facture à la somme de : ${numberToWordsFr(facture.totalTTC)} dirhams.`, 10, fixedBottomY + 35);

    drawFooter(doc, ci);
    return doc.output('blob');
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
