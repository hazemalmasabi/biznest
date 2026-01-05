
import { HelpContent } from "@/app/dashboard/help/help-content"
import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"

export default async function PublicHelpPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="px-4 lg:px-6 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50">
                <Link className="flex items-center justify-center" href="/">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <span className="ml-3 text-2xl font-bold text-gray-900 tracking-tight">BizNest</span>
                </Link>
                <div className="flex gap-4 items-center">
                    <LanguageSwitcher />
                    <Link href="/login">
                        <Button>{dict.common.signin}</Button>
                    </Link>
                </div>
            </header>
            <main className="container py-8">
                <HelpContent dict={dict} lang={lang} />
            </main>
        </div>
    )
}
