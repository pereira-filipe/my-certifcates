import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { useLogin, useMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/i18n'
import { safeNextPath } from '@/lib/redirect'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, t('login.emailRequired'))
    .pipe(z.email(t('login.emailInvalid'))),
  password: z.string().min(1, t('login.passwordRequired')),
})

type LoginForm = z.infer<typeof schema>

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return t('login.invalid')
    if (error.status === 429) return t('login.blocked')
    if (error.status === 0) return t('errors.network')
  }
  return t('errors.generic')
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const expired = searchParams.get('expired') === '1'
  const navigate = useNavigate()
  const me = useMe()
  const login = useLogin()

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  if (me.data) return <Navigate to={next} replace />

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => navigate(next, { replace: true }) }),
  )

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {expired && !login.isError && (
              <Alert>
                <AlertDescription>{t('login.expired')}</AlertDescription>
              </Alert>
            )}
            {login.isError && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage(login.error)}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...form.register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...form.register('password')}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
