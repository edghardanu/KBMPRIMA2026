// Heavy libraries are now lazily loaded in `exportToPDF` via dynamic import
// to improve initial rendering speed.
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

interface ExportOptions {
    title: string;
    subtitle?: string;
    headers: string[];
    data: string[][];
    filename: string;
}

export async function exportToPDF({ title, subtitle, headers, data, filename }: ExportOptions) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Web Monitoring KBM', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 30, { align: 'center' });

    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, pageWidth / 2, 37, { align: 'center' });
    }

    const startY = subtitle ? 43 : 37;

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const tanggal = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    doc.text(`Tanggal Cetak: ${tanggal}`, 14, startY);

    // Table
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: startY + 5,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
            // Footer
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Halaman ${hookData.pageNumber} dari ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        },
    });

    doc.save(`${filename}.pdf`);
}

export async function exportAbsensiToPDF(
    jenjangNama: string,
    data: { nama: string; hadir: number; tidak_hadir: number; izin: number; sakit: number; total: number }[]
) {
    await exportToPDF({
        title: 'Rekap Absensi Murid',
        subtitle: `Jenjang: ${jenjangNama}`,
        headers: ['No', 'Nama Murid', 'Hadir', 'Tidak Hadir', 'Izin', 'Sakit', 'Total'],
        data: data.map((d, i) => [
            String(i + 1),
            d.nama,
            String(d.hadir),
            String(d.tidak_hadir),
            String(d.izin),
            String(d.sakit),
            String(d.total),
        ]),
        filename: `rekap-absensi-${jenjangNama.toLowerCase().replace(/\s+/g, '-')}`,
    });
}

export async function exportMateriToPDF(
    jenjangNama: string,
    data: { nama: string; materi: string; status: string; tanggal: string; capaian?: number }[]
) {
    const hasCapaian = data.length > 0 && data[0].capaian !== undefined;

    await exportToPDF({
        title: 'Rekap Target Materi',
        subtitle: `Jenjang: ${jenjangNama}`,
        headers: hasCapaian
            ? ['No', 'Nama Murid', 'Capaian (%)', 'Materi', 'Status', 'Tanggal']
            : ['No', 'Nama Murid', 'Materi', 'Status', 'Tanggal'],
        data: data.map((d, i) => {
            const row = [String(i + 1), d.nama];
            if (hasCapaian) row.push(`${d.capaian}%`);
            row.push(
                d.materi,
                d.status === 'lancar' ? 'Lancar' : 'Kurang Lancar',
                d.tanggal
            );
            return row;
        }),
        filename: `rekap-materi-${jenjangNama.toLowerCase().replace(/\s+/g, '-')}`,
    });
}

export async function exportKendalaToPDF(
    data: { judul: string; deskripsi: string; jenjang: string; status: string; tanggal: string }[]
) {
    await exportToPDF({
        title: 'Laporan Kendala KBM',
        headers: ['No', 'Judul', 'Deskripsi', 'Jenjang', 'Status', 'Tanggal'],
        data: data.map((d, i) => [
            String(i + 1),
            d.judul,
            d.deskripsi,
            d.jenjang,
            d.status === 'pending' ? 'Menunggu' : d.status === 'disetujui' ? 'Disetujui' : 'Ditolak',
            d.tanggal,
        ]),
        filename: 'laporan-kendala-kbm',
    });
}

export async function exportSaranToPDF(
    data: { judul: string; deskripsi: string; jenjang: string; status: string; tanggal: string }[]
) {
    await exportToPDF({
        title: 'Laporan Saran Guru',
        headers: ['No', 'Judul', 'Deskripsi', 'Jenjang', 'Status', 'Tanggal'],
        data: data.map((d, i) => [
            String(i + 1),
            d.judul,
            d.deskripsi,
            d.jenjang,
            d.status === 'pending' ? 'Menunggu' : d.status === 'disetujui' ? 'Disetujui' : 'Ditolak',
            d.tanggal,
        ]),
        filename: 'laporan-saran-guru',
    });
}

