declare namespace App {
  interface Locals {
    token: string | null;
    session: import('./lib/auth/decode').DecodedSession | null;
  }
}
