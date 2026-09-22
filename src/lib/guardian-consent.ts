// LGPD art. 14 — tratamento de dados de crianças e adolescentes exige
// consentimento específico e em destaque de ao menos um responsável legal.
// Esta plataforma é dirigida a adolescentes: qualquer conta de menor de 18 anos
// precisa desse consentimento antes de acessar o produto.
//
// Escopo desta v1 (decisão declarada, não overclaim): o consentimento é
// capturado no momento do cadastro, com dados do responsável preenchidos pelo
// próprio adolescente — mesma forma que a maioria dos apps de consumo faz
// checkboxes de "meu responsável autoriza". Verificação independente por
// e-mail ao responsável (link de confirmação) fica para quando o dispatcher
// de e-mail existir (Onda 3) — não é fingido aqui como já resolvido.
//
// Histórico de versões da política:
// - 2026.1: termo original (uso educacional, art. 14 LGPD).
// - 2026.2: acrescenta transparência sobre o processamento das mensagens dos
//   recursos de IA por provedores terceiros. Consentimentos 2026.1 já
//   registrados permanecem válidos (o ledger é INSERT-only e o guard aceita
//   qualquer evento registrado); forçar re-consentimento em mudança material
//   de política é decisão futura, declarada aqui, não implementada.
export const GUARDIAN_CONSENT_POLICY_VERSION = "2026.2";

export const MINOR_AGE_THRESHOLD = 18;

/**
 * Idade em anos completos numa data de referência (default: agora).
 * Compara sempre por componentes de calendário UTC — um input type="date"
 * entrega "YYYY-MM-DD" que o construtor Date() interpreta como meia-noite
 * UTC; misturar isso com getters locais (getMonth/getDate) causa erro de
 * um dia em fusos atrás de UTC (ex.: Brasil). UTC nos dois lados evita isso.
 */
export function ageInYears(birthDate: string, referenceDate: Date = new Date()): number {
  const birth = new Date(birthDate);
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = referenceDate.getUTCDate() - birth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

export function isMinor(birthDate: string, referenceDate: Date = new Date()): boolean {
  return ageInYears(birthDate, referenceDate) < MINOR_AGE_THRESHOLD;
}

export function isValidPastDate(birthDate: string, referenceDate: Date = new Date()): boolean {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  return birth.getTime() < referenceDate.getTime() && ageInYears(birthDate, referenceDate) < 120;
}

export const GUARDIAN_CONSENT_STATEMENT =
  "Na qualidade de responsável legal, autorizo o tratamento dos dados pessoais " +
  "do(a) adolescente para fins de uso educacional da plataforma Ciência do " +
  "Bem-Estar (Instituto Felicidade Para Todos), nos termos do art. 14 da Lei " +
  "Geral de Proteção de Dados (Lei 13.709/2018). Estou ciente de que as " +
  "mensagens enviadas aos recursos de tutoria por inteligência artificial são " +
  "processadas por provedores de IA contratados pela plataforma, com a " +
  "finalidade de gerar as respostas educacionais.";

// --- Gate de rota (fail-closed) --------------------------------------------
// Decisão pura e testável usada por <RequireGuardianConsent>. Regra central de
// segurança juvenil: acesso privado só é liberado ("clear") diante de uma
// resposta EXPLÍCITA, bem-formada e confiável da RPC. Qualquer incerteza —
// erro/timeout/sessão inválida, payload indeterminado, ou idade que não pode
// ser estabelecida (data de nascimento ausente) — falha FECHADA. Nunca
// reutilizar "clear" como default em caminho de erro.

export type ConsentGateDecision = "clear" | "blocked" | "needs_birth_date" | "error_locked";

export interface GuardianConsentPayload {
  requires_consent?: boolean;
  granted?: boolean;
  policy_version?: string | null;
  reason?: string | null;
}

export interface ConsentGateInput {
  /** A RPC retornou erro (inclui sessão inválida/expirada → 28000). */
  error: boolean;
  /** Payload de dados da RPC (pode vir null/indeterminado). */
  payload: unknown;
  /** Versão de política vigente para comparar re-consentimento. */
  currentPolicyVersion: string;
}

export function decideGuardianConsentGate({
  error,
  payload,
  currentPolicyVersion,
}: ConsentGateInput): ConsentGateDecision {
  // 1. Erro da RPC / sessão inválida / promessa rejeitada / timeout: não dá
  //    para confiar na resposta → bloqueio de verificação.
  if (error) return "error_locked";

  // 2. Payload ausente ou malformado: decisão indeterminada → fail-closed.
  if (payload == null || typeof payload !== "object") return "error_locked";
  const p = payload as GuardianConsentPayload;
  if (typeof p.requires_consent !== "boolean") return "error_locked";

  // 3. Idade desconhecida (data de nascimento ausente): caso identificável e
  //    resolvível. Não é possível estabelecer se é menor ou adulto, então não
  //    liberamos acesso — mas, diferente de um erro/timeout, há um caminho de
  //    ação: pedir a data (rota /completar-cadastro). Fail-closed com saída.
  if (p.reason === "unknown_birth_date") return "needs_birth_date";

  // 4. Consentimento não exigido (adulto com data de nascimento conhecida).
  if (!p.requires_consent) return "clear";

  // 5. Consentimento exigido: precisa estar concedido E sob a política vigente.
  const granted = p.granted === true;
  const outdated =
    granted && p.policy_version != null && p.policy_version !== currentPolicyVersion;
  if (!granted || outdated) return "blocked";

  return "clear";
}
