'use client'

import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
    const toggleLanguage = () => {
        const currentLang = document.documentElement.lang
        const newLang = currentLang === 'ar' ? 'en' : 'ar'
        const newDir = newLang === 'ar' ? 'rtl' : 'ltr'

        document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`
        document.documentElement.lang = newLang
        document.documentElement.dir = newDir
        window.location.reload()
    }

    return (
        <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Change Language">
            <Languages className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    )
}
