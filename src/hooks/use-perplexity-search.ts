import { useQuery } from '@tanstack/react-query';
import { callMCPTool } from '@/sdk/core/mcp-client';

// MCP Response wrapper interface - MANDATORY
export interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string; // JSON string containing actual tool data
  }>;
}

/**
 * Input parameters for Perplexity AI search tool
 * Based on PERPLEXITYAI_PERPLEXITY_AI_SEARCH schema
 */
export interface PerplexitySearchInput {
  /** The system's content for specifying instructions */
  systemContent: string;
  /** The user's content for asking questions or providing input */
  userContent: string;
  /** Multiplicative penalty for new tokens based on their frequency (mutually exclusive with presence_penalty) */
  frequency_penalty?: number;
  /** Maximum number of tokens to generate */
  max_tokens?: number;
  /** Model name: sonar, sonar-reasoning-pro, sonar-reasoning, or sonar-pro */
  model?: 'sonar' | 'sonar-reasoning-pro' | 'sonar-reasoning' | 'sonar-pro';
  /** Penalty for new tokens based on current presence (-2.0 to 2.0, mutually exclusive with frequency_penalty) */
  presence_penalty?: number;
  /** Whether to include citations in the response (closed beta feature) */
  return_citations?: boolean;
  /** Whether to include images in the response (closed beta feature) */
  return_images?: boolean;
  /** Whether to stream the response incrementally using server-sent events */
  stream?: boolean;
  /** Controls generation randomness (0 = deterministic, approaching 2 = more random) */
  temperature?: number;
  /** Limits number of high-probability tokens to consider (0 to disable, max 2048) */
  top_k?: number;
  /** Nucleus sampling threshold (0.0 to 1.0) */
  top_p?: number;
}

/**
 * Output data structure from Perplexity AI search tool
 */
export interface PerplexitySearchOutput {
  data: {
    /** Response object containing completions from the API */
    response: Record<string, unknown>;
  };
  /** Error message if any occurred during execution */
  error: string | null;
  /** Whether the action execution was successful */
  successful: boolean;
}

/**
 * React Query hook for Perplexity AI search
 *
 * Executes AI-powered search queries using Perplexity AI models with customizable
 * parameters for generation control, penalties, and response format.
 *
 * @param params - Search parameters including system/user content and optional generation controls
 * @param enabled - Whether the query should execute (default: true)
 * @returns TanStack Query result with Perplexity AI search response
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePerplexitySearch({
 *   systemContent: "You are a brand analysis expert.",
 *   userContent: "Analyze brand awareness for Nike in the Russian market",
 *   model: "sonar-pro",
 *   temperature: 0.7
 * });
 * ```
 */
export function usePerplexitySearch(
  params?: PerplexitySearchInput,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['perplexity-search', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('Parameters are required for Perplexity AI search');
      }

      // CRITICAL: Use MCPToolResponse and parse JSON response
      const mcpResponse = await callMCPTool<MCPToolResponse, PerplexitySearchInput>(
        '6875e6198345ff1a8579cd8a',
        'PERPLEXITYAI_PERPLEXITY_AI_SEARCH',
        params
      );

      if (!mcpResponse.content?.[0]?.text) {
        throw new Error('Invalid MCP response format: missing content[0].text');
      }

      try {
        const toolData: PerplexitySearchOutput = JSON.parse(mcpResponse.content[0].text);
        return toolData;
      } catch (parseError) {
        throw new Error(`Failed to parse MCP response JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    },
    enabled: enabled && !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
