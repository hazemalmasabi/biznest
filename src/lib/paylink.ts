import { Database } from './supabase/database.types'

export interface PaylinkProduct {
    title: string
    price: number
    qty: number
    description?: string
    isDigital?: boolean
    imageSrc?: string
    specificVat?: number
    productCost?: number
}

export interface PaylinkInvoiceRequest {
    amount: number
    callBackUrl: string
    clientEmail: string
    clientMobile: string
    clientName: string
    note?: string
    orderNumber: string
    products: PaylinkProduct[]
}

export class PaylinkService {
    private appId: string
    private secretKey: string
    private isProduction: boolean
    private baseUrl: string

    constructor(appId: string, secretKey: string, isProduction: boolean) {
        this.appId = appId
        this.secretKey = secretKey
        this.isProduction = isProduction
        this.baseUrl = isProduction
            ? 'https://restapi.paylink.sa'
            : 'https://restpilot.paylink.sa'
    }

    private async authenticate() {
        console.log(`[Paylink] Authenticating to ${this.baseUrl} with AppID: ${this.appId}`)
        try {
            const response = await fetch(`${this.baseUrl}/api/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'BizNest-Client/1.0',
                    'Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                },
                body: JSON.stringify({
                    apiId: this.appId,
                    secretKey: this.secretKey,
                    persistToken: true,
                }),
            })

            if (!response.ok) {
                if (response.status >= 500) {
                    console.error(`[Paylink] Server Error: ${response.status}`)
                    throw new Error("Paylink Payment Service is currently unavailable (System Maintenance). Please try again later.")
                }
                const errorText = await response.text()
                console.error(`[Paylink] Auth Failed: ${response.status} ${response.statusText}`, errorText)
                throw new Error(
                    `Paylink Authentication Failed: ${response.status} ${errorText}`
                )
            }

            const data = await response.json()
            return data.id_token
        } catch (error: any) {
            console.error("[Paylink] Auth Network/Server Error:", error)
            // Return user-friendly error for network/timeout
            if (error.message && (error.message.includes('fetch') || error.message.includes('unavailable'))) {
                throw new Error("Payment service connection failed. Please check your internet or try again later.")
            }
            throw error
        }
    }

    async createInvoice(invoice: PaylinkInvoiceRequest) {
        const token = await this.authenticate()

        const response = await fetch(`${this.baseUrl}/api/addInvoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(invoice),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `Paylink Create Invoice Failed: ${response.status} ${errorText}`
            )
        }

        return response.json()
    }

    async getInvoice(transactionNo: string) {
        const token = await this.authenticate()

        const response = await fetch(
            `${this.baseUrl}/api/getInvoice/${transactionNo}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `Paylink Get Invoice Failed: ${response.status} ${errorText}`
            )
        }

        return response.json()
    }
}
