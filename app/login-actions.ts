"use server"

import { signIn, signOut } from "@/auth"

export async function entrerGoogle() {
  await signIn("google", { redirectTo: "/accueil" })
}

export async function entrerEssai() {
  await signIn("essai", { redirectTo: "/accueil" })
}

export async function quitter() {
  await signOut({ redirectTo: "/" })
}
