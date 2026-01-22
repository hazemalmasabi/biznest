
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
})

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('SMTP credentials are not set. Email not sent.')
        return false
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"BizNest" <noreply@biznest.com>',
            to,
            subject,
            html,
        })
        console.log('Message sent: %s', info.messageId)
        return true
    } catch (error) {
        console.error('Error sending email:', error)
        return false
    }
}

export async function sendVerificationEmail(email: string, code: string) {
    const subject = 'رمز التحقق / Verification Code';

    // Bilingual HTML Template
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        
        <!-- Arabic Section -->
        <div style="padding: 20px; direction: rtl; text-align: right; background-color: #fff;">
            <h2 style="color: #333; text-align: center; margin-top: 0;">رمز التحقق</h2>
            <p style="color: #555; text-align: center;">استخدم الرمز التالي لتأكيد عملية الحجز:</p>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px; color: #2c3e50;">
                ${code}
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">تنتهي صلاحية هذا الرمز خلال 10 دقائق.</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 0;">

        <!-- English Section -->
        <div style="padding: 20px; direction: ltr; text-align: left; background-color: #fafafa;">
            <h2 style="color: #333; text-align: center; margin-top: 0;">Verification Code</h2>
            <p style="color: #555; text-align: center;">Use the following code to confirm your booking:</p>
            <div style="background-color: #fff; border: 1px solid #eee; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px; color: #2c3e50;">
                ${code}
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">This code expires in 10 minutes.</p>
        </div>
        
    </div>
    `;

    return sendEmail({ to: email, subject, html })
}

// Helper to generate Confirmation HTML
export function getBookingConfirmationHtml(booking: any) {
    // Format Dates (Start and End)
    // We display full date-time strings for clarity in both langs

    // Arabic Date Formats
    const startAr = new Date(booking.start_time).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    const endAr = new Date(booking.end_time).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

    // English Date Formats
    const startEn = new Date(booking.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const endEn = new Date(booking.end_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const details = {
        ref: booking.id, // Display ID instead of Token
        service: booking.service?.name,
        serviceDesc: booking.service?.description,
        branch: booking.branch?.name,
        branchPhone: booking.branch?.phone,
        branchAddress: booking.branch?.address,
        branchLocation: booking.branch?.location_url,
        price: booking.price,
        paid: booking.paid_amount,
        remaining: Number(booking.price) - Number(booking.paid_amount),
        duration: `${booking.duration_value} ${booking.duration_unit === 'minute' ? 'دقيقة/Min' : booking.duration_unit === 'hour' ? 'ساعة/Hour' : booking.duration_unit}`,
        link: `${process.env.APP_URL || 'http://localhost:3000'}/${booking.branch?.slug}/${booking.token}` // Token usually stays in link for security
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        
        <!-- Arabic Section -->
        <div style="padding: 20px; direction: rtl; text-align: right; background-color: #fff;">
            <h2 style="color: #2e7d32; text-align: center; margin-top: 0;">تم استلام طلب الحجز!</h2>
            <p>عزيزي ${booking.customer?.name || 'العميل'}،</p>
            <p>تم استلام طلبك بنجاح. تفاصيل الحجز:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>رقم الحجز:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${details.ref}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>الخدمة:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.service}
                        ${details.serviceDesc ? `<br><span style="font-size: 12px; color: #666;">${details.serviceDesc}</span>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>الفرع:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.branch}
                        ${details.branchPhone ? `<br><span style="font-size: 12px; color: #666;">جوال: ${details.branchPhone}</span>` : ''}
                        ${details.branchAddress ? `<br><span style="font-size: 12px; color: #666;">العنوان: ${details.branchAddress}</span>` : ''}
                        ${details.branchLocation ? `<br><a href="${details.branchLocation}" style="font-size: 12px; color: #1976d2;" target="_blank">موقع الفرع على الخريطة</a>` : ''}
                    </td>
                </tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>وقت البداية:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${startAr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>وقت النهاية:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${endAr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>المدة:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.duration_value} ${booking.duration_unit === 'minute' ? 'دقيقة' : 'ساعة'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>السعر الكلي:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.price}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>حالة الحجز:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">قيد المراجعة</td></tr>
            </table>

            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold; color: #0d47a1;">لإكمال تأكيد الحجز، يرجى التواصل مع الفرع أو دفع العربون (إذا طُلب ذلك).</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${details.link}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">عرض التفاصيل والدفع</a>
            </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 0;">

        <!-- English Section -->
        <div style="padding: 20px; direction: ltr; text-align: left; background-color: #fafafa;">
            <h2 style="color: #2e7d32; text-align: center; margin-top: 0;">Booking Received!</h2>
            <p>Dear ${booking.customer?.name || 'Customer'},</p>
            <p>We have received your booking request. Details below:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${details.ref}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.service}
                        ${details.serviceDesc ? `<br><span style="font-size: 12px; color: #666;">${details.serviceDesc}</span>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Branch:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.branch}
                        ${details.branchPhone ? `<br><span style="font-size: 12px; color: #666;">Phone: ${details.branchPhone}</span>` : ''}
                        ${details.branchAddress ? `<br><span style="font-size: 12px; color: #666;">Address: ${details.branchAddress}</span>` : ''}
                        ${details.branchLocation ? `<br><a href="${details.branchLocation}" style="font-size: 12px; color: #1976d2;" target="_blank">View on Map</a>` : ''}
                    </td>
                </tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Start Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${startEn}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>End Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${endEn}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Duration:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.duration_value} ${booking.duration_unit}s</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Price:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.price}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Under Review</td></tr>
            </table>

            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold; color: #0d47a1;">To finalize your booking, please contact the branch or proceed with deposit payment (if required).</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${details.link}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Details & Pay</a>
            </div>
        </div>
    </div>
    `;
}

