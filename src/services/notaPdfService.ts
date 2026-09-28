/**
 * notaPdfService.ts
 * ──────────────────────────────────────────────────────────────
 * Service untuk generate Nota / Invoice PDF per pesanan NISKALA.
 *
 * Desain: Simple, Aesthetic, Clean & Premium
 * - Format: A4 Portrait (210 x 297 mm)
 * - Tema Warna: #E3D6C4 (Warm Champagne / Linen Luxury NISKALA)
 *   dipadukan dengan tipografi Charcoal #2A2624 & Soft Cream #F7F4EF
 * - Logo: Logo NISKALA Gold Complete (SVG dirasterisasi ke Canvas PNG)
 * - Struktur:
 *   1. Clean Airy Header (Logo NISKALA + NOTA PEMBELIAN + No. Order)
 *   2. Garis Aksen Halus #E3D6C4
 *   3. Customer Info & Order Metadata Cards
 *   4. Tabel Rincian Produk (Header Bar #E3D6C4)
 *   5. Total Pembayaran Card #E3D6C4 & Badge Status
 *   6. Catatan Pesanan & Kebijakan Belanja NISKALA
 *   7. Footer Media Sosial & Timestamp Sistem NISKALA Hub
 * ──────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIDR } from "@/lib/currency";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface NotaOrderItem {
  id?: string;
  product_name: string;
  size_name?: string | null;
  quantity: number;
  unit_price: number;
  unit_hpp?: number;
}

export interface NotaOrder {
  id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  status: string;
  payment_status: string;
  channel: string;
  notes?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  total_price: number;
  created_at: string;
  order_items: NotaOrderItem[];
}

// ─────────────────────────────────────────────
// Raw SVG Logo NISKALA Gold Complete
// ─────────────────────────────────────────────
const NISKALA_GOLD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="87.2874mm" height="20.2338mm" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 55029.76 12756.26" xmlns:xlink="http://www.w3.org/1999/xlink">
 <defs>
  <style type="text/css">
    .str0 {stroke:#D3B973;stroke-width:126.09;stroke-miterlimit:22.9256}
    .fil0 {fill:#D3B973}
  </style>
 </defs>
 <g id="Layer_x0020_1">
  <g id="_1472016950864">
   <path class="fil0 str0" d="M19740.19 3750.89l450.96 0 0 5252.54 -450.96 0 -3884.35 -4641.95 0 4642.14 -450.96 0 0 -5252.73 449.44 0 0 -0.32c310.12,16.39 644.5,-51.26 785.34,117.07l3100.52 3704.67 0 -3821.43z"/>
   <path class="fil0 str0" d="M29216.57 7842.21c-199.6,1206.04 -2977.71,1745.7 -3989.45,215.23 178.6,-140.71 262.08,-211.07 262.08,-211.07 1972.72,2095.47 4705.82,-150.05 1571.44,-1074.91 -4392.93,-1390.13 291.39,-4512.08 2197.66,-2153.59 -232.44,100.05 -348.7,150.05 -348.7,150.05 -1222.18,-1784.22 -4697.12,349.45 -1365.23,1244.75 1351.8,363.26 1897.38,963.25 1672.19,1829.55z"/>
   <polygon class="fil0 str0" points="31039.44,3750.89 31981.38,3750.89 31981.38,6492.18 34746.44,3752.08 35093.19,3752.59 35201.43,3858.5 33155.96,5881.85 35581.21,9005.5 34412.24,9005.95 32489.46,6539.4 31981.38,7041.67 31981.38,9003.42 31039.44,9003.42 "/>
   <polygon class="fil0 str0" points="44245.52,3750.89 45187.47,3750.89 45187.47,8624.46 47726.07,8626.61 47661.45,9003.3 45187.47,9003.3 45187.47,9003.42 44245.52,9003.42 "/>
   <polygon class="fil0 str0" points="39396.03,3752.34 39897.23,3751.77 42564.89,9003.42 41522.07,9003.42 39349.56,4670.58 37181.91,9003.42 36698.74,9003.42 "/>
   <polygon class="fil0 str0" points="51758.14,3752.34 52259.34,3751.77 54927,9003.42 53884.18,9003.42 51711.67,4670.58 49544.02,9003.42 49060.85,9003.42 "/>
   <rect class="fil0 str0" x="22265.77" y="3750.85" width="941.97" height="5252.54"/>
   <g>
    <path class="fil0 str0" d="M4134.83 2817.83l3923 3096.49 0.32 1066.52 -4054.7 -3159.15c0,2713.62 -13.05,5644.23 -13.05,8357.16 -2826.34,-1373.55 -4062.32,-3844.7 -3916.19,-6161.64 244.42,-3875.71 3794.51,-6903.54 8126.54,-5678.4l0 466.91c-5784.88,-2213.11 -9571.14,5993.75 -5108.36,9588.48l1.89 -7577.74c98.35,0 1018.67,-15.82 1040.55,1.39z"/>
    <path class="fil0 str0" d="M8700.75 9938.43l-3922.93 -3096.49 -0.32 -1066.52 4054.7 3159.15c0,-2713.62 -2.08,-5675.82 -2.08,-8388.74 2826.34,1373.61 4077.39,3876.34 3931.32,6193.22 -244.36,3875.65 -3794.51,6903.54 -8126.54,5678.4l0 -466.91c5784.82,2213.11 9530.98,-6031.7 5068.2,-9626.43l-0.63 7615.69c-98.35,0 -979.84,15.82 -1001.71,-1.39z"/>
   </g>
  </g>
 </g>
</svg>`;

// Cache in-memory agar rasterisasi hanya terjadi sekali
let cachedLogoPng: string | null = null;

/**
 * Konversi SVG Niskala Gold ke PNG base64 via Browser Canvas
 */
