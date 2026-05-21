const nodemailer = require('nodemailer');

const getTrimmedEnv = (key, fallback = '') => String(process.env[key] ?? fallback).trim();
let transportPromise = null;
const SMTP_CONNECTION_TIMEOUT = Number(getTrimmedEnv('MAIL_CONNECTION_TIMEOUT_MS', '10000')) || 10000;
const SMTP_GREETING_TIMEOUT = Number(getTrimmedEnv('MAIL_GREETING_TIMEOUT_MS', '10000')) || 10000;
const SMTP_SOCKET_TIMEOUT = Number(getTrimmedEnv('MAIL_SOCKET_TIMEOUT_MS', '20000')) || 20000;
const RESEND_API_URL = 'https://api.resend.com/emails';

const getMailProvider = () => {
    const configuredProvider = getTrimmedEnv('MAIL_PROVIDER').toLowerCase();

    if (configuredProvider) {
        return configuredProvider;
    }

    if (getTrimmedEnv('RESEND_API_KEY')) {
        return 'resend';
    }

    return 'smtp';
};

const formatMailError = (error) => {
    const message = String(error?.message || '');

    if (message.includes('Invalid login') || message.includes('Username and Password not accepted') || error?.responseCode === 535) {
        return 'Gmail rejected the login. Check that 2-Step Verification is enabled and that MAIL_PASS is the latest 16-character Google App Password.';
    }

    if (message.includes('Missing credentials')) {
        return 'Backend mail configuration is incomplete. Please check MAIL_USER and MAIL_PASS in backend/.env.';
    }

    if (message.includes('Connection timeout')) {
        return 'The mail server took too long to respond. Please verify the SMTP host, port, firewall access, and Render environment variables.';
    }

    if (message.includes('Greeting never received')) {
        return 'The SMTP server did not finish the handshake. Please recheck MAIL_HOST, MAIL_PORT, and MAIL_SECURE for Render.';
    }

    if (message.includes('resend')) {
        return message;
    }

    return message || 'Unable to send email right now.';
};

const createTransportFromEnv = async () => {
    const host = getTrimmedEnv('MAIL_HOST');
    const port = Number(getTrimmedEnv('MAIL_PORT', '587') || 587);
    const secure = getTrimmedEnv('MAIL_SECURE', 'false').toLowerCase() === 'true';
    const user = getTrimmedEnv('MAIL_USER');
    const pass = getTrimmedEnv('MAIL_PASS');

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure,
        connectionTimeout: SMTP_CONNECTION_TIMEOUT,
        greetingTimeout: SMTP_GREETING_TIMEOUT,
        socketTimeout: SMTP_SOCKET_TIMEOUT,
        auth: {
            user,
            pass
        }
    });
};

const getTransport = async () => {
    if (!transportPromise) {
        transportPromise = createTransportFromEnv();
    }

    return transportPromise;
};

const getMailFromEmail = () => getTrimmedEnv('MAIL_FROM_EMAIL') || getTrimmedEnv('RESEND_FROM_EMAIL') || getTrimmedEnv('MAIL_USER');
const getMailFromName = () => getTrimmedEnv('MAIL_FROM_NAME') || 'VISWASHANTHI HIGH SCHOOL';

const getSenderAddress = (schoolName) => {
    const fromEmail = getMailFromEmail();
    const fromName = schoolName || getMailFromName();

    if (!fromEmail) {
        return '';
    }

    return `"${fromName}" <${fromEmail}>`;
};

const normalizeRecipients = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return value ? [value] : [];
};

const sendWithResend = async ({ from, to, replyTo, subject, html, text, attachments = [] }) => {
    const apiKey = getTrimmedEnv('RESEND_API_KEY');

    if (!apiKey) {
        throw new Error('Resend API key is missing. Set RESEND_API_KEY in Render.');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is unavailable in this Node runtime, so Resend cannot be used.');
    }

    const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: normalizeRecipients(to),
            subject,
            html,
            text,
            reply_to: replyTo || undefined,
            attachments: attachments.length
                ? attachments.map((attachment) => ({
                    filename: attachment.filename,
                    content: Buffer.isBuffer(attachment.content)
                        ? attachment.content.toString('base64')
                        : attachment.content
                }))
                : undefined
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || data?.error || `Resend API request failed with status ${response.status}.`);
    }

    return data;
};

const sendEmail = async ({ from, to, replyTo, subject, html, text, attachments = [] }) => {
    if (getMailProvider() === 'resend') {
        return sendWithResend({ from, to, replyTo, subject, html, text, attachments });
    }

    const transport = await getTransport();

    if (!transport) {
        throw new Error('Backend mail configuration is missing.');
    }

    return transport.sendMail({
        from,
        to,
        replyTo,
        subject,
        html,
        text,
        attachments
    });
};

