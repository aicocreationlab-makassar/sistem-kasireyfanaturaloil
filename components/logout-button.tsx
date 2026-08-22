"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  return <button className="btn btn-secondary btn-wide" onClick={async () => {
    await createClient().auth.signOut(); window.location.assign("/login");
  }}><LogOut size={18} /> Keluar dari akun</button>;
}
