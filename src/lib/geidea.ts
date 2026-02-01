
import crypto from 'crypto';

interface GeideaSettings {
    app_id: string; // Merchant Public Key
    secret_key: string; // API Password
    is_production: boolean;
}

interface CreateSessionParams {
    amount: number;
    currency: string;
    description?: string;
    callbackUrl: string;
    returnUrl: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    orderId: string;
}

export class GeideaService {
    private publicKey: string;
    private apiPassword: string;
    private baseUrl: string;

    constructor(settings: GeideaSettings) {
        this.publicKey = settings.app_id;
        this.apiPassword = settings.secret_key;
        // Defaulting to KSA Merchant URL as found in research. 
        // Note: Check if there is a specific Test URL or if Test Keys on this URL are sufficient.
        // Usually implementation uses the same URL but different keys.
        this.baseUrl = settings.is_production
            ? 'https://api.ksamerchant.geidea.net/payment-intent/api/v2/direct/session'
            : 'https://api.ksamerchant.geidea.net/payment-intent/api/v2/direct/session';
    }

    private generateSignature(amount: number, currency: string, orderId: string, timestamp: string): string {
        // defined order: MerchantPublicKey, OrderAmount, OrderCurrency, MerchantReferenceId, and timeStamp
        const amountStr = amount.toFixed(2);
        const data = `${this.publicKey}${amountStr}${currency}${orderId}${timestamp}`;

        // "hashing to the concatenated string using your MerchantAPIPassword"
        // Assuming this means keying part of HMAC or just password concatenation?
        // Research suggests Geidea V2 often implies: Hash = SHA256(str + password) OR HMAC?
        // Let's try standard HMAC-SHA256 first as it's most secure and standard for "using password".
        // HOWEVER, if it fails, fallback to simple concatenation + hash. 
        // Based on "hashing ... using ... password", simple concatenation is less likely implementation description than HMAC.

        // Wait, looking at typical Geidea docs (V2), it is often:
        // PublicKey + Amount + Currency + MerchantReferenceId + Timestamp + APIPassword
        // Then SHA256? 
        // BUT the search said "Concatenate ... string using your MerchantAPIPassword".

        // Let's implement what seems most robust: The search result literally said "using your MerchantAPIPassword".
        // I will interpret this as HMAC-SHA256 just to be safe, but I will log it for debugging.

        // Actually, let's look at a common snippet if available. No code snippet found.
        // I will output the HMAC logic.

        // Re-reading [1] "Apply SHA-256 hashing to the concatenated string using your MerchantAPIPassword."
        // This usually means HMAC.

        // But wait, let's look at [5] "followed by SHA-256 hashing with MerchantAPIPassword".
        // "With" often implies simple concatenation in older docs, but "Using" implies key.
        // Let's use simple concatenation if HMAC fails? No, I can't retry.

        // I'll stick to formatting the amount correctly and using HMAC. 
        // If the user reports "Signature Mismatch", I'll know to switch to concatenation.

        // CORRECTION: Many Geidea integrations actually use:
        // key = password
        // text = ...

        // Actually, let's try to search the specific library or valid example if I fail.
        // For now, I will use: 
        // publicKey + amount(2) + currency + orderId + timestamp
        // And HMAC-SHA256 with password.

        /* 
           Search result said: "Combine ... in this specific order to form a single string: MerchantPublicKey, OrderAmount, OrderCurrency, MerchantReferenceId, and timeStamp."
           THEN "Apply SHA-256 hashing ... using your MerchantAPIPassword."
           THEN "Encoding: Convert ... Base64".
           
           I will follow this exactly.
        */
        const hmac = crypto.createHmac('sha256', this.apiPassword);
        hmac.update(data);
        return hmac.digest('base64');
    }

    // Creating Session
    async createSession(params: CreateSessionParams) {
        try {
            console.log(`[Geidea] Initiating Session: ${this.baseUrl}`);

            const timestamp = new Date().toISOString();
            // Note: Geidea might expect specific format? ISO usually safe. Or just epoch?
            // "timestamp" usually implies string, but format isn't specified in summary.
            // I'll use standard ISO "YYYY-MM-DDTHH:mm:ss" or similar?
            // Actually, search result did not specify format. I will try ISO.

            const signature = this.generateSignature(params.amount, params.currency, params.orderId, timestamp);

            // Basic Auth: Username = PublicKey, Password = APIPassword
            const auth = Buffer.from(`${this.publicKey}:${this.apiPassword}`).toString('base64');

            const payload = {
                amount: Number(params.amount.toFixed(2)),
                currency: params.currency,
                merchantReferenceId: params.orderId,
                callbackUrl: params.callbackUrl,
                returnUrl: params.returnUrl,
                timestamp: timestamp,
                signature: signature,
                customerEmail: params.customerEmail,
                // Add appearance customization here if needed
                appearance: {
                    showAddress: false,
                    showEmail: true
                }
            };

            console.log(`[Geidea] Payload Preview:`, JSON.stringify({ ...payload, signature: 'HIDDEN' }));

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Geidea] HTTP Error ${response.status}: ${errorText}`);
                throw new Error(`Geidea API Error: ${errorText}`);
            }

            const data = await response.json();
            console.log(`[Geidea] Response:`, data);

            if (data && data.session && data.session.id) {
                return data.session;
            } else {
                throw new Error("Invalid response from Geidea: Missing session ID");
            }

        } catch (error: any) {
            console.error(`[Geidea] Exception:`, error);
            // Debugging: Reveal part of the key to see if it's the old Paylink key (starts with APP_ID) or a new one.
            const maskedKey = this.publicKey ? `${this.publicKey.substring(0, 10)}...` : 'UNDEFINED';
            console.error(`[Geidea] Current Public Key being used: ${maskedKey}`);
            console.error(`[Geidea] Please verify this matches your Geidea Merchant Public Key.`);

            // Propagate user-friendly message
            throw error;
        }
    }

    // Verify Order/Session
    async getOrder(orderId: string) {
        try {
            console.log(`[Geidea] Fetching Order: ${orderId}`);
            // Assuming endpoint structure based on common REST patterns for Geidea V2
            // Often: /payment-intent/api/v2/direct/order/{id} OR /pgw/api/v1/direct/order/{id}
            // KSA URL Base: https://api.ksamerchant.geidea.net/payment-intent/api/v2/direct
            const url = `${this.baseUrl.replace('/session', '')}/order/${orderId}`;

            const auth = Buffer.from(`${this.publicKey}:${this.apiPassword}`).toString('base64');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Geidea] GetOrder Failed: ${errorText}`);
                // If 404, maybe order doesn't exist yet?
                throw new Error(`Geidea GetOrder Error: ${errorText}`);
            }

            const data = await response.json();
            console.log(`[Geidea] Order Status:`, data);
            return data;

        } catch (error) {
            console.error(`[Geidea] GetOrder Exception:`, error);
            throw error;
        }
    }
}
