'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserPermissions() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('No autorizado');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }

  return usuario;
}

export async function getConfiguracionEmpresa() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("configuracion_empresa")
    .select("*")
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

export async function updateConfiguracionEmpresa(config: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para actualizar la configuración de la empresa');
  }
  
  const { data, error } = await supabase
    .from("configuracion_empresa")
    .update(config)
    .eq("id", 1)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function uploadLogoEmpresa(file: File) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para subir el logo de la empresa');
  }
  
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(`${Date.now()}-${file.name}`, file);
    
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(data.path);
    
  return urlData.publicUrl;
} 