export async function sendBookingConfirmationEmail(booking: any) {
    console.log(`[Email Debug] Preparing Confirmation Email for Booking ${booking.id}`);
    console.log(`[Email Debug] Branch Data:`, booking.branch);
    console.log(`[Email Debug] Service Data:`, booking.service);

    const subject = 'تأكيد الحجز / Booking Confirmation ✅';
    const html = getBookingConfirmationHtml(booking);
    return sendEmail({ to: booking.customer.email, subject, html })
}

// Helper to generate Cancellation HTML
export function getBookingCancellationHtml(booking: any) {
    // Format Dates
    const startAr = new Date(booking.start_time).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    const endAr = new Date(booking.end_time).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

    const startEn = new Date(booking.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const endEn = new Date(booking.end_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const details = {
        ref: booking.id, // ID instead of Token
        service: booking.service?.name,
        branch: booking.branch?.name,
        branchPhone: booking.branch?.phone,
        price: booking.price,
        reason: booking.notes,
        link: `${process.env.APP_URL || 'http://localhost:3000'}/${booking.branch?.slug}/${booking.token}`
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        
        <!-- Arabic Section -->
        <div style="padding: 20px; direction: rtl; text-align: right; background-color: #fff;">
            <h2 style="color: #d32f2f; text-align: center; margin-top: 0;">عذراً، تم إلغاء الحجز</h2>
            <p>عزيزي ${booking.customer?.name || 'العميل'}،</p>
            <p>نأسف لإبلاغكم بأنه تم إلغاء حجزكم. إليك التفاصيل:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>رقم الحجز:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${details.ref}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>الخدمة:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.service}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>الفرع:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.branch}
                        ${details.branchPhone ? `<br><span style="font-size: 12px; color: #666;">جوال: ${details.branchPhone}</span>` : ''}
                    </td>
                </tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>وقت البداية:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${startAr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>وقت النهاية:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${endAr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>السعر:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.price}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; color: #d32f2f;"><strong>سبب الإلغاء:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${details.reason || 'غير محدد'}</td>
                </tr>
            </table>

            <div style="background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold; color: #c62828;">يرجى التواصل مع الفرع لإعادة جدولة الحجز أو استرجاع العربون (إن وجد).</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${details.link}" style="background-color: #757575; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">عرض التفاصيل</a>
            </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 0;">

        <!-- English Section -->
        <div style="padding: 20px; direction: ltr; text-align: left; background-color: #fafafa;">
            <h2 style="color: #d32f2f; text-align: center; margin-top: 0;">Booking Cancelled</h2>
            <p>Dear ${booking.customer?.name || 'Customer'},</p>
            <p>We regret to inform you that your booking has been cancelled. Details beneath:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${details.ref}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.service}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Branch:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        ${details.branch}
                        ${details.branchPhone ? `<br><span style="font-size: 12px; color: #666;">Phone: ${details.branchPhone}</span>` : ''}
                    </td>
                </tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Start Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${startEn}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>End Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${endEn}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Price:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${details.price}</td></tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; color: #d32f2f;"><strong>Cancellation Reason:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${details.reason || 'Not specified'}</td>
                </tr>
            </table>

            <div style="background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold; color: #c62828;">Please contact the branch to reschedule or request a refund (if applicable).</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${details.link}" style="background-color: #757575; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Details</a>
            </div>
        </div>
    </div>
    `;
}

export async function sendBookingCancellationEmail(booking: any) {
    console.log(`[Email Debug] Preparing Cancellation Email for Booking ${booking.id}`);
    console.log(`[Email Debug] Cancellation Reason: ${booking.notes}`);

    const subject = 'إلغاء الحجز / Booking Cancelled ❌';
    const html = getBookingCancellationHtml(booking);
    return sendEmail({ to: booking.customer.email, subject, html })
}
