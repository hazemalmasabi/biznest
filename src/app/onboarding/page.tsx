import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LanguageSwitcher } from "@/components/language-switcher"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ step?: string, businessId?: string, error?: string }>
}) {
    const { step: stepParam, businessId, error } = await searchParams
    const step = stepParam || 'business'

    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4 relative">
            <div className="absolute top-4 start-4 flex items-center gap-4">
                <Link href="/" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" />
                    {dict.common.back_to_home}
                </Link>
                <LanguageSwitcher />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{dict.onboarding.welcome_title}</CardTitle>
                    <CardDescription>
                        {step === 'business'
                            ? dict.onboarding.business_step_desc
                            : dict.onboarding.branch_step_desc}
                    </CardDescription>
                </CardHeader>
                {error && (
                    <div className="px-6 pb-2">
                        <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-md text-sm">
                            {error}
                        </div>
                    </div>
                )}

                <OnboardingForm
                    step={step}
                    businessId={businessId}
                    dict={dict}
                />
            </Card>
        </div>
    )
}
