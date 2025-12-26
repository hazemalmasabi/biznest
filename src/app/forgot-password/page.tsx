import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { cookies } from "next/headers";
import { dictionaries, Locale } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ForgotPasswordForm } from './form';

export default async function ForgotPasswordPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

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
                        {dict.common.forgot_password_title}
                    </CardTitle>
                    <CardDescription>
                        {dict.common.reset_password_title}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-3 items-start text-amber-800 text-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <p>{dict.common.owner_reset_notice}</p>
                    </div>
                    <ForgotPasswordForm dict={dict} />
                </CardContent>
            </Card>
        </div>
    )
}
