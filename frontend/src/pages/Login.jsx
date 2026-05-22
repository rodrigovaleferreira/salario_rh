// frontend/src/pages/Login.jsx

import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, BarChart3, Lock, Mail } from "lucide-react"

import useAuthStore from "../store/authStore"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import Alert from "../components/ui/Alert"

// Validação client-side (complementar — backend valida de novo)
const schema = z.object({
  email: z
    .string()
    .min(1, "E-mail obrigatório")
    .email("E-mail inválido"),
  password: z
    .string()
    .min(1, "Senha obrigatória")
    .min(6, "Senha muito curta"),
})

export default function Login() {
  const navigate = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore((s) => s.login)

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState(null)
  const [isLoading, setIsLoading]       = useState(false)

  // Redireciona para onde o usuário tentou acessar antes do login
  const from = location.state?.from?.pathname || "/dashboard"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setIsLoading(true)
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (err) {
      // Mensagem genérica — não revela se email existe
      const msg =
        err.response?.data?.detail ||
        "Não foi possível realizar o login. Verifique suas credenciais."
      setServerError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
                          w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <BarChart3 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-surface-900">
            Plataforma de Salários
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Plataforma de Cargos &amp; Salários
          </p>
        </div>

        {/* Card de login */}
        <div className="card">
          <div className="card-body space-y-5">
            <div>
              <h2 className="text-base font-semibold text-surface-900">
                Entrar na plataforma
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Use suas credenciais de acesso
              </p>
            </div>

            {serverError && (
              <Alert
                type="error"
                message={serverError}
                dismissible
              />
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* E-mail */}
              <div className="relative">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Mail
                  size={14}
                  className="absolute right-3 top-[30px] text-surface-400
                             pointer-events-none"
                />
              </div>

              {/* Senha */}
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  error={errors.password?.message}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[28px] p-0.5
                             text-surface-400 hover:text-surface-600
                             transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword
                    ? <EyeOff size={14} />
                    : <Eye size={14} />
                  }
                </button>
              </div>

              {/* Esqueceu a senha */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-brand-600 hover:text-brand-700
                             hover:underline transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="w-full"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>

          <div className="card-footer">
            <p className="text-xs text-center text-surface-400">
              <Lock size={10} className="inline mr-1" />
              Conexão segura com criptografia de ponta a ponta
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          © {new Date().getFullYear()} SalaryPlatform. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}