const verifyMailConfiguration = async () => {
    if (getMailProvider() === 'resend') {
        const hasResendConfig = Boolean(getTrimmedEnv('RESEND_API_KEY') && getMailFromEmail());

        return {
            configured: hasResendConfig,
            verified: hasResendConfig,
            message: hasResendConfig
                ? 'Resend API mail configuration detected.'
                : 'RESEND_API_KEY or MAIL_FROM_EMAIL is missing for Resend mail delivery.'
        };
    }

    const transport = await getTransport();

    if (!transport) {
        return {
            configured: false,
            verified: false,
            message: 'MAIL_HOST, MAIL_USER, or MAIL_PASS is missing.'
        };
    }

    try {
        await transport.verify();
        return {
            configured: true,
            verified: true,
            message: 'SMTP connection verified successfully.'
        };
    } catch (error) {
        return {
            configured: true,
            verified: false,
            message: formatMailError(error)
        };
    }
};

const getSchoolMailbox = () => getMailFromEmail() || getTrimmedEnv('MAIL_USER');
const getAdminInbox = () => getTrimmedEnv('ADMISSION_RECEIVER_EMAIL') || getSchoolMailbox();
const hasMailConfiguration = () =>
    getMailProvider() === 'resend'
        ? Boolean(getTrimmedEnv('RESEND_API_KEY') && getMailFromEmail())
        : Boolean(getTrimmedEnv('MAIL_HOST') && getTrimmedEnv('MAIL_USER') && getTrimmedEnv('MAIL_PASS'));

const emailShell = ({ title, eyebrow, bodyHtml, accent = '#17365d', footerText = '' }) => `
    <div style="margin:0;padding:24px;background:#eef4fb;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="max-width:720px;width:100%;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe7f5;">
            <div style="background:${accent};padding:28px 32px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d9e8fb;font-weight:700;">${eyebrow}</div>
                <div style="font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;margin-top:10px;">${title}</div>
            </div>
            <div style="padding:24px 20px;">
                ${bodyHtml}
            </div>
            <div style="padding:16px 20px;background:#f8fbff;border-top:1px solid #e5edf8;color:#64748b;font-size:12px;line-height:1.6;">
                ${footerText || 'VISWASHANTHI HIGH SCHOOL | Admissions & Enquiry Desk'}
            </div>
        </div>
    </div>
`;

const infoTable = (rows) => `
    <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d7e2ef;border-radius:14px;overflow:hidden;table-layout:fixed;">
        ${rows
            .map(
                ([label, value], index) => `
                    <tr style="background:${index % 2 === 0 ? '#f8fbff' : '#ffffff'};">
                        <td style="padding:12px 14px;width:36%;border-bottom:1px solid #d7e2ef;font-weight:700;color:#17365d;vertical-align:top;word-break:break-word;font-size:14px;line-height:1.45;">${label}</td>
                        <td style="padding:12px 14px;border-bottom:1px solid #d7e2ef;color:#334155;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;font-size:14px;line-height:1.6;">${value}</td>
                    </tr>
                `
            )
            .join('')}
    </table>
`;

