'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SessionGuard({ userId }: { userId: string }) {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // 1. Check immediately on mount
        const checkStatus = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('is_deleted')
                .eq('id', userId)
                .single()

            if (data?.is_deleted) {
                await supabase.auth.signOut()
                window.location.href = '/login?error=account_disabled'
            }
        }
        checkStatus()

        // 2. Subscribe to Realtime changes
        const channel = supabase
            .channel(`profile_guard_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                async (payload) => {
                    if (payload.new.is_deleted) {
                        await supabase.auth.signOut()
                        window.location.href = '/login?error=account_disabled'
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, router])

    return null
}
