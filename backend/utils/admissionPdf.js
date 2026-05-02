const PDFDocument = require('pdfkit');

const SCHOOL_NAME = 'VISWASHANTHI HIGH SCHOOL';
const SCHOOL_ADDRESS = 'Allagadda, Andhra Pradesh';
const TABLE_X = 26;
const TABLE_WIDTH = 760;
const PAGE_BOTTOM = 548;

const formatSummaryDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

const formatSummaryTime = (value) =>
    new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });

const formatDate = (value) => {
    try {
        return new Date(value).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return '';
    }
};

const drawReportHeader = (doc, { schoolName, schoolAddress, subtitle, admissionsCount, exportedAt, title }) => {
    doc.rect(0, 0, doc.page.width, 112).fill('#0f2f57');

    doc.font('Helvetica-Bold').fontSize(24).fillColor('#ffffff').text(schoolName, 26, 24);
    doc.font('Helvetica').fontSize(11).fillColor('#dbe8f8').text(schoolAddress, 26, 56).text(subtitle, 26, 74);

    doc.roundedRect(598, 18, 188, 68, 12).fill('#1e4f87');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text('Export Summary', 624, 34);
    doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#e8f1fb')
        .text(`Records: ${admissionsCount}`, 624, 50)
        .text(`Date: ${exportedAt.date}`, 624, 63, { width: 148 })
        .text(`Time: ${exportedAt.time}`, 624, 74, { width: 148 });

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#17365d').text(title, 26, 126);
};

const drawTableBorders = (doc, y, rowHeight, columns, header = false) => {
    const stroke = header ? '#17365d' : '#b9c8d8';
    const fill = header ? '#17365d' : '#ffffff';

    doc.save();
    doc.lineWidth(header ? 1.1 : 0.8);
    doc.fillColor(fill).strokeColor(stroke);
    doc.rect(TABLE_X, y, TABLE_WIDTH, rowHeight).fillAndStroke();

    let x = TABLE_X;
    columns.forEach((column, index) => {
        if (index > 0) {
            doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke(stroke);
        }
        x += column.width;
    });
    doc.restore();
};

const columns = [
    { key: 'studentName', label: 'Student', width: 118 },
    { key: 'className', label: 'Class', width: 88, align: 'center' },
    { key: 'parentName', label: 'Parent', width: 118 },
    { key: 'phone', label: 'Phone', width: 102 },
    { key: 'email', label: 'Email', width: 152 },
    { key: 'address', label: 'Address', width: 112 },
    { key: 'submitted', label: 'Submitted', width: 70, align: 'center' }
];

const drawHeaderRow = (doc, y) => {
    const height = 30;
    drawTableBorders(doc, y, height, columns, true);

    let x = TABLE_X;
    columns.forEach((column) => {
        doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#ffffff')
            .text(column.label, x + 8, y + 9, {
                width: column.width - 16,
                align: column.align || 'left'
            });
        x += column.width;
    });

    return height;
};

const getCellText = (admission, key) => {
    if (key === 'submitted') {
        return formatDate(admission.createdAt);
    }

    return String(admission[key] || '-');
};

const getRowHeight = (doc, admission) => {
    const heights = columns.map((column) =>
        doc.heightOfString(getCellText(admission, column.key), {
            width: column.width - 16,
            align: column.align || 'left'
        })
    );

    return Math.max(34, Math.max(...heights) + 18);
};

const drawAdmissionRow = (doc, admission, y) => {
    const rowHeight = getRowHeight(doc, admission);
    drawTableBorders(doc, y, rowHeight, columns, false);

    let x = TABLE_X;
    columns.forEach((column) => {
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#1f2937')
            .text(getCellText(admission, column.key), x + 8, y + 9, {
                width: column.width - 16,
                align: column.align || 'left'
            });
        x += column.width;
    });

    return rowHeight;
};

const buildAdmissionsPdfBuffer = async ({ admissions, schoolName, schoolAddress, title, subtitle }) => {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 26,
        bufferPages: true
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    const done = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });

    const reportConfig = {
        schoolName: schoolName || SCHOOL_NAME,
        schoolAddress: schoolAddress || SCHOOL_ADDRESS,
        title: title || 'Admission Applications Report',
        subtitle: subtitle || 'Prepared by the admissions admin panel',
        admissionsCount: admissions.length,
        exportedAt: {
            date: formatSummaryDate(new Date()),
            time: formatSummaryTime(new Date())
        }
    };

    drawReportHeader(doc, reportConfig);
    let y = 162;
    y += drawHeaderRow(doc, y);

    admissions.forEach((admission) => {
        const rowHeight = getRowHeight(doc, admission);

        if (y + rowHeight > PAGE_BOTTOM) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 26 });
            drawReportHeader(doc, reportConfig);
            y = 162;
            y += drawHeaderRow(doc, y);
        }

        y += drawAdmissionRow(doc, admission, y);
    });

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(index);
        doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#64748b')
            .text(
                `VISWASHANTHI HIGH SCHOOL | Admissions Report | Page ${index + 1} of ${range.count}`,
                26,
                570,
                { width: 760, align: 'center' }
            );
    }

    doc.end();
    return done;
};

module.exports = {
    buildAdmissionsPdfBuffer
};
