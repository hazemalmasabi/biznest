import { HelpContent } from "./help-content"
import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"

export default async function HelpPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    return <HelpContent dict={dict} lang={lang} />
}