async function getLogoPng(): Promise<string | null> {
  if (cachedLogoPng) return cachedLogoPng;
  if (typeof window === "undefined" || !window.Blob) return null;

  try {
    const blob = new Blob([NISKALA_GOLD_SVG], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";

    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    if (!loaded) {
      URL.revokeObjectURL(url);
      return null;
    }

    // Rasio aspek logo viewBox = 55029.76 / 12756.26 ≈ 4.314
    // 480px pada cetak ~50mm = 244 DPI (sangat tajam & jernih, file size sangat kecil)
    const canvasWidth = 480;
    const canvasHeight = Math.round(canvasWidth / (55029.76 / 12756.26));

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    URL.revokeObjectURL(url);
    cachedLogoPng = canvas.toDataURL("image/png");
    return cachedLogoPng;
  } catch (err) {
    console.warn("Gagal merasterisasi SVG Logo Niskala ke Canvas:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Format Helpers
// ─────────────────────────────────────────────

function formatDateTimeId(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatDateId(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Baru",
  processing: "Diproses",
  shipped: "Dikirim",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

// ─────────────────────────────────────────────
// Core PDF Generator Function
// ─────────────────────────────────────────────

/**
 * Generate dan unduh Nota PDF untuk sebuah pesanan (Order).
 * Desain Simple, Aesthetic, Minimalis & Premium dengan palet #E3D6C4.
 * @param order Data pesanan lengkap beserta order_items
 */
export async function generateNotaPDF(order: NotaOrder): Promise<void> {
  // A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // ── Palet Warna NISKALA Aesthetic Luxury ──
  const colorChampagne: [number, number, number] = [227, 214, 196]; // #E3D6C4 (Primary Accent)
  const colorChampagneSoft: [number, number, number] = [247, 244, 239]; // #F7F4EF (Soft Linen Tint)
  const colorChampagneDark: [number, number, number] = [140, 125, 107]; // #8C7D6B (Taupe Accent)
  const colorGold: [number, number, number] = [211, 185, 115]; // #D3B973 (Logo & Brand Accent)
  const colorTextDark: [number, number, number] = [42, 38, 36]; // #2A2624 (Warm Charcoal)
  const colorTextMuted: [number, number, number] = [115, 115, 115]; // Text secondary

  // ───────────────────────────────────────────
  // 1. Header Bersih, Simple & Aesthetic
  // ───────────────────────────────────────────
  const headerY = 16;

  // Render Logo NISKALA Gold di kiri atas
  const logoPng = await getLogoPng();
  if (logoPng) {
    // Rasio aspek 4.314 -> lebar 50mm, tinggi ~11.6mm
    doc.addImage(logoPng, "PNG", marginX, headerY, 50, 11.6, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...colorGold);
    doc.text("NISKALA", marginX, headerY + 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colorTextMuted);
    doc.text("PREMIUM HOMEWEAR", marginX, headerY + 12);
  }

  // Teks Header Kanan: NOTA PEMBELIAN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colorTextDark);
  doc.text("NOTA PEMBELIAN", pageWidth - marginX, headerY + 2, { align: "right" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorTextMuted);
  const shortId = order.id ? `#${order.id.slice(0, 8).toUpperCase()}` : "#ORDER";
  doc.text(`No. Pesanan: ${shortId}`, pageWidth - marginX, headerY + 7.5, { align: "right" });

  doc.setFontSize(7.5);
  doc.text(`Tanggal: ${formatDateId(order.created_at)}`, pageWidth - marginX, headerY + 12, { align: "right" });

  // Garis Aksen Halus #E3D6C4 di bawah Header
  const dividerY = headerY + 16;
  doc.setDrawColor(...colorChampagne);
  doc.setLineWidth(0.8);
  doc.line(marginX, dividerY, pageWidth - marginX, dividerY);

  // ───────────────────────────────────────────
  // 2. Info Cards (Pelanggan & Status Transaksi)
  // ───────────────────────────────────────────
  const cardsY = dividerY + 6;
  const cardHeight = 33;
  const colWidth = (contentWidth - 8) / 2; // ~87mm

  // ── Card Kiri: INFORMASI PELANGGAN ──
  doc.setFillColor(...colorChampagneSoft);
  doc.setDrawColor(...colorChampagne);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, cardsY, colWidth, cardHeight, 1.5, 1.5, "FD");

  // Aksen garis champagne di kiri kartu
  doc.setFillColor(...colorChampagne);
  doc.roundedRect(marginX, cardsY, 2.2, cardHeight, 1, 1, "F");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorChampagneDark);
  doc.text("INFORMASI PELANGGAN", marginX + 6, cardsY + 6);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorTextDark);
  const custName = order.customer_name?.trim() || "Pelanggan Umum";
  doc.text(custName.length > 32 ? custName.slice(0, 30) + "..." : custName, marginX + 6, cardsY + 12.5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorTextMuted);
  doc.text(`No. Telepon / WA : ${order.customer_phone?.trim() || "—"}`, marginX + 6, cardsY + 18.5);
  doc.text(
    `Saluran Belanja  : ${order.channel === "online" ? "Online Store" : "Offline Store"}`,
    marginX + 6,
    cardsY + 23.5
  );
  doc.text(`Waktu Order      : ${formatDateTimeId(order.created_at)}`, marginX + 6, cardsY + 28.5);

  // ── Card Kanan: DETAIL TRANSAKSI & STATUS ──
  const rightCardX = marginX + colWidth + 8;
  doc.setFillColor(...colorChampagneSoft);
  doc.setDrawColor(...colorChampagne);
  doc.setLineWidth(0.35);
  doc.roundedRect(rightCardX, cardsY, colWidth, cardHeight, 1.5, 1.5, "FD");

  // Aksen garis champagne di kiri kartu
  doc.setFillColor(...colorChampagne);
  doc.roundedRect(rightCardX, cardsY, 2.2, cardHeight, 1, 1, "F");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorChampagneDark);
  doc.text("STATUS TRANSAKSI", rightCardX + 6, cardsY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorTextDark);
  doc.text("Status Pesanan : ", rightCardX + 6, cardsY + 12.5);
  doc.setFont("helvetica", "bold");
  const stLabel = STATUS_LABELS[order.status] ?? order.status;
  doc.text(stLabel, rightCardX + 32, cardsY + 12.5);

  doc.setFont("helvetica", "normal");
  doc.text("Status Bayar     : ", rightCardX + 6, cardsY + 18.5);
  const isPaid = order.payment_status === "paid";

  if (isPaid) {
    doc.setTextColor(21, 128, 61); // Emerald lembut
    doc.setFont("helvetica", "bold");
    doc.text("LUNAS", rightCardX + 32, cardsY + 18.5);
  } else {
    doc.setTextColor(180, 83, 9); // Amber lembut
    doc.setFont("helvetica", "bold");
    doc.text("BELUM LUNAS", rightCardX + 32, cardsY + 18.5);
  }

  doc.setFontSize(7.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorTextMuted);
  if (order.status === "cancelled") {
    doc.setTextColor(185, 28, 28);
    doc.text(
      `Dibatalkan${order.cancelled_at ? ` : ${formatDateId(order.cancelled_at)}` : ""}`,
      rightCardX + 6,
      cardsY + 24
    );
    if (order.cancellation_reason) {
      doc.text(
        `Alasan: ${order.cancellation_reason.slice(0, 30)}`,
        rightCardX + 6,
        cardsY + 28.5
      );
    }
  } else if (order.paid_at) {
    doc.text(`Waktu Bayar    : ${formatDateTimeId(order.paid_at)}`, rightCardX + 6, cardsY + 24);
  } else {
    doc.text("Waktu Bayar    : Menunggu Pembayaran", rightCardX + 6, cardsY + 24);
  }

  // ───────────────────────────────────────────
  // 3. Tabel Rincian Produk (Header #E3D6C4)
  // ───────────────────────────────────────────
  const items = order.order_items || [];
  const tableRows = items.map((it, idx) => {
    const subtotal = Number(it.quantity) * Number(it.unit_price);
    return [
      idx + 1,
      it.product_name || "Produk NISKALA",
      it.size_name ? it.size_name : "All Size",
      `${it.quantity} pcs`,
      formatIDR(Number(it.unit_price)),
      formatIDR(subtotal),
    ];
  });

  const totalCalculated = items.reduce(
    (sum, it) => sum + Number(it.quantity) * Number(it.unit_price),
    0
  );
  const finalTotal = order.total_price ? Number(order.total_price) : totalCalculated;

  autoTable(doc, {
    startY: cardsY + cardHeight + 8,
    margin: { left: marginX, right: marginX },
    head: [["#", "Deskripsi Produk", "Ukuran / Varian", "Jumlah", "Harga Satuan", "Subtotal"]],
    body: tableRows.length > 0 ? tableRows : [["—", "Tidak ada rincian item", "—", "—", "—", "—"]],
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: colorTextDark,
      lineColor: colorChampagne,
      lineWidth: 0.25,
      font: "helvetica",
    },
    headStyles: {
      fillColor: colorChampagne, // #E3D6C4
      textColor: colorTextDark,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 3.8,
    },
    alternateRowStyles: {
      fillColor: colorChampagneSoft, // #F7F4EF
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 34, halign: "right", fontStyle: "bold" },
    },
  });

  // Posisi Y setelah tabel
  const lastTable = (doc as any).lastAutoTable;
  let currentY = lastTable ? lastTable.finalY + 8 : 130;

  if (currentY > pageHeight - 85) {
    doc.addPage();
    currentY = 20;
  }

  // ───────────────────────────────────────────
  // 4. Ringkasan & Total Section (Aesthetic)
  // ───────────────────────────────────────────
  const summaryBoxWidth = 84;
  const summaryX = pageWidth - marginX - summaryBoxWidth;

  // Box Catatan (di sebelah kiri jika ada)
  if (order.notes && order.notes.trim()) {
    const notesWidth = colWidth;
    doc.setFillColor(...colorChampagneSoft);
    doc.setDrawColor(...colorChampagne);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, currentY, notesWidth, 26, 1.5, 1.5, "FD");

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colorChampagneDark);
    doc.text("CATATAN PESANAN", marginX + 4.5, currentY + 5.5);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colorTextDark);
    const splitNotes = doc.splitTextToSize(order.notes.trim(), notesWidth - 9);
    doc.text(splitNotes.slice(0, 3), marginX + 4.5, currentY + 11.5);
  }

  // Badge Status Lunas (di samping jika lunas)
  if (isPaid) {
    const stampX = marginX + (order.notes ? colWidth + 5 : 0);
    doc.setDrawColor(180, 215, 190);
    doc.setFillColor(242, 248, 243);
    doc.setLineWidth(0.5);
    doc.roundedRect(stampX, currentY + 4, 38, 16, 1.5, 1.5, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61);
    doc.text("LUNAS / PAID", stampX + 19, currentY + 10.5, { align: "center" });

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 140, 90);
    doc.text("Terima kasih", stampX + 19, currentY + 15, { align: "center" });
  }

  // Card Total Pembayaran (di sebelah kanan dengan #E3D6C4)
  const totalBoxHeight = 28;
  doc.setFillColor(...colorChampagne); // #E3D6C4
  doc.setDrawColor(...colorChampagneDark);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryX, currentY, summaryBoxWidth, totalBoxHeight, 1.5, 1.5, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorChampagneDark);
  doc.text("TOTAL PEMBAYARAN", summaryX + 8, currentY + 7.5);

  doc.setFontSize(13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorTextDark);
  doc.text(formatIDR(finalTotal), summaryX + 8, currentY + 16.5);

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorChampagneDark);
  const totalItemCount = items.reduce((s, it) => s + Number(it.quantity), 0);
  doc.text(`Total Qty: ${totalItemCount} pcs`, summaryX + 8, currentY + 22.5);

  // ───────────────────────────────────────────
  // 5. Syarat & Kebijakan Belanja NISKALA
  // ───────────────────────────────────────────
  const termsY = currentY + totalBoxHeight + 12;
  if (termsY < pageHeight - 45) {
    doc.setFillColor(...colorChampagneSoft);
    doc.setDrawColor(...colorChampagne);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, termsY, contentWidth, 18, 1.5, 1.5, "FD");

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colorChampagneDark);
    doc.text("KETENTUAN & KEBIJAKAN BELANJA NISKALA", marginX + 4.5, termsY + 5.5);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colorTextMuted);
    doc.text(
      "1. Simpan nota ini sebagai bukti transaksi resmi belanja Anda di NISKALA.",
      marginX + 4.5,
      termsY + 10.5
    );
    doc.text(
      "2. Untuk kendala pesanan, silakan hubungi tim kami melalui Instagram @niskala.wear atau email ke admin@niskalawear.com.",
      marginX + 4.5,
      termsY + 14.5
    );
  }

  // ───────────────────────────────────────────
  // 6. Footer Aesthetic (Branding & Timestamp)
  // ───────────────────────────────────────────
  const footerY = pageHeight - 16;

  // Garis aksen #E3D6C4 pemisah di footer
  doc.setDrawColor(...colorChampagne);
  doc.setLineWidth(0.6);
  doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorTextDark);
  doc.text("NISKALA", marginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorTextMuted);
  doc.text(
    " — Premium Homewear · Tasikmalaya, Jawa Barat, Indonesia",
    marginX + 15,
    footerY
  );

  // Link / Sosmed di sebelah kanan footer
  doc.setFontSize(7);
  doc.setTextColor(...colorTextMuted);
  doc.text(
    "Instagram: @niskala.wear   |   TikTok: @niskala.wear.official   |   niskalawear.com",
    pageWidth - marginX,
    footerY,
    { align: "right" }
  );

  // Timestamp resmi sistem NISKALA Hub
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Dokumen resmi ini dibuat otomatis oleh Sistem NISKALA Hub pada ${new Date().toLocaleString("id-ID")}`,
    marginX,
    footerY + 5
  );

  // ───────────────────────────────────────────
  // 7. Simpan File PDF
  // ───────────────────────────────────────────
  const cleanCustomer = (order.customer_name || "guest")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 20);
  const cleanId = (order.id || "order").slice(0, 8);
  const fileName = `nota-niskala-${cleanId}-${cleanCustomer}.pdf`;

  doc.save(fileName);
}
