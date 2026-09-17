"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usuarioToEmail, toSupabasePassword } from "@/lib/auth/credentials";

export async function login(formData: FormData) {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!usuario || !password) {
    return { error: "Ingresá usuario y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usuarioToEmail(usuario),
    password: toSupabasePassword(password),
  });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
