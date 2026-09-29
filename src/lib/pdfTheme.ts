/**
 * pdfTheme.ts
 * ──────────────────────────────────────────────────────────────
 * Design system & asset loader bersama untuk semua dokumen PDF NISKALA:
 * - Nota Pembelian (Orders)
 * - Laporan Kas / Accounting
 * - Laporan Stok (Stock Report)
 * - Laporan Pesanan & Penjualan (Reports)
 *
 * Palet Warna Resmi NISKALA Aesthetic:
 * - Primary Accent: #E3D6C4 (RGB 227, 214, 196)
 * - Soft Cream Tint: #F7F4EF (RGB 247, 244, 239)
 * - Taupe Accent: #8C7D6B (RGB 140, 125, 107)
 * - Brand Gold: #D3B973 (RGB 211, 185, 115)
 * - Charcoal Typography: #2A2624 (RGB 42, 38, 36)
 * - Muted Text: #737373 (RGB 115, 115, 115)
 * ──────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";

// ─────────────────────────────────────────────
// Color Tokens (RGB Arrays for jsPDF)
// ─────────────────────────────────────────────
export const PDF_COLORS = {
  champagne: [227, 214, 196] as [number, number, number], // #E3D6C4
  champagneLight: [247, 244, 239] as [number, number, number], // #F7F4EF
  champagneDark: [140, 125, 107] as [number, number, number], // #8C7D6B
  gold: [211, 185, 115] as [number, number, number], // #D3B973
  textDark: [42, 38, 36] as [number, number, number], // #2A2624
  textMuted: [115, 115, 115] as [number, number, number],
  emerald: [21, 128, 61] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  rose: [185, 28, 28] as [number, number, number],
};

// ─────────────────────────────────────────────
// SVG Logo NISKALA Gold Complete
// ─────────────────────────────────────────────
export const NISKALA_GOLD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="87.2874mm" height="20.2338mm" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 55029.76 12756.26" xmlns:xlink="http://www.w3.org/1999/xlink">
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

let cachedLogoPng: string | null = null;

/**
 * Konversi SVG Logo NISKALA Gold ke PNG base64 via Canvas Browser (di-cache otomatis).
 */
export async function getNiskalaLogoPng(): Promise<string | null> {
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
    // 480px pada cetak ~48mm = 254 DPI (sangat tajam & jernih, size di bawah 30KB)
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

/**
 * Render Header Bersih & Aesthetic NISKALA untuk laporan PDF.
 */
export function drawReportHeader(
  doc: jsPDF,
  options: {
    logoPng: string | null;
    title: string;
    subtitle?: string;
    rightInfo?: string[];
    marginX?: number;
    topY?: number;
    dividerColor?: [number, number, number];
  }
): number {
  const marginX = options.marginX ?? 14;
  const topY = options.topY ?? 12;
  const pageW = doc.internal.pageSize.getWidth();
  const dividerColor = options.dividerColor ?? PDF_COLORS.champagne;

  // Logo di sisi kiri
  if (options.logoPng) {
    doc.addImage(options.logoPng, "PNG", marginX, topY, 46, 10.7, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...PDF_COLORS.gold);
    doc.text("NISKALA", marginX, topY + 7);
  }

  // Judul Dokumen di sebelah logo atau di bawahnya
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.textDark);
  doc.text(options.title, marginX + (options.logoPng ? 52 : 0), topY + 6);

  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text(options.subtitle, marginX + (options.logoPng ? 52 : 0), topY + 10.5);
  }

  // Info Kanan (Tanggal, filter, dll)
  if (options.rightInfo && options.rightInfo.length > 0) {
    options.rightInfo.forEach((text, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(i === 0 ? 8 : 7.2);
      doc.setTextColor(i === 0 ? PDF_COLORS.textDark[0] : PDF_COLORS.textMuted[0]);
      doc.text(text, pageW - marginX, topY + 4 + i * 4.5, { align: "right" });
    });
  }

  // Divider Line #E3D6C4
  const lineY = topY + 14.5;
  doc.setDrawColor(...dividerColor);
  doc.setLineWidth(0.7);
  doc.line(marginX, lineY, pageW - marginX, lineY);

  return lineY + 5; // Return next content Y
}

/**
 * Render Footer Standar dengan Timestamp Sistem NISKALA Hub pada semua halaman.
 */
export function drawReportFooters(
  doc: jsPDF,
  options: {
    reportName: string;
    marginX?: number;
    showTimestamp?: boolean;
  }
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = options.marginX ?? 14;
  const pgCount = (doc as any).internal.getNumberOfPages();
  const now = new Date();

  for (let p = 1; p <= pgCount; p++) {
    doc.setPage(p);

    // Separator line #E3D6C4
    doc.setDrawColor(...PDF_COLORS.champagne);
    doc.setLineWidth(0.4);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

    // Left info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...PDF_COLORS.textDark);
    doc.text("NISKALA", marginX, pageH - 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text(` — ${options.reportName}`, marginX + 13, pageH - 7);

    // Center page number
    doc.text(`Halaman ${p} dari ${pgCount}`, pageW / 2, pageH - 7, { align: "center" });

    // Right domain
    doc.text("niskalawear.com", pageW - marginX, pageH - 7, { align: "right" });

    // Timestamp baris bawah jika diaktifkan
    if (options.showTimestamp !== false) {
      doc.setFontSize(6);
      doc.setTextColor(155, 155, 155);
      doc.text(
        `Dokumen resmi ini dibuat otomatis oleh Sistem NISKALA Hub pada ${now.toLocaleString("id-ID")}`,
        marginX,
        pageH - 3
      );
    }
  }
}
