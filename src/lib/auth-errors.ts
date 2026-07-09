// Traduz as mensagens de erro do Supabase Auth (que vêm em inglês) para
// português, com textos amigáveis para o usuário final. Mensagens não
// mapeadas caem no texto original (para não esconder informação de diagnóstico).

interface AuthErrorTranslation {
    /** Trecho (em minúsculas) a procurar na mensagem original. */
    match: string;
    pt: string;
}

const AUTH_ERROR_TRANSLATIONS: AuthErrorTranslation[] = [
    {
        match: "user already registered",
        pt: 'Este e-mail já está cadastrado. Use a aba "Entrar" para acessar sua conta.',
    },
    {
        match: "invalid login credentials",
        pt: "E-mail ou senha incorretos. Verifique e tente novamente.",
    },
    {
        match: "email not confirmed",
        pt: "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam).",
    },
    {
        match: "password should be at least",
        pt: "A senha deve ter pelo menos 6 caracteres.",
    },
    {
        match: "signup requires a valid password",
        pt: "Digite uma senha válida (mínimo de 6 caracteres).",
    },
    {
        match: "unable to validate email address",
        pt: "E-mail em formato inválido. Confira o endereço digitado.",
    },
    {
        match: "email rate limit exceeded",
        pt: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
    },
    {
        match: "for security purposes",
        pt: "Por segurança, aguarde alguns segundos antes de tentar novamente.",
    },
    {
        match: "user not found",
        pt: "Não encontramos uma conta com esse e-mail.",
    },
    {
        match: "new password should be different",
        pt: "A nova senha precisa ser diferente da senha atual.",
    },
    {
        match: "email link is invalid or has expired",
        pt: "O link expirou ou é inválido. Solicite um novo.",
    },
    {
        match: "over_email_send_rate_limit",
        pt: "Muitos e-mails enviados. Aguarde um pouco antes de tentar novamente.",
    },
    {
        match: "authentication required",
        pt: "É preciso estar logado para concluir esta ação.",
    },
];

/**
 * Recebe a mensagem de erro original (geralmente em inglês) e devolve uma
 * versão amigável em português quando reconhecida; caso contrário, devolve a
 * mensagem original.
 */
export function translateAuthError(message: string): string {
    const normalized = message.toLowerCase();
    for (const entry of AUTH_ERROR_TRANSLATIONS) {
        if (normalized.includes(entry.match)) return entry.pt;
    }
    return message;
}