export async function exportLaporanAdminToPDF(
    rekapMurid: { jenjang: string; jumlah: number; capaianMateri: string }[],
    totalMurid: number,
    kendala: { jenjang: string; kelas: string; judul: string; deskripsi: string; status: string }[],
    saran: { jenjang: string; kelas: string; judul: string; deskripsi: string; status: string }[]
) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Web Monitoring KBM', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Rekapitulasi Admin', pageWidth / 2, 30, { align: 'center' });

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const tanggal = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.text(`Tanggal Cetak: ${tanggal}`, 14, 40);

    let currentY = 48;

    // 1. Rekapitulasi Jumlah Murid
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Rekapitulasi Jumlah Anak & Capaian Materi', 14, currentY);
    currentY += 6;

    const dataMurid = rekapMurid.map((r, i) => [String(i + 1), r.jenjang, String(r.jumlah), r.capaianMateri]);
    // Add Total Row
    dataMurid.push(['', 'Total Generus', String(totalMurid), '-']);

    autoTable(doc, {
        head: [['No', 'Jenjang', 'Jumlah Anak', 'Capaian Materi']],
        body: dataMurid,
        startY: currentY,
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        willDrawCell: (data) => {
            // Make "Total" row bold
            if (data.row.index === dataMurid.length - 1) {
                doc.setFont('helvetica', 'bold');
                data.cell.styles.fillColor = [220, 230, 245];
            }
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 2. Daftar Kendala
    if (currentY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); currentY = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Daftar Kendala KBM', 14, currentY);
    currentY += 6;

    autoTable(doc, {
        head: [['No', 'Jenjang', 'Kelas', 'Kendala', 'Status']],
        body: kendala.map((k, i) => [
            String(i + 1), k.jenjang, k.kelas, k.judul,
            k.status === 'pending' ? 'Menunggu' : k.status === 'disetujui' ? 'Disetujui' : 'Ditolak'
        ]),
        startY: currentY,
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [239, 68, 68] /* Red for kendala */, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 3. Daftar Saran
    if (currentY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); currentY = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Daftar Saran & Masukan', 14, currentY);
    currentY += 6;

    autoTable(doc, {
        head: [['No', 'Jenjang', 'Kelas', 'Saran', 'Status']],
        body: saran.map((s, i) => [
            String(i + 1), s.jenjang, s.kelas, s.judul,
            s.status === 'pending' ? 'Menunggu' : s.status === 'disetujui' ? 'Disetujui' : 'Ditolak'
        ]),
        startY: currentY,
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [16, 185, 129] /* Green for saran */, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Halaman ${hookData.pageNumber} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        },
    });

    doc.save(`laporan-rekapitulasi-admin-${new Date().getTime()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT PROPOSAL KEGIATAN KE PDF (Format Proposal Resmi)
// ═══════════════════════════════════════════════════════════════════════════

interface ProposalPDFData {
    judul: string;
    jenjangNama: string;
    tanggalKegiatan: string;
    tempat: string;
    pendahuluan: string;
    jadwal: { nama_kegiatan: string; waktu_kegiatan: string; penanggung_jawab: string; tempat: string }[];
    tujuan: string;
    manfaat: string;
    anggaran: { item: string; jumlah: number; satuan: string; harga_satuan: number; total: number }[];
    totalAnggaran: number;
    penutup: string;
    pembuatNama: string;
    status: string;
}

export async function exportProposalToPDF(data: ProposalPDFData) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const formatRupiah = (num: number) => {
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    // ── Fungsi helper untuk teks paragraf panjang ────────────────────────
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string, i: number) => {
            if (y + lineHeight > pageHeight - 25) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, x, y);
            y += lineHeight;
        });
        return y;
    };

    // ── Fungsi untuk menambahkan footer di setiap halaman ────────────────
    const addFooter = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Dicetak: ${tanggalCetak}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
    };

    // ═════════════════════════════════════════════════════════════════════
    // HALAMAN 1: COVER
    // ═════════════════════════════════════════════════════════════════════

    // Border dekoratif
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.5);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

    // Header organisasi
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSAL KEGIATAN', pageWidth / 2, 50, { align: 'center' });
    doc.setFontSize(22);
    doc.text('KBM PRIMA', pageWidth / 2, 62, { align: 'center' });

    // Garis pemisah
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1);
    doc.line(60, 70, pageWidth - 60, 70);
    doc.setLineWidth(0.3);
    doc.line(60, 72, pageWidth - 60, 72);

    // Label dokumen
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('PROPOSAL KEGIATAN', pageWidth / 2, 95, { align: 'center' });

    // Judul proposal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const judulLines = doc.splitTextToSize(data.judul.toUpperCase(), contentWidth - 20);
    let judulY = 115;
    judulLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, judulY, { align: 'center' });
        judulY += 10;
    });

    // Info kegiatan
    const infoStartY = judulY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const infoItems = [
        { label: 'Jenjang', value: data.jenjangNama },
        { label: 'Tanggal', value: data.tanggalKegiatan },
        { label: 'Tempat', value: data.tempat },
    ];

    infoItems.forEach((item, i) => {
        const y = infoStartY + i * 10;
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}`, pageWidth / 2 - 30, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`:  ${item.value}`, pageWidth / 2 - 25, y);
    });

    // Status badge
    const statusY = infoStartY + infoItems.length * 10 + 15;
    const statusLabel = data.status === 'disetujui' ? 'DISETUJUI' :
        data.status === 'submitted' ? 'MENUNGGU PERSETUJUAN' :
            data.status === 'revisi' ? 'PERLU REVISI' :
                data.status === 'ditolak' ? 'DITOLAK' : 'DRAFT';

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const statusColor = data.status === 'disetujui' ? [16, 185, 129] :
        data.status === 'ditolak' ? [239, 68, 68] :
            data.status === 'revisi' ? [245, 158, 11] : [107, 114, 128];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Status: ${statusLabel}`, pageWidth / 2, statusY, { align: 'center' });

    // Footer cover
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Disusun oleh:', pageWidth / 2, pageHeight - 55, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(data.pembuatNama, pageWidth / 2, pageHeight - 47, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Guru Jenjang ${data.jenjangNama}`, pageWidth / 2, pageHeight - 41, { align: 'center' });

    // ═════════════════════════════════════════════════════════════════════
    // HALAMAN 2+: ISI PROPOSAL
    // ═════════════════════════════════════════════════════════════════════
    doc.addPage();
    let currentY = margin;

    const addSectionTitle = (num: string, title: string) => {
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = margin;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`${num}. ${title}`, margin, currentY);
        // Garis bawah section
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY + 2, margin + doc.getTextWidth(`${num}. ${title}`), currentY + 2);
        currentY += 10;
    };

    // ── BAB I: PENDAHULUAN ───────────────────────────────────────────────
    addSectionTitle('I', 'PENDAHULUAN');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    currentY = addWrappedText(data.pendahuluan, margin, currentY, contentWidth, 5.5);
    currentY += 8;

    // ── BAB II: JADWAL / RUNDOWN ─────────────────────────────────────────────
    addSectionTitle('II', 'JADWAL / RUNDOWN KEGIATAN');

    if (data.jadwal && data.jadwal.length > 0) {
        const jadwalBody = data.jadwal.map((j, i) => [
            String(i + 1),
            j.nama_kegiatan,
            j.waktu_kegiatan,
            j.penanggung_jawab,
            j.tempat
        ]);
        autoTable(doc, {
            head: [['No', 'Kegiatan', 'Jam', 'PIC', 'Tempat']],
            body: jadwalBody,
            startY: currentY,
            styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: margin, right: margin },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Tidak ada rincian jadwal.', margin, currentY);
        currentY += 10;
    }

    // ── BAB III: TUJUAN ──────────────────────────────────────────────────
    addSectionTitle('III', 'TUJUAN KEGIATAN');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    currentY = addWrappedText(data.tujuan, margin, currentY, contentWidth, 5.5);
    currentY += 8;

    // ── BAB IV: MANFAAT ──────────────────────────────────────────────────
    addSectionTitle('IV', 'MANFAAT KEGIATAN');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    currentY = addWrappedText(data.manfaat, margin, currentY, contentWidth, 5.5);
    currentY += 8;

    // ── BAB V: ANGGARAN ──────────────────────────────────────────────────
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
    }
    addSectionTitle('V', 'RENCANA ANGGARAN BIAYA');

    if (data.anggaran.length > 0) {
        const anggaranBody = data.anggaran.map((a, i) => [
            String(i + 1),
            a.item,
            String(a.jumlah),
            a.satuan,
            formatRupiah(a.harga_satuan),
            formatRupiah(a.total),
        ]);
        // Total row
        anggaranBody.push(['', '', '', '', 'TOTAL', formatRupiah(data.totalAnggaran)]);

        autoTable(doc, {
            head: [['No', 'Item', 'Jml', 'Satuan', 'Harga Satuan', 'Total']],
            body: anggaranBody,
            startY: currentY,
            styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            alternateRowStyles: { fillColor: [245, 250, 247] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                2: { halign: 'center', cellWidth: 15 },
                3: { cellWidth: 22 },
                4: { halign: 'right' },
                5: { halign: 'right', fontStyle: 'bold' },
            },
            willDrawCell: (cellData) => {
                if (cellData.row.index === anggaranBody.length - 1) {
                    doc.setFont('helvetica', 'bold');
                    cellData.cell.styles.fillColor = [220, 245, 235];
                }
            },
            margin: { left: margin, right: margin },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Tidak ada rincian anggaran.', margin, currentY);
        currentY += 10;
    }

    currentY += 5;

    // ── BAB VI: PENUTUP ──────────────────────────────────────────────────
    addSectionTitle('VI', 'PENUTUP');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    currentY = addWrappedText(data.penutup, margin, currentY, contentWidth, 5.5);
    currentY += 15;

    // ── Tanda Tangan ─────────────────────────────────────────────────────
    if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const ttdY1 = currentY + 10;
    const ttdRightX = pageWidth - margin - 50;

    // Baris 1: Ketua Muda-Mudi & KI/Wakil Kelompok
    doc.text('Ketua Muda-Mudi', margin, ttdY1);
    doc.text('(                              )', margin, ttdY1 + 22);

    doc.text('KI / Wakil Kelompok', ttdRightX, ttdY1);
    doc.text('(                              )', ttdRightX, ttdY1 + 22);

    // Baris 2: Penerobos 1 & Penyusun Proposal
    const ttdY2 = ttdY1 + 35;
    doc.text('Penerobos 1', margin, ttdY2);
    doc.text('(                              )', margin, ttdY2 + 22);

    doc.text('Penyusun Proposal,', ttdRightX, ttdY2);
    doc.setFont('helvetica', 'bold');
    doc.text(data.pembuatNama, ttdRightX, ttdY2 + 22);
    doc.setFont('helvetica', 'normal');

    // Baris 3: Mengetahui KU (Tengah)
    const ttdY3 = ttdY2 + 35;
    doc.text('Mengetahui', pageWidth / 2, ttdY3, { align: 'center' });
    doc.text('KU', pageWidth / 2, ttdY3 + 6, { align: 'center' });
    doc.text('(                              )', pageWidth / 2, ttdY3 + 28, { align: 'center' });

    // ── Footer semua halaman ─────────────────────────────────────────────
    addFooter();

    // ── Save ─────────────────────────────────────────────────────────────
    const safeName = data.judul.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 40);
    doc.save(`proposal-${safeName}-${Date.now()}.pdf`);
}
