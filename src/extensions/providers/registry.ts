#!/usr/bin/env node

/**
 * Custom Provider Registry
 *
 * Khai báo các custom providers mà project này hỗ trợ.
 * Script generate sẽ duyệt qua registry này để fetch models từ models.dev.
 */

import type { ProviderModelConfig } from "@mariozechner/pi-coding-agent";

/** Config cho một custom provider */
export interface CustomProviderDefinition {
  /** Key trong models.dev API (ví dụ: "kilo") */
  sourceKey: string;
  /** Tên provider trong hệ thống pi (ví dụ: "kilo") */
  providerName: string;
  /** API type cho models (ví dụ: "openai-completions") */
  api: string;
  /** Base URL mặc định */
  baseUrl: string;
  /** API key environment variable name */
  apiKeyEnv: string;
}

/** Registry - lưu trữ tất cả custom providers */
const KNOWN_CUSTOM_PROVIDERS: CustomProviderDefinition[] = [];

/**
 * Đăng ký một custom provider.
 * Gọi trong file registry hoặc extension init.
 */
export function registerCustomProvider(config: CustomProviderDefinition): void {
  KNOWN_CUSTOM_PROVIDERS.push(config);
}

/**
 * Lấy tất cả custom providers đã đăng ký.
 */
export function getKnownCustomProviders(): CustomProviderDefinition[] {
  return [...KNOWN_CUSTOM_PROVIDERS];
}

/**
 * Làm sạch registry (cho testing).
 */
export function clearCustomProviders(): void {
  KNOWN_CUSTOM_PROVIDERS.length = 0;
}

// ============================================================================
// KHAI BÁO CUSTOM PROVIDERS
// Thêm provider mới vào đây, script generate sẽ tự động fetch
// ============================================================================

registerCustomProvider({
  sourceKey: "kilo",
  providerName: "kilo",
  api: "openai-completions",
  baseUrl: "https://api.kilo.ai/v1",
  apiKeyEnv: "KILO_API_KEY",
});

// Example: Thêm provider mới
// registerCustomProvider({
//   sourceKey: "moonshot",
//   providerName: "moonshot",
//   api: "openai-completions",
//   baseUrl: "https://api.moonshot.cn/v1",
//   apiKeyEnv: "MOONSHOT_API_KEY",
// });
