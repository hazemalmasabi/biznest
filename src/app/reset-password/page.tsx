import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { cookies } from "next/headers";
import { dictionaries, Locale } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowLeft } from 'lucide-react';
import { ResetPasswordForm } from './form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ResetPasswordPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    // Verify session exists - users must be authenticated via the email link code exchange
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // If no session, the link might be expired or invalid
        redirect('/login?error=Invalid or expired link')
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4 relative">
            <div className="absolute top-4 start-4 flex items-center gap-4">
                <Link href="/login" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" />
                    {dict.common.back_to_login}
                </Link>
                <LanguageSwitcher />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        {dict.common.set_new_password}
                    </CardTitle>
                    <CardDescription>
                        {dict.common.password_rules}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResetPasswordForm dict={dict} />
                </CardContent>
            </Card>
        </div>
    )
}
