import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Phone } from 'lucide-react'
import { PublicBookingClient } from './client'

// Helper Types
type Service = {
    id: number
    name: string
    description: string | null
    price: number
    duration: 'hour' | 'day' | 'open'
    image_url: string | null
    branch_id: number
}

type ServiceDuration = {
    id: number
    service_id: number
    duration_value: number
    duration_unit: 'minute' | 'hour' | 'day' | 'open'
    price: number
}

// Fetch Data
async function getPublicBranchData(slug: string) {
    const supabase = await createAdminClient()

    // 1. Fetch Branch
    const { data: branch } = await supabase
        .from('branches')
        .select(`
            id,
            name,
            name,
            address,
            phone,
            is_main,
            business_id,
            image_url,
            location_url,
            description,
            social_x,
            social_youtube,
            social_instagram,
            social_facebook,
            social_snapchat,
            social_telegram,
            social_whatsapp,
            businesses (
                name
            )
        `)
        .eq('slug', slug)
        .eq('is_deleted', false)
        .single()

    if (!branch) return null

    // 2. Fetch Services
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('is_deleted', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (!services || services.length === 0) return { branch, services: [], durations: [] }

    // 3. Fetch Durations
    const serviceIds = services.map((s: any) => s.id)
    const { data: durations } = await supabase
        .from('service_durations')
        .select('*')
        .in('service_id', serviceIds)

    const { data: workingHours } = await supabase
        .from('branch_working_hours')
        .select('*')
        .eq('branch_id', branch.id)

    const { data: paymentSettings } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('branch_id', branch.id)
        .single()

    return {
        branch,
        services: services as Service[],
        durations: (durations || []) as ServiceDuration[],
        workingHours: (workingHours || []) as any[],
        paymentSettings
    }
}

export default async function BranchPublicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const data = await getPublicBranchData(slug)

    if (!data) {
        notFound()
    }

    // Prepare data for client
    const branchForClient = {
        ...data.branch,
        businesses: Array.isArray((data.branch as any).businesses)
            ? { name: (data.branch as any).businesses[0]?.name, logo_url: null }
            : { name: (data.branch as any).businesses?.name, logo_url: null }
    }

    return (
        <PublicBookingClient
            branch={branchForClient as any}
            services={data.services}
            durations={data.durations}
            workingHours={(data.workingHours || []) as any[]}
            paymentSettings={data.paymentSettings}
        />
    )
}
