import { supabase } from "./supabase-client.js";

// Verifica sesión + que el usuario exista en public.staff.
// Si falla cualquiera de las dos, expulsa a login.html.
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "./login.html";
    return null;
  }

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, nombre, rol, activo")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !staff || !staff.activo) {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
    return null;
  }

  return { session, staff };
}

export function wireLogout(buttonEl) {
  buttonEl?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
  });
}
