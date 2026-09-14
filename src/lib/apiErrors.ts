import { NextResponse } from 'next/server';

/**
 * Standardized API Error Response
 * In production: Hides internal stack traces, DB errors, and driver exceptions from clients.
 * In development: Provides safe debug information for developers.
 */
export function safeErrorResponse(
  userFriendlyMessage: string,
  status: number = 500,
  internalError?: unknown
): NextResponse {
  // Always log internal error with stack trace to server logs
  if (internalError) {
    console.error(`[API Error ${status}] ${userFriendlyMessage}:`, internalError);
  } else {
    console.error(`[API Error ${status}] ${userFriendlyMessage}`);
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    return NextResponse.json(
      { error: userFriendlyMessage },
      { status }
    );
  }

  const debugMessage =
    internalError instanceof Error
      ? internalError.message
      : typeof internalError === 'string'
      ? internalError
      : undefined;

  return NextResponse.json(
    {
      error: userFriendlyMessage,
      ...(debugMessage ? { debug: debugMessage } : {}),
    },
    { status }
  );
}
