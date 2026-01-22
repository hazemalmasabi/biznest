import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Building2, Calendar, Receipt, Briefcase, UserCog } from "lucide-react";
import { cookies } from "next/headers";
import { dictionaries, Locale } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LandingPage() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'ar') as Locale
  const dict = dictionaries[lang]

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-20 flex items-center justify-between border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center" href="#">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="ml-3 text-2xl font-bold text-gray-900 tracking-tight">BizNest</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6 items-center">
          <LanguageSwitcher />
          <Link className="text-base font-medium hover:text-blue-600 transition-colors" href="/login">
            {dict.common.signin}
          </Link>
          <Link href="/login?signup=true">
            <Button size="lg" className="text-base px-6 shadow-sm hover:shadow-md transition-all">{dict.common.get_started}</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  {dict.landing.hero_title}
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  {dict.landing.hero_subtitle}
                </p>
              </div>
              <div className="flex flex-row gap-4 justify-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <Link href="/login?signup=true">
                  <Button className="h-11 px-8" size="lg">
                    {dict.landing.start_trial}
                  </Button>
                </Link>
                <Link href="/help">
                  <Button variant="outline" className="h-11 px-8" size="lg">
                    {dict.help.title}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-700">
                  {lang === 'ar' ? "المميزات" : "Features"}
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  {dict.landing.features_title}
                </h2>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "الحجوزات" : "Bookings"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "إدارة مواعيد الحجوزات بسهولة" : "Manage booking appointments easily"}</p>
              </div>

              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "السندات" : "Bonds"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "إدارة سندات القبض والصرف" : "Manage receipt and payment bonds"}</p>
              </div>

              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 mb-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "العملاء" : "Customers"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "قاعدة بيانات متكاملة للعملاء" : "Integrated customer database"}</p>
              </div>

              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 mb-2">
                  <Briefcase className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "الخدمات" : "Services"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "تخصيص وإدارة الخدمات" : "Customize and manage services"}</p>
              </div>

              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 mb-2">
                  <UserCog className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "الموظفين" : "Employees"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "إدارة فريق العمل والصلاحيات" : "Manage team and permissions"}</p>
              </div>

              <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all bg-white h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-2">
                  <Building2 className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold">{lang === 'ar' ? "الفروع" : "Branches"}</h3>
                <p className="text-gray-500 text-center">{lang === 'ar' ? "إدارة فروع متعددة" : "Manage multiple branches"}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        </nav>
      </footer>
    </div>
  );
}
