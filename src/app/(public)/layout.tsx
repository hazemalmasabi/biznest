import { Inter, Cairo } from 'next/font/google'
import "@/app/globals.css"
import { getDictionary } from '@/lib/dictionaries'
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })
const cairo = Cairo({ subsets: ['arabic'] })

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'

    return (
        <div className={`min-h-screen ${lang === 'ar' ? cairo.className : inter.className}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {children}
        </div>
    )
}
