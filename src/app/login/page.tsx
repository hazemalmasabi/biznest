import { AuthForm } from './auth-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { cookies } from "next/headers";
import { dictionaries, Locale } from "@/lib/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowLeft } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string, signup: string, error: string }>
}) {
  const { signup, message, error } = await searchParams
  const isSignup = signup === 'true'

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
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isSignup ? dict.common.create_account : dict.common.signin}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? dict.common.create_account
              : dict.common.welcome_back}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            isSignup={isSignup}
            dict={dict}
            message={message}
            error={error}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center text-slate-500">
            {isSignup ? dict.common.already_have_account + ' ' : dict.common.dont_have_account + ' '}
            <Link href={isSignup ? '/login' : '/login?signup=true'} className="underline underline-offset-4 hover:text-slate-900">
              {isSignup ? dict.common.signin : dict.common.signup}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
