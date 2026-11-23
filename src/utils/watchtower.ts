import type { DecryptedVaultItem } from '../types/vault';
import { evaluatePasswordStrength } from './crypto';

export interface SecurityIssue {
  id: string;
  itemId: string;
  itemTitle: string;
  username: string;
  domain?: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'weak' | 'reused' | 'missing_2fa' | 'unsecured_http' | 'old';
  message: string;
}

export interface WatchtowerReport {
  overallScore: number;
  totalLogins: number;
  weakCount: number;
  reusedCount: number;
  missing2faCount: number;
  unsecuredHttpCount: number;
  oldPasswordCount: number;
  issues: SecurityIssue[];
}

export function analyzeVaultSecurity(items: DecryptedVaultItem[]): WatchtowerReport {
  const activeLogins = items.filter((i) => !i.deletedAt && i.type === 'login' && i.data.login);
  const issues: SecurityIssue[] = [];

  const passwordMap = new Map<string, DecryptedVaultItem[]>();
  for (const item of activeLogins) {
    const pwd = item.data.login?.password || '';
    if (!pwd) continue;
    const list = passwordMap.get(pwd) || [];
    list.push(item);
    passwordMap.set(pwd, list);
  }

  let weakCount = 0;
  let reusedCount = 0;
  let missing2faCount = 0;
  let unsecuredHttpCount = 0;
  let oldPasswordCount = 0;

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  for (const item of activeLogins) {
    const login = item.data.login!;
    const pwd = login.password || '';
    const strength = evaluatePasswordStrength(pwd);

    if (strength.score <= 2) {
      weakCount++;
      issues.push({
        id: `weak_${item.id}`,
        itemId: item.id,
        itemTitle: item.title,
        username: login.username,
        domain: item.domain,
        severity: strength.score <= 1 ? 'critical' : 'warning',
        category: 'weak',
        message: `Kata laluan ${strength.label.toLowerCase()} (${strength.entropyBits} bit entropi). Tukar kepada 16+ aksara rawak.`,
      });
    }

    const samePwdList = passwordMap.get(pwd) || [];
    if (pwd && samePwdList.length > 1) {
      reusedCount++;
      issues.push({
        id: `reused_${item.id}`,
        itemId: item.id,
        itemTitle: item.title,
        username: login.username,
        domain: item.domain,
        severity: 'critical',
        category: 'reused',
        message: `Digunakan semula pada ${samePwdList.length} akaun berbeza. Risiko serangan credential stuffing.`,
      });
    }

    if (!login.totpSecret?.trim()) {
      missing2faCount++;
      issues.push({
        id: `2fa_${item.id}`,
        itemId: item.id,
        itemTitle: item.title,
        username: login.username,
        domain: item.domain,
        severity: 'info',
        category: 'missing_2fa',
        message: 'Tiada kunci TOTP 2FA disimpan. Aktifkan pengesahan dua faktor jika disokong.',
      });
    }

    const hasHttp = (login.urls || []).some((u) => u.trim().toLowerCase().startsWith('http://'));
    if (hasHttp) {
      unsecuredHttpCount++;
      issues.push({
        id: `http_${item.id}`,
        itemId: item.id,
        itemTitle: item.title,
        username: login.username,
        domain: item.domain,
        severity: 'warning',
        category: 'unsecured_http',
        message: 'URL menggunakan protokol HTTP tanpa penyulitan TLS (HTTPS).',
      });
    }

    const updatedMs = new Date(item.updatedAt).getTime();
    if (!Number.isNaN(updatedMs) && now - updatedMs > ninetyDaysMs) {
      oldPasswordCount++;
      issues.push({
        id: `old_${item.id}`,
        itemId: item.id,
        itemTitle: item.title,
        username: login.username,
        domain: item.domain,
        severity: 'info',
        category: 'old',
        message: 'Kata laluan belum dikemaskini melebihi 90 hari.',
      });
    }
  }

  let overallScore = 100;
  if (activeLogins.length > 0) {
    const penalty =
      (weakCount / activeLogins.length) * 45 +
      (reusedCount / activeLogins.length) * 35 +
      (missing2faCount / activeLogins.length) * 12 +
      (unsecuredHttpCount / activeLogins.length) * 8;
    overallScore = Math.max(8, Math.min(100, Math.round(100 - penalty)));
  }

  // Sort critical -> warning -> info
  const order = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    overallScore,
    totalLogins: activeLogins.length,
    weakCount,
    reusedCount,
    missing2faCount,
    unsecuredHttpCount,
    oldPasswordCount,
    issues,
  };
}