const sendAdmissionNotification = async (admission, schoolProfile = {}) => {
    if (!hasMailConfiguration()) {
        return {
            sent: false,
            message: 'Backend mail configuration is missing.'
        };
    }

    const adminInbox = getAdminInbox();

    if (!adminInbox) {
        return {
            sent: false,
            message: 'Backend admission receiver email is missing.'
        };
    }

    const schoolName = schoolProfile.schoolName || 'VISWASHANTHI HIGH SCHOOL';
    const schoolAddress = schoolProfile.schoolAddress || 'Allagadda, Andhra Pradesh';
    const senderAddress = getSenderAddress(schoolName);
    const submittedAt = new Date(admission.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const adminHtml = emailShell({
        title: 'New Admission Application Received',
        eyebrow: 'Admin Notification',
        bodyHtml: `
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                A new admission enquiry has been submitted through the school website. The complete applicant details are listed below for review and follow-up.
            </p>
            ${infoTable([
                ['Application ID', admission._id],
                ['Student Name', admission.studentName],
                ['Applying For', admission.className],
                ['Parent / Guardian', admission.parentName],
                ['Phone Number', admission.phone],
                ['Email Address', admission.email],
                ['Home Address', admission.address],
                ['Submitted On', submittedAt]
            ])}
        `,
        accent: '#17365d',
        footerText: `${schoolName} | ${schoolAddress}`
    });

    const applicantHtml = emailShell({
        title: 'Your Application Has Been Received',
        eyebrow: 'Admission Confirmation',
        bodyHtml: `
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                Dear ${admission.parentName},<br><br>
                Thank you for submitting an admission application to ${schoolName}. We have successfully received your enquiry and our admissions team will review it shortly.
            </p>
            ${infoTable([
                ['Application ID', admission._id],
                ['Student Name', admission.studentName],
                ['Applying For', admission.className],
                ['Parent / Guardian', admission.parentName],
                ['Phone Number', admission.phone],
                ['Email Address', admission.email],
                ['Submitted On', submittedAt]
            ])}
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#334155;">
                Our team will contact you with the next steps. If you need urgent assistance, you may reply to this email or contact the school office directly.
            </p>
        `,
        accent: '#0f766e',
        footerText: `${schoolName} | ${schoolAddress}`
    });

    const mailResults = await Promise.allSettled([
        sendEmail({
            from: senderAddress,
            to: adminInbox,
            replyTo: admission.email,
            subject: `New admission enquiry: ${admission.studentName}`,
            html: adminHtml,
            text: `
New Admission Application
Application ID: ${admission._id}
Student Name: ${admission.studentName}
Class: ${admission.className}
Parent Name: ${admission.parentName}
Phone: ${admission.phone}
Email: ${admission.email}
Address: ${admission.address}
Submitted On: ${submittedAt}
            `.trim()
        }),
        sendEmail({
            from: senderAddress,
            to: admission.email,
            subject: `${schoolName} - Admission Application Received`,
            html: applicantHtml,
            text: `
Dear ${admission.parentName},

Your admission application for ${admission.studentName} has been received successfully.
Application ID: ${admission._id}
Class: ${admission.className}
Submitted On: ${submittedAt}

Our team will contact you soon with the next steps.
            `.trim()
        })
    ]);

    const failures = mailResults.filter((result) => result.status === 'rejected');

    if (failures.length) {
        const error = new Error(formatMailError(failures[0].reason));
        error.details = failures.map((result) => result.reason);
        throw error;
    }

    return {
        sent: true
    };
};

const sendAdmissionsReportEmail = async ({ recipientEmail, pdfBuffer, fileName, admissions, schoolName, schoolAddress }) => {
    if (!hasMailConfiguration()) {
        throw new Error('Backend mail configuration is missing.');
    }

    const reportHtml = emailShell({
        title: 'Admissions Report Ready',
        eyebrow: 'Bulk Admissions Report',
        bodyHtml: `
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                Please find attached the professionally formatted admissions report in PDF format. This report contains ${admissions.length} selected application${admissions.length === 1 ? '' : 's'} from the admin panel.
            </p>
            ${infoTable([
                ['School', schoolName || 'VISWASHANTHI HIGH SCHOOL'],
                ['Total Selected Records', String(admissions.length)],
                ['Generated On', new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
                ['Attachment', fileName]
            ])}
        `,
        accent: '#7c3aed',
        footerText: `${schoolName || 'VISWASHANTHI HIGH SCHOOL'} | ${schoolAddress || 'Allagadda, Andhra Pradesh'}`
    });

    await sendEmail({
        from: getSenderAddress(schoolName || 'VISWASHANTHI HIGH SCHOOL'),
        to: recipientEmail,
        subject: `${schoolName || 'VISWASHANTHI HIGH SCHOOL'} Admissions Report`,
        html: reportHtml,
        text: `Please find attached the admissions report for ${admissions.length} selected application(s).`,
        attachments: [
            {
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });
};

const sendContactNotification = async ({ contact, schoolName, schoolAddress }) => {
    if (!hasMailConfiguration()) {
        throw new Error('Backend mail configuration is missing.');
    }

    const adminInbox = getAdminInbox();
    const senderAddress = getSenderAddress(schoolName);
    const submittedAt = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const adminHtml = emailShell({
        title: 'New Website Contact Enquiry',
        eyebrow: 'Contact Form Submission',
        bodyHtml: `
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                A visitor submitted a message through the website contact form. Please find the enquiry details below.
            </p>
            ${infoTable([
                ['Full Name', contact.name],
                ['Email Address', contact.email],
                ['Phone Number', contact.phone],
                ['Submitted On', submittedAt],
                ['Message', contact.message]
            ])}
        `,
        accent: '#17365d',
        footerText: `${schoolName} | ${schoolAddress}`
    });

    const visitorHtml = emailShell({
        title: 'We Have Received Your Message',
        eyebrow: 'Contact Confirmation',
        bodyHtml: `
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                Dear ${contact.name},<br><br>
                Thank you for contacting ${schoolName}. We have received your message and our team will get back to you as soon as possible.
            </p>
            ${infoTable([
                ['Full Name', contact.name],
                ['Email Address', contact.email],
                ['Phone Number', contact.phone],
                ['Submitted On', submittedAt],
                ['Your Message', contact.message]
            ])}
        `,
        accent: '#0f766e',
        footerText: `${schoolName} | ${schoolAddress}`
    });

    await Promise.all([
        sendEmail({
            from: senderAddress,
            to: adminInbox,
            replyTo: contact.email,
            subject: `New contact enquiry from ${contact.name}`,
            html: adminHtml,
            text: `
New Contact Enquiry
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Submitted On: ${submittedAt}
Message: ${contact.message}
            `.trim()
        }),
        sendEmail({
            from: senderAddress,
            to: contact.email,
            subject: `${schoolName} - We received your message`,
            html: visitorHtml,
            text: `
Dear ${contact.name},

We have received your message and our team will contact you soon.

Message: ${contact.message}
Submitted On: ${submittedAt}
            `.trim()
        })
    ]);
};

module.exports = {
    sendAdmissionNotification,
    sendAdmissionsReportEmail,
    sendContactNotification,
    formatMailError,
    verifyMailConfiguration,
    hasMailConfiguration,
    getMailProvider
};
