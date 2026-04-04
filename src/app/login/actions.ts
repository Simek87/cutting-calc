"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password";
    }
    // Re-throw NEXT_REDIRECT so Next.js handles it
    throw error;
  }
}
